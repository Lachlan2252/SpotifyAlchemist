
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { registerRoutes } from './routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware
app.use((req: any, res: any, next: any) => {
  req.session = req.session || {};
  const cookie = req.headers.cookie;
  if (cookie) {
    const match = cookie.match(/sessionId=([^;]+)/);
    if (match) {
      req.session.sessionId = match[1];
      req.session.userId = 1; // For testing
    }
  }
  next();
});

// Register all API routes
registerRoutes(app);

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'client')));

// Serve index.html for all other routes
app.get('*', (req: any, res: any) => {
  const indexPath = path.join(__dirname, '..', 'client', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not found');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎵 Promptify Express Server running on port ${PORT}`);
  console.log(`📡 API endpoints: http://localhost:${PORT}/api/`);
  console.log(`✅ All routes from routes.ts loaded`);
});
