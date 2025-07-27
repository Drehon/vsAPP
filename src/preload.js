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
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
};

// Inform the renderer that the API is ready
window.dispatchEvent(new Event('api-ready'));
