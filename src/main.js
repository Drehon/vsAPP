require('dotenv').config(); // Load environment variables from .env file

const {
  app, BrowserWindow, ipcMain, session, Menu, shell, dialog,
} = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { autoUpdater } = require('electron-updater');
const { generatePatchHTML } = require('./patch-updater');

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

  // eslint-disable-next-line no-console
  const originalLog = console.log;
  // eslint-disable-next-line no-console
  const originalError = console.error;
  // eslint-disable-next-line no-console
  const originalWarn = console.warn;

  const logToFile = (type, ...args) => {
    // Sanitize arguments to prevent circular reference errors in JSON.stringify or similar issues
    const sanitizedArgs = args.map((arg) => {
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

  // eslint-disable-next-line no-console
  console.log = (...args) => {
    originalLog(...args);
    logToFile('LOG', ...args);
  };

  // eslint-disable-next-line no-console
  console.error = (...args) => {
    originalError(...args);
    logToFile('ERROR', ...args);
  };

  // eslint-disable-next-line no-console
  console.warn = (...args) => {
    originalWarn(...args);
    logToFile('WARN', ...args);
  };
};
// --- End Logging ---

/**
 * Handles the post-update tasks, specifically for updating patch notes.
 * This function is called on startup.
 */
const handlePostUpdateTasks = async () => {
  const userDataPath = app.getPath('userData');
  const pendingUpdatePath = path.join(userDataPath, 'pending-update.json');

  try {
    // Check if a pending update file exists.
    const pendingUpdateData = await fs.readFile(pendingUpdatePath, 'utf8');
    JSON.parse(pendingUpdateData);

    // 1. Copy the canonical patchnotes.json from the app resources to userData.
    const basePath = app.isPackaged ? process.resourcesPath : app.getAppPath();
    const bundledPatchNotesPath = path.join(basePath, 'patchnotes.json');
    const userPatchNotesPath = path.join(userDataPath, 'patchnotes.json');

    await fs.copyFile(bundledPatchNotesPath, userPatchNotesPath);

    // 2. Load the newly copied patchnotes.json.
    const patchNotes = JSON.parse(await fs.readFile(userPatchNotesPath, 'utf8'));

    // 3. Generate the new HTML from the final data.
    await generatePatchHTML(app, patchNotes);

    // 6. Clean up the pending update file.
    await fs.unlink(pendingUpdatePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // This is normal - no pending update.
      // Also handle first-run generation.
      const userPatchNotesPath = path.join(userDataPath, 'patch-notes.html');
      try {
        await fs.access(userPatchNotesPath);
      } catch (accessError) {
        if (accessError.code === 'ENOENT') {
          const basePath = app.isPackaged ? process.resourcesPath : app.getAppPath();
          const bundledPatchNotesPath = path.join(basePath, 'patchnotes.json');
          const patchNotes = JSON.parse(await fs.readFile(bundledPatchNotesPath, 'utf8'));
          await generatePatchHTML(app, patchNotes);
        }
      }
    }
  }
};

// --- Configuration Management ---
const configPath = path.join(app.getPath('userData'), 'config.json');
let appConfig = {};

function loadConfig() {
  try {
    if (fsSync.existsSync(configPath)) {
      const rawData = fsSync.readFileSync(configPath);
      appConfig = JSON.parse(rawData);

      // Migration for users with the old 'savePath'
      if (appConfig.savePath && !appConfig.autoSavePath && !appConfig.manualSavePath) {
        appConfig.autoSavePath = path.join(app.getPath('userData'), 'save-states');
        appConfig.manualSavePath = appConfig.savePath; // Old path becomes manual save path
        delete appConfig.savePath; // Remove old key
        // Immediately save the migrated config
        fsSync.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
      }
    } else {
      // Create default config if it doesn't exist
      appConfig = {
        autoSavePath: path.join(app.getPath('userData'), 'save-states'),
        manualSavePath: path.join(app.getPath('userData'), 'saves'),
        externalBrowser: 'Default Browser',
      };
      fsSync.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
    }
  } catch (error) {
    // Fallback to defaults in case of error
    appConfig = {
      autoSavePath: path.join(app.getPath('userData'), 'save-states'),
      manualSavePath: path.join(app.getPath('userData'), 'saves'),
      externalBrowser: 'Default Browser',
    };
  }
  // Ensure default paths are set if they are missing for any reason
  if (!appConfig.autoSavePath) {
    appConfig.autoSavePath = path.join(app.getPath('userData'), 'save-states');
  }
  if (!appConfig.manualSavePath) {
    appConfig.manualSavePath = path.join(app.getPath('userData'), 'saves');
  }
}

function getAutoSavesDir() {
  const savesDir = appConfig.autoSavePath || path.join(app.getPath('userData'), 'save-states');
  if (!fsSync.existsSync(savesDir)) {
    fsSync.mkdirSync(savesDir, { recursive: true });
  }
  return savesDir;
}

function getManualSavesDir() {
  const savesDir = appConfig.manualSavePath || path.join(app.getPath('userData'), 'saves');
  if (!fsSync.existsSync(savesDir)) {
    fsSync.mkdirSync(savesDir, { recursive: true });
  }
  return savesDir;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-next-line global-require
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
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-open-dialog-and-load-file', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const savesDir = getManualSavesDir();

  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    defaultPath: savesDir,
    filters: [{ name: 'JSON Files', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }],
    properties: ['openFile'],
  });

  if (canceled) {
    return { success: false, canceled: true };
  }

  const filePath = filePaths[0];

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, path: filePath, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-directory-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (canceled) {
    return { canceled: true };
  }
  return { canceled: false, path: filePaths[0] };
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
    return null;
  }
});

ipcMain.handle('get-settings-content', async () => {
  const basePath = process.env.NODE_ENV === 'development' ? __dirname : path.join(app.getAppPath(), '.webpack/main');
  const filePath = path.join(basePath, 'settings-template.html');
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    return null;
  }
});

ipcMain.handle('get-file-content', async (event, relativePath) => {
  // Special handling for patch notes
  if (relativePath === 'others/patch-notes.html') {
    const userPatchNotesPath = path.join(app.getPath('userData'), 'patch-notes.html');
    try {
      // Always try to read the generated file from userData.
      // The generation now happens on startup if an update occurred.
      const content = await fs.readFile(userPatchNotesPath, 'utf-8');
      return content; // Return full HTML
    } catch (error) {
      // If it doesn't exist, it means it's the first run or something went wrong.
      // We'll let the post-update/first-run handler deal with creating it.
      // For now, return a helpful message.
      return '<html><body>Patch notes are being generated. Please restart the application or check back shortly.</body></html>';
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
  loadConfig();
  createWindow();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; font-src 'self';`,
        ],
      },
    });
  });

  // --- Auto-Updater Logic (User-Prompted Flow) ---

  autoUpdater.autoDownload = false;

  if (process.env.GITHUB_TOKEN) {
    autoUpdater.requestHeaders = { Authorization: `token ${process.env.GITHUB_TOKEN}` };
  }

  if (process.env.NODE_ENV === 'development') {
    autoUpdater.updateConfigPath = path.join(app.getAppPath(), 'dev-app-update.yml');
    autoUpdater.forceDevUpdateConfig = true;
  }

  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdates().catch((err) => {
      if (mainWindow) {
        mainWindow.webContents.send('update-status', 'error', { error: err.message });
      }
    });
  });

  // --- Auto-Updater Event Listeners ---
  autoUpdater.on('update-available', (info) => {
    // Persist the update info to a file so we can access it after the restart.
    const pendingUpdatePath = path.join(app.getPath('userData'), 'pending-update.json');
    fs.writeFile(pendingUpdatePath, JSON.stringify(info, null, 2))
      .catch(() => {}); // Intentionally swallowing error

    if (mainWindow) { // Ensure mainWindow exists before sending
      mainWindow.webContents.send('update-status', 'available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow) { // Ensure mainWindow exists before sending
      mainWindow.webContents.send('update-status', 'not-available', info);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) { // Ensure mainWindow exists before sending
      mainWindow.webContents.send('update-status', 'downloaded', info);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) { // Ensure mainWindow exists before sending
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow) { // Ensure mainWindow exists before sending
      mainWindow.webContents.send('update-status', 'error', { error: err.message });
    }
  });

  // --- IPC Listeners for UI Actions ---

  ipcMain.on('start-download', () => {
    // The patch notes generation will now happen after the app restarts.
    autoUpdater.downloadUpdate();
  });

  ipcMain.on('restart-app', () => {
    autoUpdater.quitAndInstall();
  });

  // --- Application Menu ---
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'Open Auto-Saves Folder', click: () => { shell.openPath(getAutoSavesDir()); } },
        { label: 'Open Manual Saves Folder', click: () => { shell.openPath(getManualSavesDir()); } },
        { label: 'Show Logs in Folder', click: () => { shell.openPath(app.getPath('userData')); } },
        { type: 'separator' },
        { role: 'quit' },
      ],
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
        { role: 'togglefullscreen' },
      ],
    },
  ];

  // Add Help menu only if not in production
  if (process.env.NODE_ENV !== 'production') {
    menuTemplate.push({
      label: 'Help',
      submenu: [
        { label: 'Learn More', click: async () => { await shell.openExternal('https://electronjs.org'); } },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  handlePostUpdateTasks();
});

ipcMain.handle('get-app-version', () => app.getVersion());

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

/**
 * Generates a file path for a given page ID.
 * E.g., 'L1-diagnostic-verbs' -> 'l1-diagnostic-verbs_state.json'
 * @param {string} pageId The unique ID of the page.
 * @returns {string} The full path for the save file.
 */
const getExerciseSavePathFromPageId = (pageId) => {
  const savesDir = getAutoSavesDir();
  // Sanitize the pageId to make it a safe filename.
  // This regex replaces any character that is not a letter, number, or hyphen with an underscore.
  const sanitizedFileName = pageId.replace(/[^a-z0-9-]/gi, '_').toLowerCase();
  return path.join(savesDir, `${sanitizedFileName}_state.json`);
};

ipcMain.handle('save-exercise-state', async (event, pageId, state) => {
  if (!pageId) {
    return { success: false, error: 'No pageId provided for saving state.' };
  }
  const savePath = getExerciseSavePathFromPageId(pageId);
  try {
    await fs.writeFile(savePath, JSON.stringify(state, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-exercise-state', async (event, pageId) => {
  if (!pageId) {
    return null;
  }
  const savePath = getExerciseSavePathFromPageId(pageId);
  try {
    const data = await fs.readFile(savePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // This is a normal case (no save file exists), not an error.
      return null;
    }
    return null; // Return null on other errors to prevent crashing.
  }
});

ipcMain.handle('reset-exercise-state', async (event, pageId) => {
  if (!pageId) {
    return { success: false, error: 'No pageId provided for resetting state.' };
  }
  const savePath = getExerciseSavePathFromPageId(pageId);
  try {
    if (fsSync.existsSync(savePath)) {
      await fs.unlink(savePath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('reset-all-auto-saves', async () => {
  const savesDir = getAutoSavesDir();
  try {
    // First, read the directory to count the files for the feedback message.
    const files = await fs.readdir(savesDir).catch((err) => {
      // If the directory doesn't exist, there are no files to delete.
      if (err.code === 'ENOENT') {
        return [];
      }
      // For other errors, re-throw to be caught by the outer catch block.
      throw err;
    });
    const count = files.length;

    if (count === 0) {
      return { success: true, count: 0 };
    }

    // Use fs.rm to recursively and forcefully delete the directory and its contents.
    await fs.rm(savesDir, { recursive: true, force: true });

    // Recreate the directory for future use.
    await fs.mkdir(savesDir, { recursive: true });

    return { success: true, count };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-save-dialog-and-save-file', async (event, { defaultFilename, data } = {}) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const savesDir = getManualSavesDir();

  // THE FIX IS HERE: The destructured argument now has a default value of an empty object.
  // This prevents a crash if the renderer calls the function with no arguments.
  const finalFilename = defaultFilename || 'exercise-save-state.json';

  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    defaultPath: path.join(savesDir, finalFilename),
    filters: [{ name: 'JSON Files', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }],
  });

  if (canceled) {
    return { success: false, canceled: true };
  }
  try {
    await fs.writeFile(filePath, data || '');
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
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
    return files.filter((file) => file.endsWith('.html')
        && file !== 'patch-notes-template.html'
        && file !== 'L - template.html'
        && file !== 'LAN - template.html'
        && file !== 'EX - template.html');
  } catch (err) {
    return [];
  }
};

ipcMain.handle('get-lessons', () => getContents('lessons'));
ipcMain.handle('get-exercises', () => getContents('exercises'));
ipcMain.handle('get-lessons-an', () => getContents('lessonsAN'));
ipcMain.handle('get-tests', () => getContents('others'));

ipcMain.handle('get-active-save-states', async () => {
  const savesDir = getAutoSavesDir();
  try {
    const files = await fs.readdir(savesDir);
    // Optional: Filter for only .json files if other files might be present
    return files.filter((file) => file.endsWith('.json'));
  } catch (err) {
    return []; // Return empty array on error
  }
});
