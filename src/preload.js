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
  getLessonsAN: () => ipcRenderer.invoke('get-lessons-an'),
  getTests: () => ipcRenderer.invoke('get-tests'),
  saveExerciseState: (pageId, state) => ipcRenderer.invoke('save-exercise-state', pageId, state),
  loadExerciseState: (pageId) => ipcRenderer.invoke('load-exercise-state', pageId),
  resetExerciseState: (pageId) => ipcRenderer.invoke('reset-exercise-state', pageId),
  resetAllAutoSaves: () => ipcRenderer.invoke('reset-all-auto-saves'),
  showSaveDialogAndSaveFile: (options) => ipcRenderer.invoke('show-save-dialog-and-save-file', options),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),

  // ADDED: Expose the showOpenDialogAndLoadFile handler
  showOpenDialogAndLoadFile: () => ipcRenderer.invoke('show-open-dialog-and-load-file'),
  getPatchNotes: () => ipcRenderer.invoke('get-patch-notes'),
  getActiveSaveStates: () => ipcRenderer.invoke('get-active-save-states'),
};

// Signal that the preload script has finished and the API is ready
window.addEventListener('DOMContentLoaded', () => {
  window.dispatchEvent(new Event('api-ready'));
});
