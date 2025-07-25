const { app, BrowserWindow, ipcMain, session } = require('electron');
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

// Save/Load Handlers
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
