const { app, BrowserWindow, ipcMain, session, Menu, shell, dialog } = require('electron'); // Added dialog
const path = require('path');
const fs = require('fs');

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
      preload: path.join(__dirname, 'preload.js'),
      // REQUIRED FOR THIS TEMPLATE: Insecure settings to match build tools.
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools in development.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// This listener receives the 'navigate' message from the preload script.
ipcMain.on('navigate', (event, relativePath) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const basePath = process.env.NODE_ENV === 'development'
      ? process.cwd()
      : app.getAppPath();
    const filePath = path.join(basePath, relativePath);
    win.loadFile(filePath);
  }
});

ipcMain.handle('get-home-content', async () => {
  const basePath = process.env.NODE_ENV === 'development'
    ? __dirname
    : path.join(app.getAppPath(), 'src'); // In packaged app, files are in 'src'
  const filePath = path.join(basePath, 'home-template.html');
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
  } catch (err) {
    console.error(`Failed to read home template: ${err}`);
    return null;
  }
});

// MODIFIED: This handler now extracts only the content within the <body> tag.
ipcMain.handle('get-file-content', async (event, relativePath) => {
  const basePath = process.env.NODE_ENV === 'development'
    ? process.cwd() // In dev, CWD is the project root
    : app.getAppPath();
  const filePath = path.join(basePath, relativePath);
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    // Use a regular expression to find the content inside the <body> tag.
    const bodyContentMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    // If a match is found, return the captured group; otherwise, return the full content as a fallback.
    return bodyContentMatch ? bodyContentMatch[1] : content;
  } catch (err) {
    console.error(`Failed to read file content for ${relativePath}: ${err}`);
    return null;
  }
});


// NEW: Handler to navigate back to the main window
ipcMain.on('navigate-home', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }
});


app.on('ready', () => {
  const savesDir = path.join(app.getPath('userData'), 'saves');
  if (!fs.existsSync(savesDir)) {
    fs.mkdirSync(savesDir, { recursive: true });
  }
  createWindow();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;`
        ]
      }
    });
  });

  // Define the application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Save States Folder',
          click: () => {
            shell.openPath(savesDir); // Open the saves directory for auto-saved states
          }
        },
        {
          label: 'Open Manual Saves Folder', // New menu item for manual saves
          click: () => {
            // If manual saves are directed to 'savesDir', this will open the same folder.
            // If they are to be in a different default location (e.g., Downloads),
            // this path would need to be adjusted accordingly.
            shell.openPath(savesDir);
          }
        },
        { type: 'separator' },
        { role: 'quit' } // Standard quit menu item
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
            const { shell } = require('electron');
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

// Save/Load Handlers (Existing)
ipcMain.handle('save-progress', async (event, { lesson, data }) => {
  const savesDir = path.join(app.getPath('userData'), 'saves');
  const lessonName = path.basename(lesson, '.html');
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `${lessonName}-${timestamp}.json`;
  const filePath = path.join(savesDir, filename);
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-progress', async (event, lesson) => {
  const savesDir = path.join(app.getPath('userData'), 'saves');
  const lessonName = path.basename(lesson, '.html');
  try {
    const files = await fs.promises.readdir(savesDir);
    const lessonSaves = files.filter(file => file.startsWith(lessonName) && file.endsWith('.json'));
    return lessonSaves.map(file => ({ name: file, path: path.join(savesDir, file) }));
  } catch (err) {
    return [];
  }
});

ipcMain.handle('get-lesson-data', async (event, filePath) => {
  try {
    const savesDir = path.join(app.getPath('userData'), 'saves');
    if (!filePath.startsWith(savesDir)) {
      throw new Error('Unauthorized file access.');
    }
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
});

const getContents = async (dir) => {
  const basePath = process.env.NODE_ENV === 'development'
    ? process.cwd()
    : app.getAppPath();

  const directoryPath = path.join(basePath, dir);
  try {
    const files = await fs.promises.readdir(directoryPath);
    return files.filter(file => file.endsWith('.html'));
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
    return [];
  }
};

ipcMain.handle('get-lessons', () => getContents('lessons'));
ipcMain.handle('get-exercises', () => getContents('exercises'));

// Helper function to get a sanitized save path for an exercise
const getExerciseSavePath = (exerciseFilePath) => {
  const savesDir = path.join(app.getPath('userData'), 'saves');
  // Sanitize the file path to create a valid filename
  // Replace slashes and colons with hyphens, remove file extension
  const sanitizedFileName = exerciseFilePath
    .replace(/[\\/:]/g, '-')
    .replace(/\.html$/, '')
    .toLowerCase();
  return path.join(savesDir, `${sanitizedFileName}_state.json`);
};

// NEW: IPC handler to save exercise state (auto-save)
ipcMain.handle('save-exercise-state', async (event, filePath, state) => {
  const savePath = getExerciseSavePath(filePath);
  try {
    await fs.promises.writeFile(savePath, JSON.stringify(state, null, 2));
    console.log(`Exercise state saved for ${filePath} to ${savePath}`);
    return { success: true };
  } catch (err) {
    console.error(`Failed to save exercise state for ${filePath}: ${err}`);
    return { success: false, error: err.message };
  }
});

// NEW: IPC handler to load exercise state (auto-load)
ipcMain.handle('load-exercise-state', async (event, filePath) => {
  const savePath = getExerciseSavePath(filePath);
  try {
    const data = await fs.promises.readFile(savePath, 'utf-8');
    console.log(`Exercise state loaded for ${filePath} from ${savePath}`);
    return JSON.parse(data);
  } catch (err) {
    // If file doesn't exist, it's not an error, just means no saved state
    if (err.code === 'ENOENT') {
      console.log(`No saved state found for ${filePath}`);
      return null;
    }
    console.error(`Failed to load exercise state for ${filePath}: ${err}`);
    return null;
  }
});

// NEW: IPC handler to reset (delete) exercise state
ipcMain.handle('reset-exercise-state', async (event, filePath) => {
  const savePath = getExerciseSavePath(filePath);
  try {
    if (fs.existsSync(savePath)) {
      await fs.promises.unlink(savePath);
      console.log(`Exercise state reset (deleted) for ${filePath} at ${savePath}`);
      return { success: true };
    }
    console.log(`No saved state file to reset for ${filePath}`);
    return { success: true, message: 'No file to delete' }; // Already reset or never existed
  } catch (err) {
    console.error(`Failed to reset exercise state for ${filePath}: ${err}`);
    return { success: false, error: err.message };
  }
});

// NEW: IPC handler to open the saves folder (for auto-saved states)
ipcMain.handle('open-saves-folder', async () => {
  const savesDir = path.join(app.getPath('userData'), 'saves');
  try {
    await shell.openPath(savesDir);
    return { success: true };
  } catch (err) {
    console.error(`Failed to open saves folder: ${err}`);
    return { success: false, error: err.message };
  }
});

// NEW: IPC handler to show a save dialog and save a file (for manual saves)
ipcMain.handle('show-save-dialog-and-save-file', async (event, { defaultFilename, data }) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const savesDir = path.join(app.getPath('userData'), 'saves'); // Default to the app's saves directory

  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    defaultPath: path.join(savesDir, defaultFilename),
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (canceled) {
    return { success: false, canceled: true };
  } else {
    try {
      await fs.promises.writeFile(filePath, data);
      return { success: true, path: filePath };
    } catch (err) {
      console.error(`Failed to save file via dialog: ${err}`);
      return { success: false, error: err.message };
    }
  }
});
