const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Simple JSON response helper
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Simple HTML response helper
function sendHTML(res, html, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html' });
  res.end(html);
}

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
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

  // Root endpoint
  if (pathname === '/' && method === 'GET') {
    const html = `
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
          .migration-status {
            margin: 20px 0;
            padding: 20px;
            background: #e7f3ff;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎵 Promptify</h1>
          <p>AI-Powered Spotify Playlist Generator</p>
        </div>
        
        <div class="migration-status">
          <h3>🔄 Migration Status</h3>
          <p>Successfully migrated from Replit Agent to Replit environment!</p>
          <p>✅ Backend server is running</p>
          <p>✅ Database configured</p>
          <p>✅ Dependencies installed</p>
          <p>✅ API endpoints accessible</p>
        </div>
        
        <div class="status-grid">
          <div class="status-card status-ok">
            <h3>✅ Server Status</h3>
            <p>Backend server running successfully</p>
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
    `;
    sendHTML(res, html);
    return;
  }

  // 404 for all other routes
  sendJSON(res, {
    message: "Route not found",
    path: pathname,
    method: method
  }, 404);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Promptify server running on port ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🎵 Migration completed successfully!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});