// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');
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
  getLessons: () => ipcRenderer.invoke('get-lessons'),
  getExercises: () => ipcRenderer.invoke('get-exercises'),

  // Funzioni per il sistema di salvataggio
  saveProgress: (lesson, data) => ipcRenderer.invoke('save-progress', { lesson, data }),
  loadProgress: (lesson) => ipcRenderer.invoke('load-progress', lesson),
  getLessonData: (filePath) => ipcRenderer.invoke('get-lesson-data', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
