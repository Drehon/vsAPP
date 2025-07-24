// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Definisce un percorso sicuro per la cartella dei contenuti.
// Questo assicura che funzioni sia in sviluppo che nell'app pacchettizzata.
const contentBasePath = process.resourcesPath;

contextBridge.exposeInMainWorld('api', {
  /**
   * Naviga la finestra principale al file HTML specificato.
   * @param {string} relativePath - Il percorso relativo del file HTML (es. 'exercises/L1.html')
   */
  navigateTo: (relativePath) => {
    ipcRenderer.send('navigate', relativePath);
  },

  /**
   * Legge i nomi dei file da una specifica cartella di contenuti (lessons o exercises).
   * @param {string} dir - Il nome della cartella ('lessons' o 'exercises')
   * @returns {Promise<string[]>} Una lista di nomi di file.
   */
  getFiles: (dir) => {
    return new Promise((resolve, reject) => {
      // Costruisce il percorso completo alla cartella dei contenuti
      const directoryPath = path.join(contentBasePath, 'app', dir);
      
      // Legge il contenuto della cartella
      fs.readdir(directoryPath, (err, files) => {
        if (err) {
          // Se la cartella non esiste o c'è un errore, restituisce un array vuoto
          // invece di mandare in crash l'app.
          console.error(`Errore nel leggere la cartella ${directoryPath}:`, err);
          resolve([]); 
          return;
        }
        // Filtra per tenere solo i file .html
        const htmlFiles = files.filter(file => file.endsWith('.html'));
        resolve(htmlFiles);
      });
    });
  }
});
