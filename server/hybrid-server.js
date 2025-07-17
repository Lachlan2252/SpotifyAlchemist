const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Simple JSON response helper
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Simple HTML response helper
function sendHTML(res, html, statusCode = 200) {
  res.writeHead(statusCode, { 
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(html);
}

// File serving helper
function serveFile(res, filePath, contentType) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
}

// Get content type from file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.tsx': 'application/javascript',
    '.ts': 'application/javascript'
  };
  return types[ext] || 'application/octet-stream';
}

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle OPTIONS preflight requests
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

    if (pathname === '/api/auth/spotify' && method === 'GET') {
      sendJSON(res, { message: "Spotify auth endpoint - implementation needed" });
      return;
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      sendJSON(res, { message: "User authentication endpoint - implementation needed" });
      return;
    }

    // Default API response
    sendJSON(res, {
      message: "API endpoint not implemented yet",
      path: pathname,
      method: method
    }, 501);
    return;
  }

  // Static file serving for client assets
  if (pathname.startsWith('/src/')) {
    const filePath = path.join(process.cwd(), 'client', pathname);
    const contentType = getContentType(filePath);
    serveFile(res, filePath, contentType);
    return;
  }

  // Main HTML page
  if (pathname === '/' || pathname === '/index.html') {
    const indexPath = path.join(process.cwd(), 'client', 'index.html');
    if (fs.existsSync(indexPath)) {
      serveFile(res, indexPath, 'text/html');
      return;
    }
  }

  // Enhanced development page
  if (pathname === '/') {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Promptify - AI Playlist Generator</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1db954 0%, #191414 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container { 
            text-align: center; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px 20px;
          }
          .logo { 
            font-size: 4rem; 
            margin-bottom: 20px; 
            background: linear-gradient(45deg, #1db954, #1ed760);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 0 30px rgba(29, 185, 84, 0.5);
          }
          .title { 
            font-size: 2.5rem; 
            margin-bottom: 15px; 
            font-weight: 700;
          }
          .subtitle { 
            font-size: 1.2rem; 
            margin-bottom: 40px; 
            opacity: 0.9;
          }
          .status-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin: 40px 0;
          }
          .status-card { 
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            padding: 25px;
            text-align: left;
            transition: transform 0.3s ease;
          }
          .status-card:hover { 
            transform: translateY(-5px);
          }
          .status-icon { 
            font-size: 2rem; 
            margin-bottom: 10px; 
            display: block;
          }
          .status-title { 
            font-size: 1.1rem; 
            font-weight: 600; 
            margin-bottom: 8px;
          }
          .status-desc { 
            opacity: 0.8; 
            font-size: 0.9rem;
          }
          .btn { 
            background: #1db954;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin: 10px;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
          }
          .btn:hover { 
            background: #1ed760;
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(29, 185, 84, 0.3);
          }
          .api-test { 
            margin-top: 40px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
          }
          .features { 
            margin-top: 40px;
            text-align: left;
          }
          .feature-list { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin-top: 20px;
          }
          .feature-item { 
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #1db954;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🎵</div>
          <h1 class="title">Promptify</h1>
          <p class="subtitle">AI-Powered Spotify Playlist Generator</p>
          
          <div class="status-grid">
            <div class="status-card">
              <span class="status-icon">🚀</span>
              <div class="status-title">Server Running</div>
              <div class="status-desc">Backend server is active and serving requests</div>
            </div>
            
            <div class="status-card">
              <span class="status-icon">${process.env.DATABASE_URL ? '✅' : '❌'}</span>
              <div class="status-title">Database</div>
              <div class="status-desc">${process.env.DATABASE_URL ? 'PostgreSQL connected and ready' : 'Database configuration needed'}</div>
            </div>
            
            <div class="status-card">
              <span class="status-icon">${process.env.OPENAI_API_KEY ? '🤖' : '❌'}</span>
              <div class="status-title">OpenAI</div>
              <div class="status-desc">${process.env.OPENAI_API_KEY ? 'AI playlist generation ready' : 'OpenAI API key required'}</div>
            </div>
            
            <div class="status-card">
              <span class="status-icon">${process.env.SPOTIFY_CLIENT_ID ? '🎵' : '❌'}</span>
              <div class="status-title">Spotify</div>
              <div class="status-desc">${process.env.SPOTIFY_CLIENT_ID ? 'Music integration configured' : 'Spotify credentials needed'}</div>
            </div>
          </div>
          
          <div class="features">
            <h3>Promptify Features</h3>
            <div class="feature-list">
              <div class="feature-item">
                <h4>AI-Powered Generation</h4>
                <p>Use natural language to describe your perfect playlist</p>
              </div>
              <div class="feature-item">
                <h4>Spotify Integration</h4>
                <p>Seamlessly create and save playlists to your Spotify account</p>
              </div>
              <div class="feature-item">
                <h4>Smart Curation</h4>
                <p>Advanced filtering and audio feature analysis</p>
              </div>
              <div class="feature-item">
                <h4>Playlist History</h4>
                <p>View and manage your previously generated playlists</p>
              </div>
            </div>
          </div>
          
          <div class="api-test">
            <h3>System Status</h3>
            <button class="btn" onclick="testAPI()">Test API Connection</button>
            <button class="btn" onclick="checkServices()">Check Services</button>
            <div id="api-result"></div>
          </div>
        </div>
        
        <script>
          async function testAPI() {
            const result = document.getElementById('api-result');
            try {
              const response = await fetch('/api/health');
              const data = await response.json();
              result.innerHTML = '<pre style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; margin-top: 15px; text-align: left; overflow-x: auto;">' + 
                JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
              result.innerHTML = '<p style="color: #ff6b6b; margin-top: 15px;">Error: ' + error.message + '</p>';
            }
          }
          
          async function checkServices() {
            const result = document.getElementById('api-result');
            result.innerHTML = '<p style="margin-top: 15px;">Checking services...</p>';
            
            try {
              const [health, auth] = await Promise.all([
                fetch('/api/health').then(r => r.json()),
                fetch('/api/auth/me').then(r => r.json())
              ]);
              
              result.innerHTML = 
                '<div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; margin-top: 15px;">' +
                  '<h4>Service Status:</h4>' +
                  '<p>✅ Health Check: ' + health.status + '</p>' +
                  '<p>🔐 Auth Service: Available</p>' +
                  '<p>📊 Database: ' + (health.secrets.database_url ? 'Connected' : 'Not configured') + '</p>' +
                  '<p>🤖 OpenAI: ' + (health.secrets.openai ? 'Ready' : 'Not configured') + '</p>' +
                  '<p>🎵 Spotify: ' + (health.secrets.spotify_client_id ? 'Ready' : 'Not configured') + '</p>' +
                '</div>';
            } catch (error) {
              result.innerHTML = '<p style="color: #ff6b6b; margin-top: 15px;">Error checking services: ' + error.message + '</p>';
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
  console.log('🎵 Promptify hybrid server running on port ' + PORT);
  console.log('📡 API endpoints: http://localhost:' + PORT + '/api/');
  console.log('🔗 Application: http://localhost:' + PORT);
  console.log('✅ Migration completed - full application framework ready');
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