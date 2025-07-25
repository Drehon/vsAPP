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
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      // ATTENZIONE: nodeIntegration deve essere false e contextIsolation deve essere true
      // per motivi di sicurezza. Usiamo il preload script per esporre le API.
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Apri i DevTools in sviluppo.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// Questo listener riceve il messaggio 'navigate' dal preload script.
ipcMain.on('navigate', (event, relativePath) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const filePath = path.join(app.getAppPath(), relativePath);
    win.loadFile(filePath);
  }
});

// Aggiungiamo un handler per rispondere alla richiesta del path dell'applicazione.
ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  // Creiamo la cartella dei salvataggi se non esiste.
  const savesDir = path.join(app.getPath('userData'), 'saves');
  if (!fs.existsSync(savesDir)) {
    fs.mkdirSync(savesDir, { recursive: true });
  }
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();

  // Set the Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;";
    const cspWithEval = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          process.env.NODE_ENV === 'development' ? cspWithEval : csp
        ]
      }
    });
  });
});

ipcMain.handle('get-app-version', (event) => {
  return app.getVersion();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// Handler per salvare i progressi
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
    console.error('Errore nel salvataggio dei progressi:', err);
    return { success: false, error: err.message };
  }
});

// Handler per elencare i salvataggi
ipcMain.handle('load-progress', async (event, lesson) => {
  const savesDir = path.join(app.getPath('userData'), 'saves');
  const lessonName = path.basename(lesson, '.html');

  try {
    const files = await fs.promises.readdir(savesDir);
    const lessonSaves = files.filter(file => file.startsWith(lessonName) && file.endsWith('.json'));
    return lessonSaves.map(file => ({
      name: file,
      path: path.join(savesDir, file)
    }));
  } catch (err) {
    console.error('Errore nel caricamento dei salvataggi:', err);
    return [];
  }
});

// Handler per ottenere i dati di un salvataggio
ipcMain.handle('get-lesson-data', async (event, filePath) => {
  try {
    // Per sicurezza, controlliamo che il percorso sia all'interno della cartella dei salvataggi
    const savesDir = path.join(app.getPath('userData'), 'saves');
    if (!filePath.startsWith(savesDir)) {
      throw new Error('Accesso non autorizzato al file.');
    }
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Errore nella lettura del file di salvataggio:', err);
    return null;
  }
});

// Funzione per ottenere i contenuti di una directory
const getContents = async (dir) => {
  // in production, the app path is /path/to/app.asar, so we need to go up one level
    const basePath = process.env.NODE_ENV === 'development'
        ? app.getAppPath()
        : path.dirname(app.getPath('exe'));

  const directoryPath = path.join(basePath, dir);
  try {
    const files = await fs.promises.readdir(directoryPath);
    return files.filter(file => file.endsWith('.html'));
  } catch (err) {
    console.error(`Errore nella lettura della directory ${dir}:`, err);
    return [];
  }
};

// Esposizione delle funzioni per ottenere lezioni ed esercizi
ipcMain.handle('get-lessons', () => getContents('lessons'));
ipcMain.handle('get-exercises', () => getContents('exercises'));
