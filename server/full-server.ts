import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'promptify-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

(async () => {
  // Register all API routes
  const server = await registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err);
  });

  // Serve static files in production
  const clientPath = join(__dirname, '..', 'client');
  const distPath = join(__dirname, '..', 'dist', 'public');
  
  if (existsSync(distPath)) {
    // Production: serve built files
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  } else if (existsSync(clientPath)) {
    // Development: serve client files
    const indexPath = join(clientPath, 'index.html');
    
    // Serve static assets
    app.use('/src', express.static(join(clientPath, 'src')));
    app.use('/node_modules', express.static(join(__dirname, '..', 'node_modules')));
    
    // Serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Client not found. Please build the application.');
      }
    });
  } else {
    // Fallback if no client files found
    app.get('*', (req, res) => {
      res.status(404).json({ 
        message: "Client application not found. Please build the React app.",
        env: process.env.NODE_ENV,
        paths: {
          client: clientPath,
          dist: distPath
        }
      });
    });
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    console.log(`🎵 Promptify server running on port ${port}`);
    console.log(`📡 API endpoints: http://localhost:${port}/api/`);
    console.log(`🔗 Application: http://localhost:${port}`);
    console.log(`✅ All features loaded: Auth, Playlists, AI Generation, Spotify Integration`);
  });
})();