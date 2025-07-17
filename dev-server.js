const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Add JSON parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Mock API responses for development
app.get('/api/auth/me', (req, res) => {
  res.status(401).json({ message: "Please connect to Spotify to use the playlist generator" });
});

app.get('/api/auth/spotify', (req, res) => {
  res.json({ message: "Spotify authentication - implementation needed" });
});

app.get('/api/playlists', (req, res) => {
  res.json([]);
});

app.get('/api/recent-prompts', (req, res) => {
  res.json([]);
});

app.get('/api/spotify/playlists', (req, res) => {
  res.json([]);
});

app.post('/api/playlists/generate', (req, res) => {
  res.status(401).json({ message: "Please authenticate with Spotify first" });
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, 'client')));

// Serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎵 Promptify development server running on port ${PORT}`);
  console.log(`📡 API endpoints: http://localhost:${PORT}/api/`);
  console.log(`🔗 Application: http://localhost:${PORT}`);
  console.log(`✅ Playlist generator ready for development!`);
});