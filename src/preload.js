// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer, app } = require('electron');
const fs = require('fs').promises; // Usa la versione basata su Promise di fs
const path = require('path');

contextBridge.exposeInMainWorld('api', {
  /**
   * Richiede il percorso di base dell'applicazione al processo main.
   * @returns {Promise<string>} Il percorso di base dell'app.
   */
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  /**
   * Naviga la finestra principale al file HTML specificato.
   * @param {string} relativePath - Il percorso relativo del file HTML.
   */
  navigateTo: (relativePath) => {
    ipcRenderer.send('navigate', relativePath);
  },

  /**
   * Legge i nomi dei file da una specifica directory ('lessons' o 'exercises').
   * @param {string} dir - La directory da cui leggere i file.
   * @returns {Promise<string[]>} Una lista di nomi di file HTML.
   */
  getFiles: async (dir) => {
    try {
      // Ottiene il percorso di base dell'app dal processo main
      const appPath = await ipcRenderer.invoke('get-app-path');
      const directoryPath = path.join(appPath, dir);
      
      const files = await fs.readdir(directoryPath);
      // Filtra per i file .html
      return files.filter(file => file.endsWith('.html'));
    } catch (err) {
      console.error(`Errore nel leggere la cartella ${dir}:`, err);
      return []; // Restituisce un array vuoto in caso di errore
    }
  }
});
