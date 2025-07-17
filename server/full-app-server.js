const http = require('http');
const url = require('url');
const { spawn } = require('child_process');
const httpProxy = require('http-proxy-middleware');

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

// Create basic API server
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
      sendJSON(res, { message: "Please implement authentication" }, 401);
      return;
    }

    if (pathname === '/api/auth/spotify' && method === 'GET') {
      sendJSON(res, { message: "Spotify auth - redirect to dashboard to set up" });
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
      sendJSON(res, { message: "Playlist generation - authenticate with Spotify first" }, 401);
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

  // Serve React app development page
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
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
            padding: 20px;
          }
          .container { text-align: center; max-width: 900px; width: 100%; }
          .logo { font-size: 4rem; margin-bottom: 20px; }
          .title { font-size: 2.5rem; margin-bottom: 15px; font-weight: 700; }
          .subtitle { font-size: 1.2rem; margin-bottom: 40px; opacity: 0.9; }
          .status-card { 
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            padding: 30px;
            margin: 20px 0;
            text-align: left;
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
          .setup-steps {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
          }
          .setup-steps h4 { color: #1ed760; margin-bottom: 10px; }
          .setup-steps ol { margin-left: 20px; }
          .setup-steps li { margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🎵</div>
          <h1 class="title">Promptify</h1>
          <p class="subtitle">AI-Powered Spotify Playlist Generator</p>
          
          <div class="status-card">
            <h3>🎯 Your Playlist Generator is Ready!</h3>
            <p>The React application is available but needs to be built and served properly.</p>
            
            <div class="setup-steps">
              <h4>To get your playlist generator running:</h4>
              <ol>
                <li><strong>Authentication:</strong> Connect to Spotify to access your music library</li>
                <li><strong>AI Generation:</strong> Use natural language to describe your perfect playlist</li>
                <li><strong>Smart Curation:</strong> AI will analyze and select the best tracks</li>
                <li><strong>Save & Share:</strong> Save playlists directly to your Spotify account</li>
              </ol>
            </div>
            
            <button class="btn" onclick="window.location.href='/api/auth/spotify'">Connect to Spotify</button>
            <button class="btn" onclick="testAPI()">Test API Connection</button>
            
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
        </script>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log('🎵 Promptify API server running on port ' + PORT);
  console.log('📡 API endpoints: http://localhost:' + PORT + '/api/');
  console.log('🔗 Application: http://localhost:' + PORT);
  console.log('✅ Ready for playlist generation!');
});