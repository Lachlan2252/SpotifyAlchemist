import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Extend express session to include userId
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// Basic logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

// API Routes
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

// Auth routes - simplified for now
app.get("/api/auth/spotify", (req, res) => {
  res.json({ message: "Spotify auth endpoint - implementation needed" });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.json({ message: "User authenticated", userId: req.session.userId });
});

app.get("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully" });
  });
});

// Serve the React application
app.use(express.static(path.resolve(process.cwd(), "client")));

// Serve client files
app.get("*", (req, res) => {
  const clientPath = path.resolve(process.cwd(), "client");
  const indexPath = path.join(clientPath, "index.html");
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Fallback HTML when client isn't built yet
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Promptify - AI Playlist Generator</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            max-width: 800px; 
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
          }
          .status-icon { 
            font-size: 2rem; 
            margin-bottom: 10px; 
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
          }
          .btn:hover { 
            background: #1ed760;
            transform: translateY(-2px);
          }
          .api-test { 
            margin-top: 40px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
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
              <div class="status-icon">🚀</div>
              <div class="status-title">Server Running</div>
              <div class="status-desc">Backend server is active and ready</div>
            </div>
            
            <div class="status-card">
              <div class="status-icon">${process.env.DATABASE_URL ? '✅' : '❌'}</div>
              <div class="status-title">Database</div>
              <div class="status-desc">${process.env.DATABASE_URL ? 'PostgreSQL connected' : 'Database not configured'}</div>
            </div>
            
            <div class="status-card">
              <div class="status-icon">${process.env.OPENAI_API_KEY ? '🤖' : '❌'}</div>
              <div class="status-title">OpenAI</div>
              <div class="status-desc">${process.env.OPENAI_API_KEY ? 'AI playlist generation ready' : 'OpenAI key needed'}</div>
            </div>
            
            <div class="status-card">
              <div class="status-icon">${process.env.SPOTIFY_CLIENT_ID ? '🎵' : '❌'}</div>
              <div class="status-title">Spotify</div>
              <div class="status-desc">${process.env.SPOTIFY_CLIENT_ID ? 'Music integration ready' : 'Spotify credentials needed'}</div>
            </div>
          </div>
          
          <div class="api-test">
            <h3>API Status</h3>
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
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  console.error("Server error:", err);
  res.status(status).json({ message });
});

const server = createServer(app);
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🎵 Promptify server running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🔗 Application: http://localhost:${PORT}`);
});

export default app;