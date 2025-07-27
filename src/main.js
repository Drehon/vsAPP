require('dotenv').config(); // Load environment variables from .env file

const { app, BrowserWindow, ipcMain, session, Menu, shell, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { autoUpdater } = require('electron-updater');

// --- Configuration Management ---
const configPath = path.join(app.getPath('userData'), 'config.json');
let appConfig = {};

function loadConfig() {
  try {
    if (fsSync.existsSync(configPath)) {
      const rawData = fsSync.readFileSync(configPath);
      appConfig = JSON.parse(rawData);
    } else {
      // Create default config if it doesn't exist
      appConfig = {
        savePath: path.join(app.getPath('userData'), 'saves'),
        externalBrowser: 'Default Browser'
      };
      fsSync.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
    }
  } catch (error) {
    console.error('Failed to load or create config file:', error);
    // Fallback to defaults in case of error
    appConfig = {
      savePath: path.join(app.getPath('userData'), 'saves'),
      externalBrowser: 'Default Browser'
    };
  }
}

function getSavesDir() {
    // Ensure the configured directory exists
    const savesDir = appConfig.savePath || path.join(app.getPath('userData'), 'saves');
    if (!fsSync.existsSync(savesDir)) {
        fsSync.mkdirSync(savesDir, { recursive: true });
    }
    return savesDir;
}


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// --- IPC Handlers ---

ipcMain.handle('get-config', () => {
  return appConfig;
});

ipcMain.handle('save-config', async (event, newConfig) => {
  try {
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
    appConfig = newConfig; // Update in-memory config
    return { success: true };
  } catch (error) {
    console.error('Failed to save config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-directory-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (canceled) {
        return { canceled: true };
    } else {
        return { canceled: false, path: filePaths[0] };
    }
});

ipcMain.on('navigate', (event, relativePath) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
    const filePath = path.join(basePath, relativePath);
    win.loadFile(filePath);
  }
});

ipcMain.handle('get-home-content', async () => {
  const basePath = process.env.NODE_ENV === 'development' ? __dirname : path.join(app.getAppPath(), '.webpack/main');
  const filePath = path.join(basePath, 'home-template.html');
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read home template: ${err}`);
    return null;
  }
});

ipcMain.handle('get-settings-content', async () => {
  const basePath = process.env.NODE_ENV === 'development' ? __dirname : path.join(app.getAppPath(), '.webpack/main');
  const filePath = path.join(basePath, 'settings-template.html');
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read settings template: ${err}`);
    return null;
  }
});

ipcMain.handle('get-file-content', async (event, relativePath) => {
  const basePath = process.env.NODE_ENV === 'development' ? process.cwd() : app.getAppPath();
  const filePath = path.join(basePath, relativePath);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const bodyContentMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return bodyContentMatch ? bodyContentMatch[1] : content;
  } catch (err) {
    console.error(`Failed to read file content for ${relativePath}: ${err}`);
    return null;
  }
});

ipcMain.on('navigate-home', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }
});

ipcMain.handle('open-external-link', async (event, url) => {
  await shell.openExternal(url);
});

app.on('ready', () => {
  loadConfig();
  createWindow();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; font-src 'self';`
        ]
      }
    });
  });

  // Force electron-updater to check for updates even in development mode
  autoUpdater.forceDevUpdateConfig = true; 

  // Update check logic
  const request = net.request('https://www.github.com');
  request.on('response', () => {
    console.log('Main Process: Connection successful, checking for updates.');
    autoUpdater.checkForUpdatesAndNotify();
  });
  request.on('error', (error) => {
    console.log('Main Process: No internet connection, skipping update check.', error.message);
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('update-check-error'); // Notify renderer about no internet
    }
  });
  request.end();

  // Listener for update available event
  autoUpdater.on('update-available', (info) => {
    console.log('Main Process: Update available! Version:', info.version);
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('update-available');
    }
  });

  // Listener for update not available event
  autoUpdater.on('update-not-available', (info) => {
    console.log('Main Process: Update not available. Current version:', app.getVersion(), 'Latest available:', info.version);
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('update-not-available');
    }
  });

  autoUpdater.on('error', (error) => {
    console.error('Main Process: AutoUpdater error:', error.message);
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('update-check-error');
    }
  });

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Save States Folder',
          click: () => {
            shell.openPath(getSavesDir());
          }
        },
        { type: 'separator' },
        { role: 'quit' }
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
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://electronjs.org');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- Save/Load Handlers ---

const getExerciseSavePath = (exerciseFilePath) => {
  const savesDir = getSavesDir();
  const sanitizedFileName = exerciseFilePath.replace(/[\\/:]/g, '-').replace(/\.html$/, '').toLowerCase();
  return path.join(savesDir, `${sanitizedFileName}_state.json`);
};

ipcMain.handle('save-exercise-state', async (event, filePath, state) => {
  const savePath = getExerciseSavePath(filePath);
  try {
    await fs.writeFile(savePath, JSON.stringify(state, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-exercise-state', async (event, filePath) => {
  const savePath = getExerciseSavePath(filePath);
  try {
    const data = await fs.readFile(savePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    return null;
  }
});

ipcMain.handle('reset-exercise-state', async (event, filePath) => {
  const savePath = getExerciseSavePath(filePath);
  try {
    if (fsSync.existsSync(savePath)) {
      await fs.unlink(savePath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-save-dialog-and-save-file', async (event, { defaultFilename, data }) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const savesDir = getSavesDir();

  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    defaultPath: path.join(savesDir, defaultFilename),
    filters: [{ name: 'JSON Files', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }]
  });

  if (canceled) {
    return { success: false, canceled: true };
  } else {
    try {
      await fs.writeFile(filePath, data);
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

const getContents = async (dir) => {
  let directoryPath;
  if (process.env.NODE_ENV === 'development') {
    // In development, files are relative to the project root
    directoryPath = path.join(process.cwd(), dir);
  } else {
    // In production, with asar: true and extraResource, files are in app.asar.unpacked
    directoryPath = path.join(process.resourcesPath, 'app.asar.unpacked', dir);
  }
  try {
    const files = await fs.readdir(directoryPath);
    return files.filter(file => file.endsWith('.html'));
  } catch (err) {
    console.error(`Error reading directory ${directoryPath}:`, err);
    return [];
  }
};

ipcMain.handle('get-lessons', () => getContents('lessons'));
ipcMain.handle('get-exercises', () => getContents('exercises'));
