const { ipcRenderer } = require('electron');

// With contextIsolation: false, we can directly attach to the window object.
// This is less secure but matches the requested configuration.
window.api = {
  // From main to renderer
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),

  // From renderer to main
  startDownload: () => ipcRenderer.send('start-download'),
  restartApp: () => ipcRenderer.send('restart-app'),
  
  // Existing APIs
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  navigate: (relativePath) => ipcRenderer.send('navigate', relativePath),
  navigateHome: () => ipcRenderer.send('navigate-home'),
  getFileContent: (relativePath) => ipcRenderer.invoke('get-file-content', relativePath),
  getHomeContent: () => ipcRenderer.invoke('get-home-content'),
  getSettingsContent: () => ipcRenderer.invoke('get-settings-content'),
  openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
  getLessons: () => ipcRenderer.invoke('get-lessons'),
  getExercises: () => ipcRenderer.invoke('get-exercises'),
  saveExerciseState: (filePath, state) => ipcRenderer.invoke('save-exercise-state', filePath, state),
  loadExerciseState: (filePath) => ipcRenderer.invoke('load-exercise-state', filePath),
  resetExerciseState: (filePath) => ipcRenderer.invoke('reset-exercise-state', filePath),
  showSaveDialogAndSaveFile: (options) => ipcRenderer.invoke('show-save-dialog-and-save-file', options),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),
  
  // ADDED: Expose the showOpenDialogAndLoadFile handler
  showOpenDialogAndLoadFile: () => ipcRenderer.invoke('show-open-dialog-and-load-file')
};

// Signal that the preload script has finished and the API is ready
window.addEventListener('DOMContentLoaded', () => {
    window.dispatchEvent(new Event('api-ready'));
});
