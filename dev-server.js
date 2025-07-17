const { spawn } = require('child_process');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Start Vite in the background
const vite = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit'
});

// Proxy all requests to Vite
app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  ws: true,
  changeOrigin: true
}));

app.listen(5173, '0.0.0.0', () => {
  console.log('Dev server running on http://localhost:5173');
});

process.on('SIGINT', () => {
  vite.kill();
  process.exit();
});