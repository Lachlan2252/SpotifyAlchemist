const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/client/index.html'));
  }
}

app.whenReady().then(() => {
  if (process.env.NODE_ENV === 'development') {
    spawn('npm', ['run', 'dev'], { shell: true, stdio: 'inherit' });
  } else {
    spawn('node', [path.join(__dirname, '../dist/index.js')], { stdio: 'inherit' });
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
