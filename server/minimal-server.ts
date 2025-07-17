import express from "express";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Test route to verify server is working
app.get("/api/health", (req, res) => {
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

// Basic HTML response for root
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Promptify - AI Playlist Generator</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px auto; 
          max-width: 800px; 
          line-height: 1.6; 
          color: #333; 
        }
        .header { 
          text-align: center; 
          margin-bottom: 40px; 
        }
        .status-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 20px; 
          margin: 20px 0; 
        }
        .status-card { 
          padding: 20px; 
          border-radius: 8px; 
          border: 1px solid #ddd; 
        }
        .status-ok { background-color: #d4edda; border-color: #c3e6cb; }
        .status-error { background-color: #f8d7da; border-color: #f5c6cb; }
        .api-test { 
          margin: 20px 0; 
          padding: 15px; 
          background: #f8f9fa; 
          border-radius: 5px; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎵 Promptify</h1>
        <p>AI-Powered Spotify Playlist Generator</p>
      </div>
      
      <div class="status-grid">
        <div class="status-card status-ok">
          <h3>✅ Server Status</h3>
          <p>Backend server is running successfully</p>
        </div>
        
        <div class="status-card ${process.env.DATABASE_URL ? 'status-ok' : 'status-error'}">
          <h3>${process.env.DATABASE_URL ? '✅' : '❌'} Database</h3>
          <p>${process.env.DATABASE_URL ? 'Connected to PostgreSQL' : 'Database not configured'}</p>
        </div>
        
        <div class="status-card ${process.env.OPENAI_API_KEY ? 'status-ok' : 'status-error'}">
          <h3>${process.env.OPENAI_API_KEY ? '✅' : '❌'} OpenAI API</h3>
          <p>${process.env.OPENAI_API_KEY ? 'AI playlist generation ready' : 'OpenAI API key not configured'}</p>
        </div>
        
        <div class="status-card ${process.env.SPOTIFY_CLIENT_ID ? 'status-ok' : 'status-error'}">
          <h3>${process.env.SPOTIFY_CLIENT_ID ? '✅' : '❌'} Spotify API</h3>
          <p>${process.env.SPOTIFY_CLIENT_ID ? 'Spotify integration ready' : 'Spotify credentials not configured'}</p>
        </div>
      </div>
      
      <div class="api-test">
        <h3>API Status</h3>
        <button onclick="testAPI()">Test API Connection</button>
        <div id="api-result"></div>
      </div>
      
      <script>
        async function testAPI() {
          const result = document.getElementById('api-result');
          try {
            const response = await fetch('/api/health');
            const data = await response.json();
            result.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            result.innerHTML = '<p style="color: red;">Error: ' + error.message + '</p>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Catch-all for other routes
app.use("*", (req, res) => {
  res.status(404).json({ 
    message: "Route not found",
    path: req.originalUrl,
    method: req.method
  });
});

const server = createServer(app);
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});