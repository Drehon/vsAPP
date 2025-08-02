require('dotenv').config(); // Load environment variables from .env file

const { app, BrowserWindow, ipcMain, session, Menu, shell, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { autoUpdater } = require('electron-updater');
let updateInfo = null;

// --- Logging ---
const setupLogging = () => {
  const logFilePath = path.join(app.getPath('userData'), 'main-process-log.txt');
  let devLogFilePath = null;

  // Ensure user data log directory exists (usually does, but good practice)
  const userDataDir = path.dirname(logFilePath);
  if (!fsSync.existsSync(userDataDir)) {
    fsSync.mkdirSync(userDataDir, { recursive: true });
  }
  
  // Create dev log file path if in development
  if (!app.isPackaged) {
    const devLogDir = path.join(app.getAppPath(), 'undefinedsave_logs');
    if (!fsSync.existsSync(devLogDir)) {
      fsSync.mkdirSync(devLogDir, { recursive: true });
    }
    devLogFilePath = path.join(devLogDir, 'dev-main-process-log.txt');
  }

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const logToFile = (type, ...args) => {
    // Sanitize arguments to prevent circular reference errors in JSON.stringify or similar issues
    const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            try {
                // A simple way to handle objects, might need to be more robust
                return JSON.stringify(arg);
            } catch (e) {
                return '[Unserializable Object]';
            }
        }
        return arg;
    });
  
    const message = `[${type}][${new Date().toISOString()}] ${sanitizedArgs.join(' ')}\n`;
    
    try {
      fsSync.appendFileSync(logFilePath, message);
      if (devLogFilePath) {
        fsSync.appendFileSync(devLogFilePath, message);
      }
    } catch (err) {
      // If logging fails, write to the original console to avoid infinite loops
      originalError('Failed to write to log file:', err);
    }
  };

  console.log = (...args) => {
    originalLog(...args);
    logToFile('LOG', ...args);
  };

  console.error = (...args) => {
    originalError(...args);
    logToFile('ERROR', ...args);
  };

  console.warn = (...args) => {
    originalWarn(...args);
    logToFile('WARN', ...args);
  };
  
  console.log('--- Logging initialized using synchronous file append ---');
};
// --- End Logging ---


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

// --- Patch Notes Management ---
const updateAndGeneratePatchNotes = async (releaseInfo) => {
  console.log('[PatchNotes] Starting update and generation process.');
  const userDataPath = app.getPath('userData');
  const userPatchNotesPath = path.join(userDataPath, 'patchnotes.json');
  
  // In development, app path is project root. In production, it's resources/app.
  const appPath = app.getAppPath();
  const bundledPatchNotesPath = path.join(appPath, 'patchnotes.json');
  const templatePath = path.join(appPath, 'others', 'patch-notes-template.html');

  try {
      let patchNotes = [];
      try {
          const data = await fs.readFile(userPatchNotesPath, 'utf8');
          patchNotes = JSON.parse(data);
      } catch (error) {
          if (error.code === 'ENOENT') {
              console.log('[PatchNotes] No user patch notes found. Copying from bundle.');
              const bundledData = await fs.readFile(bundledPatchNotesPath, 'utf8');
              await fs.writeFile(userPatchNotesPath, bundledData);
              patchNotes = JSON.parse(bundledData);
          } else {
              throw error;
          }
      }

      if (releaseInfo) {
          const newTagName = `v${releaseInfo.version}`;
          const alreadyExists = patchNotes.some(note => note.tagName === newTagName);

          if (!alreadyExists) {
              console.log(`[PatchNotes] Adding new version ${newTagName}.`);
              const newNote = {
                  body: releaseInfo.notes || 'No release notes provided.',
                  name: releaseInfo.releaseName || `Version ${releaseInfo.version}`,
                  publishedAt: releaseInfo.releaseDate,
                  tagName: newTagName,
                  version: releaseInfo.version,
              };
              patchNotes.unshift(newNote);
              await fs.writeFile(userPatchNotesPath, JSON.stringify(patchNotes, null, 2));
              console.log('[PatchNotes] Successfully updated user patchnotes.json');
          }
      }

      const userOutputPath = path.join(userDataPath, 'patch-notes.html');
      const template = await fs.readFile(templatePath, 'utf8');
      const patchNotesHtml = patchNotes.map(note => {
          const date = new Date(note.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
          const body = note.body ? note.body.replace(/\r\n/g, '<br>') : '';
          return `
              <div class="bg-white rounded-lg shadow-lg overflow-hidden p-6">
                  <h2 class="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4">${note.name} - ${date}</h2>
                  <div class="prose max-w-none mt-4">
                      ${body}
                  </div>
              </div>
          `;
      }).join('');
      const outputHtml = template.replace('<!-- PATCH_NOTES_CONTENT -->', patchNotesHtml);
      await fs.writeFile(userOutputPath, outputHtml);
      console.log('[PatchNotes] Successfully generated user patch-notes.html');
  } catch (error) {
      console.error('[PatchNotes] Failed to update and generate patch notes:', error);
  }
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow; // Define mainWindow in a broader scope
let isMainWindowCreated = false;

const createWindow = () => {
  // Prevent multiple windows if one already exists
  if (isMainWindowCreated) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
    }
    return;
  }

  isMainWindowCreated = true;
  console.log('Main Process: createWindow called. Initializing main window.'); // Added log
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open dev tools for debugging. This should ideally be conditional on NODE_ENV.
  // Changed to explicitly use app.isPackaged to control dev tools.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null; // Dereference the window object
  });
};

// --- IPC Handlers ---

ipcMain.handle('get-config', () => appConfig);
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

ipcMain.handle('show-open-dialog-and-load-file', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const savesDir = getSavesDir();

  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    defaultPath: savesDir,
    filters: [{ name: 'JSON Files', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }],
    properties: ['openFile']
  });

  if (canceled) {
    return { success: false, canceled: true };
  }

  const filePath = filePaths[0];

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, path: filePath, data: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-directory-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (canceled) {
        return { canceled: true };
    } else {
        return { canceled: false, path: filePaths[0] };
    }
});

ipcMain.on('navigate', (event, relativePath) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const basePath = process.env.NODE_ENV === 'development' ? process.cwd() : process.resourcesPath;
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
    // Special handling for patch notes
    if (relativePath === 'others/patch-notes.html') {
        console.log(`[PatchNotes] Loading content for: ${relativePath}`);
        const userPatchNotesPath = path.join(app.getPath('userData'), 'patch-notes.html');
        try {
            const content = await fs.readFile(userPatchNotesPath, 'utf-8');
            return content; // Return full HTML
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('[PatchNotes] No user patch-notes.html found, generating for the first time.');
                await updateAndGeneratePatchNotes(null);
                try {
                    const content = await fs.readFile(userPatchNotesPath, 'utf-8');
                    return content;
                } catch (retryError) {
                    console.error(`Failed to read patch notes after generation:`, retryError);
                    return '<html><body>Error loading patch notes. Please check logs.</body></html>';
                }
            } else {
                console.error(`Failed to read ${relativePath} from userData: ${error}`);
                return '<html><body>Error loading patch notes. Please check logs.</body></html>';
            }
        }
    }

    // Original logic for all other files
    const basePath = app.isPackaged ? process.resourcesPath : process.cwd();
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
  setupLogging();
  console.log('--- setupLogging() has been called. This is the first log after setup. ---');
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

  // --- Auto-Updater Logic (User-Prompted Flow) ---
  
  autoUpdater.autoDownload = false;

  if (process.env.GITHUB_TOKEN) {
    autoUpdater.requestHeaders = { Authorization: `token ${process.env.GITHUB_TOKEN}` };
    console.log('DEBUG: GITHUB_TOKEN loaded for autoUpdater request headers.');
  } else {
    console.warn('WARNING: GITHUB_TOKEN not found.');
  }

  if (process.env.NODE_ENV === 'development') {
    autoUpdater.updateConfigPath = path.join(app.getAppPath(), 'dev-app-update.yml');
    autoUpdater.forceDevUpdateConfig = true;
  }

  mainWindow.once('ready-to-show', () => {
    console.log('Main Process: Checking for updates...');
    console.log('AutoUpdater configuration:', autoUpdater);
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Main Process: Error during update check:', err.message);
      if (mainWindow) {
        mainWindow.webContents.send('update-status', 'error', { error: err.message });
      }
    });
  });

  // --- Auto-Updater Event Listeners ---
  autoUpdater.on('update-available', (info) => {
    console.log('Main Process: Update available!', info);
    updateInfo = info; // Store the info for the download process
    if (mainWindow) { // Ensure mainWindow exists before sending
      mainWindow.webContents.send('update-status', 'available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Main Process: Update not available.', info);
    if (mainWindow) { // Ensure mainWindow exists before sending
      mainWindow.webContents.send('update-status', 'not-available', info);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Main Process: Update downloaded.', info);
    if (mainWindow) { // Ensure mainWindow exists before sending
      mainWindow.webContents.send('update-status', 'downloaded', info);
    }
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
    if (mainWindow) { // Ensure mainWindow exists before sending
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Main Process: AutoUpdater emitted an error event:', err.message);
    if (mainWindow) { // Ensure mainWindow exists before sending
      mainWindow.webContents.send('update-status', 'error', { error: err.message });
    }
  });

  // --- IPC Listeners for UI Actions ---
  
  ipcMain.on('start-download', () => {
    console.log('Main Process: Download initiated by user.');
    if (updateInfo) {
        updateAndGeneratePatchNotes(updateInfo).then(() => {
            console.log('[PatchNotes] Generation complete. Starting download.');
            autoUpdater.downloadUpdate();
        });
    } else {
        console.log('Main Process: No update info, starting download directly.');
        autoUpdater.downloadUpdate(); // Fallback if no info is present
    }
  });

  ipcMain.on('restart-app', () => {
    autoUpdater.quitAndInstall();
  });

  // --- Application Menu ---
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'Open Save States Folder', click: () => { shell.openPath(getSavesDir()); } },
        { label: 'Show Logs in Folder', click: () => { shell.openPath(app.getPath('userData')); } },
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
    }
  ];

  // Add Help menu only if not in production
  if (process.env.NODE_ENV !== 'production') {
    menuTemplate.push({
      label: 'Help',
      submenu: [
        { label: 'Learn More', click: async () => { await shell.openExternal('https://electronjs.org'); } }
      ]
    });
  }

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
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- Save/Load Handlers ---

const getExerciseSavePath = (exerciseFilePath) => {
  const savesDir = appConfig.savePath || path.join(app.getPath('userData'), 'saves'); // Use appConfig.savePath
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

ipcMain.handle('show-save-dialog-and-save-file', async (event, { defaultFilename, data } = {}) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const savesDir = getSavesDir();
  
  // THE FIX IS HERE: The destructured argument now has a default value of an empty object.
  // This prevents a crash if the renderer calls the function with no arguments.
  const finalFilename = defaultFilename || 'exercise-save-state.json';

  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    defaultPath: path.join(savesDir, finalFilename),
    filters: [{ name: 'JSON Files', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }]
  });

  if (canceled) {
    return { success: false, canceled: true };
  } else {
    try {
      await fs.writeFile(filePath, data || '');
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
});

const getContents = async (dir) => {
  let directoryPath;
  if (process.env.NODE_ENV === 'development') {
    directoryPath = path.join(process.cwd(), dir);
  } else {
    directoryPath = path.join(process.resourcesPath, dir);
  }
  try {
    const files = await fs.readdir(directoryPath);
    return files.filter(file => file.endsWith('.html') && file !== 'patch-notes-template.html');
  } catch (err) {
    console.error(`Error reading directory ${directoryPath}:`, err);
    return [];
  }
};

ipcMain.handle('get-lessons', () => getContents('lessons'));
ipcMain.handle('get-exercises', () => getContents('exercises'));
ipcMain.handle('get-lessons-an', () => getContents('lessonsAN'));
ipcMain.handle('get-tests', () => getContents('others'));
