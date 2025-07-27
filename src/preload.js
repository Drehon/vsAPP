const { ipcRenderer } = require('electron');

// With contextIsolation disabled, we attach the API directly to the window object.
// This is less secure but is required by the project's build tooling.
window.api = {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  navigateTo: (relativePath) => {
    ipcRenderer.send('navigate', relativePath);
  },
  // Function to navigate back to the main index page
  navigateHome: () => {
    ipcRenderer.send('navigate-home');
  },
  getHomeContent: () => ipcRenderer.invoke('get-home-content'),
  getFileContent: (filePath) => ipcRenderer.invoke('get-file-content', filePath),
  getLessons: () => ipcRenderer.invoke('get-lessons'),
  getExercises: () => ipcRenderer.invoke('get-exercises'),
  saveProgress: (lesson, data) => ipcRenderer.invoke('save-progress', { lesson, data }),
  loadProgress: (lesson) => ipcRenderer.invoke('load-progress', lesson),
  getLessonData: (filePath) => ipcRenderer.invoke('get-lesson-data', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // New IPC handlers for exercise state persistence (Part 3)
  saveExerciseState: (filePath, state) => ipcRenderer.invoke('save-exercise-state', filePath, state),
  loadExerciseState: (filePath) => ipcRenderer.invoke('load-exercise-state', filePath),
  resetExerciseState: (filePath) => ipcRenderer.invoke('reset-exercise-state', filePath),

  // New IPC handler to open the saves folder (for auto-saved states)
  openSavesFolder: () => ipcRenderer.invoke('open-saves-folder'),

  // New IPC handler to show a save dialog and save a file (for manual saves)
  showSaveDialogAndSaveFile: (defaultFilename, data) => ipcRenderer.invoke('show-save-dialog-and-save-file', { defaultFilename, data })
};

// Inform the renderer that the API is ready
window.addEventListener('DOMContentLoaded', () => {
  window.dispatchEvent(new Event('api-ready'));
});
