const { spawn } = require('child_process');
const path = require('path');

// Start Vite dev server for the React app
console.log('🚀 Starting Promptify development server...');

// Set environment variables
process.env.NODE_ENV = 'development';

// Start Vite
const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5000'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

viteProcess.on('error', (err) => {
  console.error('Failed to start Vite:', err);
  process.exit(1);
});

viteProcess.on('exit', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code);
});