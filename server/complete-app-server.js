const http = require('http');
const url = require('url');
const fs = require('fs').promises;
const path = require('path');
const { storage } = require('./storage');
const { spotifyService } = require('./services/spotify');
const { generatePlaylistFromPrompt, get_playlist_criteria_from_prompt } = require('./services/openai');
const crypto = require('crypto');

// Simple session store
const sessions = new Map();

// Create session
function createSession(userId) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
}

// Get session
function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  // Check if session is expired (24 hours)
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session;
}

// Parse cookies
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = value;
  });
  
  return cookies;
}

// Parse JSON body
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Send JSON response
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Send HTML response
function sendHTML(res, html, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html' });
  res.end(html);
}

// Serve static files
async function serveStaticFile(res, filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ts': 'application/typescript',
      '.tsx': 'application/typescript',
      '.jsx': 'application/javascript'
    };
    
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end('File not found');
  }
}

// Main server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const query = parsedUrl.query;
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.sessionId;
  const session = sessionId ? getSession(sessionId) : null;
  
  console.log(`${method} ${pathname} - User: ${session?.userId || 'anonymous'}`);

  // Handle OPTIONS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // API Routes
  if (pathname.startsWith('/api/')) {
    
    // Health check
    if (pathname === '/api/health' && method === 'GET') {
      sendJSON(res, {
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
      return;
    }

    // Auth endpoints
    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!session) {
        sendJSON(res, { message: "Not authenticated" }, 401);
        return;
      }
      
      try {
        const user = await storage.getUser(session.userId);
        if (!user) {
          sendJSON(res, { message: "User not found" }, 404);
          return;
        }
        
        sendJSON(res, {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          imageUrl: user.imageUrl,
        });
      } catch (error) {
        sendJSON(res, { message: "Failed to get user profile" }, 500);
      }
      return;
    }

    if (pathname === '/api/auth/spotify' && method === 'GET') {
      try {
        const authUrl = spotifyService.getAuthUrl();
        res.writeHead(302, { 'Location': authUrl });
        res.end();
      } catch (error) {
        sendJSON(res, { message: "Failed to initiate Spotify authentication" }, 500);
      }
      return;
    }

    if (pathname === '/api/auth/spotify/callback' && method === 'GET') {
      try {
        const { code } = query;
        if (!code) {
          res.writeHead(302, { 'Location': '/?auth=error' });
          res.end();
          return;
        }

        const tokens = await spotifyService.exchangeCodeForTokens(code);
        const userProfile = await spotifyService.getUserProfile(tokens.access_token);

        const userData = {
          spotifyId: userProfile.id,
          displayName: userProfile.display_name,
          email: userProfile.email,
          imageUrl: userProfile.images[0]?.url || null,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        };

        const user = await storage.createOrUpdateUser(userData);
        const newSessionId = createSession(user.id);
        
        res.writeHead(302, { 
          'Location': '/?auth=success',
          'Set-Cookie': `sessionId=${newSessionId}; HttpOnly; Path=/; Max-Age=86400`
        });
        res.end();
      } catch (error) {
        console.error("Spotify auth error:", error);
        res.writeHead(302, { 'Location': '/?auth=error' });
        res.end();
      }
      return;
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      if (sessionId) {
        sessions.delete(sessionId);
      }
      res.writeHead(200, {
        'Set-Cookie': 'sessionId=; HttpOnly; Path=/; Max-Age=0'
      });
      sendJSON(res, { message: "Logged out successfully" });
      return;
    }

    // Playlist endpoints
    if (pathname === '/api/playlists' && method === 'GET') {
      if (!session) {
        sendJSON(res, { message: "Not authenticated" }, 401);
        return;
      }
      
      try {
        const playlists = await storage.getUserPlaylists(session.userId);
        sendJSON(res, playlists);
      } catch (error) {
        sendJSON(res, { message: "Failed to get playlists" }, 500);
      }
      return;
    }

    if (pathname === '/api/playlists/generate' && method === 'POST') {
      if (!session) {
        sendJSON(res, { message: "Not authenticated" }, 401);
        return;
      }
      
      try {
        const body = await parseJsonBody(req);
        const { prompt } = body;
        
        if (!prompt) {
          sendJSON(res, { message: "Prompt is required" }, 400);
          return;
        }
        
        const user = await storage.getUser(session.userId);
        if (!user) {
          sendJSON(res, { message: "User not found" }, 404);
          return;
        }

        const userPrefs = await storage.getUserPreferences(user.id);

        // Generate playlist metadata with OpenAI
        const playlistData = await generatePlaylistFromPrompt({
          prompt,
          userId: user.id,
          preferences: userPrefs || undefined,
        });
        
        const criteria = await get_playlist_criteria_from_prompt(prompt);

        // Search for tracks using Spotify API
        const tracks = [];
        for (const query of playlistData.searchQueries) {
          try {
            const searchResults = await spotifyService.searchTracks(user.accessToken, query, 3);
            tracks.push(...searchResults);
          } catch (error) {
            console.error(`Search failed for query: ${query}`, error);
          }
        }

        // Remove duplicates
        const uniqueTracks = tracks.filter((t, i, self) => i === self.findIndex(x => x.id === t.id));
        const finalTracks = uniqueTracks.slice(0, 25);

        // Create playlist in database
        const playlist = await storage.createPlaylist({
          userId: user.id,
          name: playlistData.name,
          description: playlistData.description,
          prompt,
          trackCount: finalTracks.length,
          isPublic: false,
        });

        // Add tracks to database
        for (let i = 0; i < finalTracks.length; i++) {
          const track = finalTracks[i];
          await storage.addTrackToPlaylist({
            playlistId: playlist.id,
            spotifyId: track.id,
            name: track.name,
            artist: track.artists[0]?.name || "Unknown Artist",
            album: track.album.name,
            duration: track.duration_ms,
            imageUrl: track.album.images[0]?.url || null,
            previewUrl: track.preview_url,
            position: i,
          });
        }

        // Save recent prompt
        await storage.addRecentPrompt({
          userId: user.id,
          prompt,
          playlistId: playlist.id,
        });

        const fullPlaylist = await storage.getPlaylistWithTracks(playlist.id);
        sendJSON(res, fullPlaylist);
      } catch (error) {
        console.error("Generate playlist error:", error);
        sendJSON(res, { message: "Failed to generate playlist" }, 500);
      }
      return;
    }

    if (pathname === '/api/recent-prompts' && method === 'GET') {
      if (!session) {
        sendJSON(res, { message: "Not authenticated" }, 401);
        return;
      }
      
      try {
        const prompts = await storage.getRecentPrompts(session.userId, 10);
        sendJSON(res, prompts);
      } catch (error) {
        sendJSON(res, { message: "Failed to get recent prompts" }, 500);
      }
      return;
    }

    if (pathname === '/api/spotify/playlists' && method === 'GET') {
      if (!session) {
        sendJSON(res, { message: "Not authenticated" }, 401);
        return;
      }
      
      try {
        const user = await storage.getUser(session.userId);
        if (!user) {
          sendJSON(res, { message: "User not found" }, 404);
          return;
        }
        
        const playlists = await spotifyService.getUserPlaylists(user.accessToken);
        sendJSON(res, playlists);
      } catch (error) {
        sendJSON(res, { message: "Failed to get Spotify playlists" }, 500);
      }
      return;
    }

    // Default API response
    sendJSON(res, {
      message: "API endpoint not found",
      path: pathname,
      method: method
    }, 404);
    return;
  }

  // Serve static files
  if (pathname.startsWith('/src/') || pathname.startsWith('/node_modules/')) {
    const filePath = path.join(__dirname, '..', pathname);
    await serveStaticFile(res, filePath);
    return;
  }

  // Serve the React app
  const clientPath = path.join(__dirname, '..', 'client');
  const indexPath = path.join(clientPath, 'index.html');
  
  try {
    const indexContent = await fs.readFile(indexPath, 'utf8');
    
    // Inject session state into the HTML
    const sessionScript = session ? `
      <script>
        window.__SESSION__ = ${JSON.stringify({ userId: session.userId })};
      </script>
    ` : '';
    
    const modifiedContent = indexContent.replace('</head>', `${sessionScript}</head>`);
    sendHTML(res, modifiedContent);
  } catch (error) {
    // Fallback if client files not found
    sendHTML(res, `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Promptify - AI Playlist Generator</title>
        <style>
          body { font-family: sans-serif; background: linear-gradient(135deg, #1db954 0%, #191414 100%); color: white; padding: 40px; text-align: center; min-height: 100vh; }
          .container { max-width: 600px; margin: 0 auto; }
          .error { background: rgba(255,0,0,0.2); padding: 20px; border-radius: 10px; margin: 20px 0; }
          .btn { background: #1db954; color: white; border: none; padding: 15px 30px; border-radius: 25px; font-size: 1rem; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎵 Promptify</h1>
          <div class="error">
            <h2>Application files not found</h2>
            <p>The React application needs to be built first.</p>
            <p>Please ensure the client files are in the correct location.</p>
          </div>
          <a href="/api/health" class="btn">Check API Status</a>
        </div>
      </body>
      </html>
    `);
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log('🎵 Promptify complete application server running on port ' + PORT);
  console.log('📡 API endpoints: http://localhost:' + PORT + '/api/');
  console.log('🔗 Application: http://localhost:' + PORT);
  console.log('✅ Features: Auth, Playlists, AI Generation, Spotify Integration');
  console.log('📊 Session management: In-memory sessions active');
});