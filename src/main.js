const { app, BrowserWindow, ipcMain } = require('electron');
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
      // ATTENZIONE: nodeIntegration deve essere false e contextIsolation deve essere true
      // per motivi di sicurezza. Usiamo il preload script per esporre le API.
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Carica il file index.html (la nostra schermata Home).
  // VITE_DEV_SERVER_URL è una variabile speciale per l'ambiente di sviluppo.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

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
