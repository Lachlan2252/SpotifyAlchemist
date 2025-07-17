const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🏗️  Building Promptify React application...');

// Run esbuild to bundle the React app
const buildCommand = `npx esbuild client/src/main.tsx --bundle --outfile=client/dist/bundle.js --loader:.tsx=tsx --loader:.ts=ts --loader:.jsx=jsx --loader:.js=jsx --format=esm --jsx=automatic --platform=browser --target=es2020 --external:*.css`;

exec(buildCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('Build failed:', error);
    console.error(stderr);
    return;
  }
  
  console.log('✅ Build complete!');
  
  // Create a proper index.html that loads the bundle
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Promptify - AI Playlist Generator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      /* Add any custom styles here */
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      body { font-family: 'Inter', sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/dist/bundle.js"></script>
  </body>
</html>`;
  
  fs.writeFileSync(path.join(__dirname, 'client', 'index-built.html'), indexHtml);
  console.log('📄 Created optimized index.html');
  
  // Update the server to serve the built version
  const serverCode = fs.readFileSync(path.join(__dirname, 'server', 'playlist-app-server.js'), 'utf8');
  const updatedServer = serverCode.replace('index.html', 'index-built.html');
  fs.writeFileSync(path.join(__dirname, 'server', 'playlist-app-server-built.js'), updatedServer);
  
  console.log('🚀 Ready to run: node server/playlist-app-server-built.js');
});