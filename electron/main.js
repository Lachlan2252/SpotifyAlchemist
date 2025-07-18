const { app, BrowserWindow, shell, Menu, dialog, systemPreferences } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  // Create the browser window with modern macOS styling
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset', // Modern macOS title bar
    titleBarOverlay: {
      color: '#1a1a2e',
      symbolColor: '#ffffff',
      height: 60
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    frame: true,
    transparent: false,
    backgroundColor: '#1a1a2e',
    show: false, // Don't show until ready
    icon: process.platform === 'darwin' ? 
      path.join(__dirname, 'assets/icon.svg') : 
      path.join(__dirname, 'assets/icon.png'),
    vibrancy: 'ultra-dark', // macOS vibrancy effect
    visualEffectState: 'active'
  });

  // Smooth window show animation
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Add a subtle fade-in animation
    mainWindow.setOpacity(0);
    let opacity = 0;
    const fadeIn = setInterval(() => {
      opacity += 0.05;
      mainWindow.setOpacity(opacity);
      if (opacity >= 1) {
        clearInterval(fadeIn);
      }
    }, 16); // 60fps animation
  });

  // Handle window focus for better macOS integration
  mainWindow.on('focus', () => {
    if (process.platform === 'darwin') {
      // Highlight the dock icon when focused
      app.dock.setBadge('');
    }
  });

  // Handle window close behavior for macOS
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    } else {
      app.quit();
    }
  });

  // Open the developer tools automatically in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Open external links in the user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    // In development, wait for the server to start before loading
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:5173');
    }, 3000);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/public/index.html'));
  }

  // Prevent navigation outside the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL() && !url.startsWith('http://localhost:5173')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Add window animations for resize
  mainWindow.on('resize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.webContents.send('window-state-changed', 'maximized');
    } else {
      mainWindow.webContents.send('window-state-changed', 'normal');
    }
  });

  return mainWindow;
}

function createMenu() {
  const template = [
    {
      label: 'Spotify Alchemist',
      submenu: [
        {
          label: 'About Spotify Alchemist',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Spotify Alchemist',
              message: 'Spotify Alchemist',
              detail: 'An intelligent playlist generation tool powered by AI.\n\nVersion: 1.0.0\nBuilt with Electron and React',
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('open-preferences');
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Playlist',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-playlist');
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/Lachlan2252/SpotifyAlchemist');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function startServer() {
  if (process.env.NODE_ENV === 'development') {
    serverProcess = spawn('npm', ['run', 'dev'], { 
      shell: true, 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } else {
    serverProcess = spawn('node', [path.join(__dirname, '../dist/index.js')], { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  }

  serverProcess.on('error', (err) => {
    console.error('Server process error:', err);
  });
}

// macOS specific app event handlers
app.whenReady().then(() => {
  // Check for macOS dark mode
  if (process.platform === 'darwin') {
    systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
      mainWindow.webContents.send('theme-changed', systemPreferences.isDarkMode());
    });
  }

  startServer();
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Handle app reopen (dock icon clicked)
app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

// macOS specific dock handling
if (process.platform === 'darwin') {
  app.dock.setIcon(path.join(__dirname, 'assets/icon.png'));
}
