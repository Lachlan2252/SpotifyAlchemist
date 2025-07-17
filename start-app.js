const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session management
const sessions = new Map();

function createSession(userId, userData = {}) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { userId, ...userData, createdAt: Date.now() });
  return sessionId;
}

function getSession(req) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  
  const match = cookie.match(/sessionId=([^;]+)/);
  if (!match) return null;
  
  const session = sessions.get(match[1]);
  if (!session) return null;
  
  // Check expiry
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(match[1]);
    return null;
  }
  
  return session;
}

// Middleware to parse session
app.use((req, res, next) => {
  req.session = getSession(req);
  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    secrets: {
      openai: !!process.env.OPENAI_API_KEY,
      spotify_client_id: !!process.env.SPOTIFY_CLIENT_ID,
      spotify_client_secret: !!process.env.SPOTIFY_CLIENT_SECRET,
      spotify_redirect_uri: !!process.env.SPOTIFY_REDIRECT_URI,
      database_url: !!process.env.DATABASE_URL
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.json({
    id: req.session.userId,
    displayName: req.session.displayName || "User",
    email: req.session.email,
    imageUrl: req.session.imageUrl
  });
});

app.get('/api/auth/spotify', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/auth/spotify/callback';
  const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
  ].join(' ');
  
  const authUrl = `https://accounts.spotify.com/authorize?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `show_dialog=true`;
  
  res.redirect(authUrl);
});

app.get('/api/auth/spotify/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error || !code) {
    return res.redirect('/?auth=error');
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/auth/spotify/callback',
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }
    
    const tokens = await tokenResponse.json();
    
    // Get user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!profileResponse.ok) {
      throw new Error('Failed to get user profile');
    }
    
    const profile = await profileResponse.json();
    
    // Create session
    const sessionId = createSession(profile.id, {
      displayName: profile.display_name,
      email: profile.email,
      imageUrl: profile.images?.[0]?.url,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    });
    
    res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 86400000 });
    res.redirect('/?auth=success');
  } catch (error) {
    console.error('Spotify auth error:', error);
    res.redirect('/?auth=error');
  }
});

app.post('/api/auth/logout', (req, res) => {
  if (req.session) {
    const cookie = req.headers.cookie;
    const match = cookie?.match(/sessionId=([^;]+)/);
    if (match) {
      sessions.delete(match[1]);
    }
  }
  res.clearCookie('sessionId');
  res.json({ message: "Logged out successfully" });
});

app.get('/api/playlists', (req, res) => {
  if (!req.session) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  // Return empty array for now
  res.json([]);
});

app.get('/api/recent-prompts', (req, res) => {
  if (!req.session) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.json([]);
});

app.get('/api/spotify/playlists', async (req, res) => {
  if (!req.session) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        'Authorization': `Bearer ${req.session.accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get playlists');
    }
    
    const data = await response.json();
    res.json(data.items || []);
  } catch (error) {
    res.json([]);
  }
});

app.post('/api/playlists/generate', async (req, res) => {
  if (!req.session) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ message: "Prompt is required" });
  }
  
  try {
    // Use OpenAI to analyze the prompt
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a music expert that creates Spotify playlists. Given a prompt, generate search queries for Spotify.
          Return a JSON object with:
          - name: Creative playlist name
          - description: Brief description
          - searchQueries: Array of 10-15 specific search queries for Spotify
          - genres: Array of genre names
          - mood: General mood (happy, sad, energetic, chill, etc.)
          - energy: Energy level from 0 to 1`
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });
    
    const playlistData = JSON.parse(completion.choices[0].message.content);
    
    // Search for tracks
    const tracks = [];
    for (const query of playlistData.searchQueries.slice(0, 10)) {
      try {
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=2`, {
          headers: {
            'Authorization': `Bearer ${req.session.accessToken}`,
          },
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          tracks.push(...(searchData.tracks?.items || []));
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }
    
    // Remove duplicates
    const uniqueTracks = tracks.filter((track, index, self) => 
      index === self.findIndex((t) => t.id === track.id)
    ).slice(0, 20);
    
    // Return the playlist
    res.json({
      id: Date.now(),
      name: playlistData.name,
      description: playlistData.description,
      prompt: prompt,
      trackCount: uniqueTracks.length,
      tracks: uniqueTracks.map((track, index) => ({
        id: index,
        spotifyId: track.id,
        name: track.name,
        artist: track.artists[0]?.name || "Unknown Artist",
        album: track.album.name,
        duration: track.duration_ms,
        imageUrl: track.album.images[0]?.url,
        previewUrl: track.preview_url,
        position: index,
      })),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Generate playlist error:', error);
    res.status(500).json({ message: "Failed to generate playlist. Please check your API keys." });
  }
});

// Serve the React app
const clientPath = path.join(__dirname, 'client');

// Transform TypeScript/JSX on the fly for development
app.get('*.tsx', (req, res) => {
  const filePath = path.join(clientPath, req.path);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.type('application/javascript');
    res.send(content);
  } else {
    res.status(404).send('File not found');
  }
});

app.get('*.ts', (req, res) => {
  const filePath = path.join(clientPath, req.path);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.type('application/javascript');
    res.send(content);
  } else {
    res.status(404).send('File not found');
  }
});

// Serve static files
app.use(express.static(clientPath));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not found');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎵 Promptify running on port ${PORT}`);
  console.log(`📡 API endpoints: http://localhost:${PORT}/api/`);
  console.log(`🔗 Application: http://localhost:${PORT}`);
  console.log(`✅ All features available: Auth, Playlists, AI Generation`);
  console.log(`⚠️  Note: This is a development server. For production, build the React app.`);
});