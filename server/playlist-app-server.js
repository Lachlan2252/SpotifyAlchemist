const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

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

    if (pathname === '/api/auth/me' && method === 'GET') {
      sendJSON(res, { message: "Please connect to Spotify to use the playlist generator" }, 401);
      return;
    }

    if (pathname === '/api/auth/spotify' && method === 'GET') {
      sendJSON(res, { message: "Spotify authentication - redirect needed" });
      return;
    }

    if (pathname === '/api/playlists' && method === 'GET') {
      sendJSON(res, []);
      return;
    }

    if (pathname === '/api/recent-prompts' && method === 'GET') {
      sendJSON(res, []);
      return;
    }

    if (pathname === '/api/spotify/playlists' && method === 'GET') {
      sendJSON(res, []);
      return;
    }

    if (pathname === '/api/playlists/generate' && method === 'POST') {
      sendJSON(res, { message: "Please authenticate with Spotify first" }, 401);
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

  // Main application page
  if (pathname === '/' || pathname === '/index.html') {
    const dbStatus = process.env.DATABASE_URL ? 'Connected' : 'Not configured';
    const openaiStatus = process.env.OPENAI_API_KEY ? 'Ready' : 'Not configured';
    const spotifyStatus = process.env.SPOTIFY_CLIENT_ID ? 'Ready' : 'Not configured';
    
    const dbIcon = process.env.DATABASE_URL ? '✅' : '❌';
    const openaiIcon = process.env.OPENAI_API_KEY ? '🤖' : '❌';
    const spotifyIcon = process.env.SPOTIFY_CLIENT_ID ? '🎵' : '❌';

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
            padding: 20px;
          }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { 
            text-align: center; 
            margin-bottom: 40px;
            padding: 40px 0;
          }
          .logo { 
            font-size: 5rem; 
            margin-bottom: 20px; 
            background: linear-gradient(45deg, #1db954, #1ed760);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 0 30px rgba(29, 185, 84, 0.5);
          }
          .title { 
            font-size: 3rem; 
            margin-bottom: 15px; 
            font-weight: 700;
          }
          .subtitle { 
            font-size: 1.3rem; 
            margin-bottom: 20px; 
            opacity: 0.9;
          }
          .main-content { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            margin-bottom: 40px;
          }
          .generator-section { 
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 30px;
          }
          .status-section { 
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 30px;
          }
          .generator-form { 
            margin-top: 20px;
          }
          .form-group { 
            margin-bottom: 20px;
          }
          label { 
            display: block; 
            margin-bottom: 8px; 
            font-weight: 600;
          }
          input[type="text"], textarea { 
            width: 100%; 
            padding: 15px; 
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px; 
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 1rem;
            backdrop-filter: blur(5px);
          }
          input[type="text"]:focus, textarea:focus { 
            outline: none;
            border-color: #1db954;
            box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.3);
          }
          input[type="text"]::placeholder, textarea::placeholder { 
            color: rgba(255, 255, 255, 0.6);
          }
          textarea { 
            resize: vertical; 
            min-height: 120px;
          }
          .btn { 
            background: linear-gradient(45deg, #1db954, #1ed760);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin: 10px 5px;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
          }
          .btn:hover { 
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(29, 185, 84, 0.4);
          }
          .btn:disabled { 
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          .status-grid { 
            display: grid; 
            grid-template-columns: 1fr; 
            gap: 15px; 
            margin-top: 20px;
          }
          .status-item { 
            display: flex; 
            align-items: center; 
            padding: 15px; 
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .status-icon { 
            font-size: 1.5rem; 
            margin-right: 15px;
          }
          .status-text { 
            flex: 1;
          }
          .status-title { 
            font-weight: 600; 
            margin-bottom: 5px;
          }
          .status-desc { 
            opacity: 0.8; 
            font-size: 0.9rem;
          }
          .instructions { 
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
          }
          .instructions h4 { 
            color: #1ed760; 
            margin-bottom: 10px;
          }
          .instructions ol { 
            margin-left: 20px;
          }
          .instructions li { 
            margin: 8px 0;
          }
          .auth-required { 
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 10px;
            padding: 15px;
            margin-top: 20px;
            text-align: center;
          }
          .auth-required h4 { 
            color: #ffc107;
            margin-bottom: 10px;
          }
          @media (max-width: 768px) {
            .main-content { 
              grid-template-columns: 1fr; 
            }
            .logo { 
              font-size: 3rem;
            }
            .title { 
              font-size: 2rem;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎵</div>
            <h1 class="title">Promptify</h1>
            <p class="subtitle">AI-Powered Spotify Playlist Generator</p>
            <p>Create amazing playlists using natural language descriptions</p>
          </div>
          
          <div class="main-content">
            <div class="generator-section">
              <h2>🎶 Generate Your Playlist</h2>
              <p>Describe your perfect playlist in natural language</p>
              
              <div class="generator-form">
                <div class="form-group">
                  <label for="playlist-prompt">What kind of playlist do you want?</label>
                  <textarea id="playlist-prompt" placeholder="e.g., 'Upbeat pop songs for working out', 'Chill indie rock for studying', 'Nostalgic 90s hits for a road trip'"></textarea>
                </div>
                
                <div class="form-group">
                  <label for="playlist-name">Playlist Name (optional)</label>
                  <input type="text" id="playlist-name" placeholder="e.g., 'My Workout Vibes'">
                </div>
                
                <button class="btn" onclick="generatePlaylist()" disabled>
                  Generate Playlist
                </button>
              </div>
              
              <div class="auth-required">
                <h4>⚠️ Authentication Required</h4>
                <p>Connect to Spotify to start generating playlists</p>
                <button class="btn" onclick="connectSpotify()">Connect to Spotify</button>
              </div>
              
              <div class="instructions">
                <h4>How it works:</h4>
                <ol>
                  <li><strong>Connect:</strong> Authenticate with your Spotify account</li>
                  <li><strong>Describe:</strong> Tell me what kind of playlist you want</li>
                  <li><strong>Generate:</strong> AI analyzes your request and finds perfect tracks</li>
                  <li><strong>Save:</strong> Add the playlist directly to your Spotify library</li>
                </ol>
              </div>
            </div>
            
            <div class="status-section">
              <h2>📊 System Status</h2>
              <p>Current configuration and service status</p>
              
              <div class="status-grid">
                <div class="status-item">
                  <span class="status-icon">🚀</span>
                  <div class="status-text">
                    <div class="status-title">Server</div>
                    <div class="status-desc">Running and ready</div>
                  </div>
                </div>
                
                <div class="status-item">
                  <span class="status-icon">${dbIcon}</span>
                  <div class="status-text">
                    <div class="status-title">Database</div>
                    <div class="status-desc">${dbStatus}</div>
                  </div>
                </div>
                
                <div class="status-item">
                  <span class="status-icon">${openaiIcon}</span>
                  <div class="status-text">
                    <div class="status-title">OpenAI</div>
                    <div class="status-desc">${openaiStatus}</div>
                  </div>
                </div>
                
                <div class="status-item">
                  <span class="status-icon">${spotifyIcon}</span>
                  <div class="status-text">
                    <div class="status-title">Spotify</div>
                    <div class="status-desc">${spotifyStatus}</div>
                  </div>
                </div>
              </div>
              
              <button class="btn" onclick="testAPI()">Test API Connection</button>
              <div id="api-result"></div>
            </div>
          </div>
        </div>
        
        <script>
          async function connectSpotify() {
            try {
              window.location.href = '/api/auth/spotify';
            } catch (error) {
              alert('Error connecting to Spotify: ' + error.message);
            }
          }
          
          async function generatePlaylist() {
            const prompt = document.getElementById('playlist-prompt').value;
            const name = document.getElementById('playlist-name').value;
            
            if (!prompt.trim()) {
              alert('Please describe what kind of playlist you want');
              return;
            }
            
            try {
              const response = await fetch('/api/playlists/generate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, name })
              });
              
              const data = await response.json();
              
              if (response.ok) {
                alert('Playlist generated successfully!');
              } else {
                alert('Error: ' + data.message);
              }
            } catch (error) {
              alert('Error generating playlist: ' + error.message);
            }
          }
          
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
        </script>
      </body>
      </html>
    `;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
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
  console.log('🎵 Promptify playlist generator running on port ' + PORT);
  console.log('📡 API endpoints: http://localhost:' + PORT + '/api/');
  console.log('🔗 Playlist Generator: http://localhost:' + PORT);
  console.log('✅ Ready to generate playlists!');
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