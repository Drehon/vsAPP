const { ipcRenderer } = require('electron');

window.api = {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  navigateTo: (relativePath) => {
    ipcRenderer.send('navigate', relativePath);
  },
  navigateHome: () => {
    ipcRenderer.send('navigate-home');
  },
  getHomeContent: () => ipcRenderer.invoke('get-home-content'),
  getFileContent: (filePath) => ipcRenderer.invoke('get-file-content', filePath),
  getLessons: () => ipcRenderer.invoke('get-lessons'),
  getExercises: () => ipcRenderer.invoke('get-exercises'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Save/Load
  saveExerciseState: (filePath, state) => ipcRenderer.invoke('save-exercise-state', filePath, state),
  loadExerciseState: (filePath) => ipcRenderer.invoke('load-exercise-state', filePath),
  resetExerciseState: (filePath) => ipcRenderer.invoke('reset-exercise-state', filePath),
  showSaveDialogAndSaveFile: (defaultFilename, data) => ipcRenderer.invoke('show-save-dialog-and-save-file', { defaultFilename, data }),
  
  // External Links
  openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
  
  // Settings
  getSettingsContent: () => ipcRenderer.invoke('get-settings-content'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),

  // Update Notification System
  // Exposes a listener for 'update-available' IPC messages from the main process.
  // The callback function will be executed when an update is available.
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onUpdateCheckError: (callback) => ipcRenderer.on('update-check-error', callback),
};

window.addEventListener('DOMContentLoaded', () => {
  window.dispatchEvent(new Event('api-ready'));
});
