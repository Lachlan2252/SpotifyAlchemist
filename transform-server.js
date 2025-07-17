const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { transform } = require('esbuild');

// Transform TypeScript/JSX to JavaScript
async function transformFile(filePath, code) {
  try {
    const result = await transform(code, {
      loader: filePath.endsWith('.tsx') ? 'tsx' : 
              filePath.endsWith('.ts') ? 'ts' : 
              filePath.endsWith('.jsx') ? 'jsx' : 'js',
      jsx: 'automatic',
      format: 'esm',
      target: 'es2020',
    });
    return result.code;
  } catch (error) {
    console.error('Transform error:', error);
    return `console.error('Transform error: ${error.message}');`;
  }
}

// Simple module resolution
function resolveModule(importPath, fromFile) {
  // Handle aliases
  if (importPath.startsWith('@/')) {
    return '/src/' + importPath.slice(2);
  }
  if (importPath.startsWith('@shared/')) {
    return '/../shared/' + importPath.slice(8);
  }
  
  // Handle relative imports
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const dir = path.dirname(fromFile);
    const resolved = path.join(dir, importPath);
    // Add extensions if missing
    if (!path.extname(resolved)) {
      for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
        if (fs.existsSync(path.join(__dirname, 'client', resolved + ext))) {
          return resolved + ext;
        }
      }
    }
    return resolved;
  }
  
  // Handle node_modules
  return '/node_modules/' + importPath;
}

// Transform imports in code
function transformImports(code, filePath) {
  return code.replace(
    /import\s+(?:(?:\{[^}]*\}|[\w$]+|\*\s+as\s+[\w$]+)\s*(?:,\s*)?)*\s*from\s*["']([^"']+)["'];?/g,
    (match, importPath) => {
      if (importPath.endsWith('.css')) {
        return ''; // Skip CSS imports
      }
      const resolved = resolveModule(importPath, filePath);
      return match.replace(importPath, resolved);
    }
  ).replace(
    /export\s+(?:\{[^}]*\}|\*)\s+from\s*["']([^"']+)["'];?/g,
    (match, importPath) => {
      const resolved = resolveModule(importPath, filePath);
      return match.replace(importPath, resolved);
    }
  );
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Handle TypeScript/JSX files
  if (pathname.match(/\.(tsx?|jsx?)$/)) {
    const filePath = pathname.startsWith('/node_modules/') 
      ? path.join(__dirname, pathname)
      : path.join(__dirname, 'client', pathname);
    
    if (fs.existsSync(filePath)) {
      try {
        const code = fs.readFileSync(filePath, 'utf8');
        const transformedImports = transformImports(code, pathname);
        const transformed = await transformFile(filePath, transformedImports);
        
        res.writeHead(200, { 
          'Content-Type': 'application/javascript',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(transformed);
      } catch (error) {
        res.writeHead(500);
        res.end(`console.error('Error loading ${pathname}:', '${error.message}');`);
      }
    } else {
      res.writeHead(404);
      res.end(`console.error('Module not found: ${pathname}');`);
    }
    return;
  }
  
  // Handle CSS
  if (pathname.endsWith('.css')) {
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end('/* CSS placeholder */');
    return;
  }
  
  // Handle node_modules requests
  if (pathname.startsWith('/node_modules/')) {
    const modulePath = path.join(__dirname, pathname);
    if (fs.existsSync(modulePath)) {
      const content = fs.readFileSync(modulePath, 'utf8');
      res.writeHead(200, { 
        'Content-Type': 'application/javascript',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    } else {
      // Return a mock for missing modules
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(`export default {}; export const ${path.basename(pathname, '.js')} = {};`);
    }
    return;
  }
  
  // Serve index.html
  if (pathname === '/' || pathname === '/index.html') {
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Promptify - AI Playlist Generator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      // Add import map for missing modules
      window.mockModules = new Map();
      const originalImport = window.import || ((url) => import(url));
      window.import = async (url) => {
        if (url.includes('@radix-ui') || url.includes('cmdk') || url.includes('embla')) {
          console.warn('Mocking module:', url);
          return { default: {}, ...window.mockModules.get(url) || {} };
        }
        return originalImport(url);
      };
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  
  // 404 for other requests
  res.writeHead(404);
  res.end('Not found');
});

const PORT = 5001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔄 Transform server running on port ${PORT}`);
  console.log(`📱 React app: http://localhost:${PORT}`);
});