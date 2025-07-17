const express = require('express');
const { createServer: createViteServer } = require('vite');
const path = require('path');
const fs = require('fs');

async function createServer() {
  const app = express();
  
  // Add body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Session handling - simple in-memory store
  const sessions = new Map();
  
  // Simple session middleware
  app.use((req, res, next) => {
    const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
    if (sessionId && sessions.has(sessionId)) {
      req.session = sessions.get(sessionId);
    } else {
      req.session = null;
    }
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
    res.json({ id: req.session.userId, displayName: req.session.displayName });
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
    const { code } = req.query;
    if (!code) {
      return res.redirect('/?auth=error');
    }
    
    // For now, create a mock session
    const sessionId = Math.random().toString(36).substring(7);
    sessions.set(sessionId, {
      userId: 1,
      displayName: 'Demo User',
      createdAt: Date.now()
    });
    
    res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 86400000 });
    res.redirect('/?auth=success');
  });
  
  app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.clearCookie('sessionId');
    res.json({ message: "Logged out successfully" });
  });
  
  app.get('/api/playlists', (req, res) => {
    if (!req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json([]);
  });
  
  app.get('/api/recent-prompts', (req, res) => {
    if (!req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json([]);
  });
  
  app.get('/api/spotify/playlists', (req, res) => {
    if (!req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json([]);
  });
  
  app.post('/api/playlists/generate', async (req, res) => {
    if (!req.session) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }
    
    // Mock response for now
    res.json({
      id: 1,
      name: "AI Generated Playlist",
      description: "Generated from: " + prompt,
      prompt: prompt,
      trackCount: 0,
      tracks: [],
      createdAt: new Date().toISOString()
    });
  });
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: path.join(__dirname, '..', 'client'),
  });
  
  // Use vite's connect instance as middleware
  app.use(vite.middlewares);
  
  const server = app.listen(5000, '0.0.0.0', () => {
    console.log('🎵 Promptify development server running on port 5000');
    console.log('📡 API endpoints: http://localhost:5000/api/');
    console.log('🔗 Application: http://localhost:5000');
    console.log('✅ React app served with Vite HMR');
  });
}

createServer().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});