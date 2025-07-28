import './style.css';
import { initializeTabManager } from './sub-functions/tab-manager.js';
import { loadContentIntoTab, loadHomeIntoTab, loadSettingsIntoTab } from './sub-functions/content-loader.js';

window.addEventListener('api-ready', () => {
  // --- STATE MANAGEMENT ---
  let tabs = [];
  let nextTabId = 1;

  // --- DOM ELEMENTS ---
  const tabBar = document.getElementById('tab-bar');
  const newTabBtn = document.getElementById('new-tab-btn');
  const contentPanes = document.getElementById('content-panes');
  const appVersionSpan = document.getElementById('app-version');
  const networkIndicator = document.getElementById('network-indicator');
  const networkLabel = document.getElementById('network-label');
  const updateIndicator = document.getElementById('update-indicator');
  const updateContainer = document.getElementById('update-label'); 
  // const loadSaveBtn = document.getElementById('load-save-btn'); // Removed reference to the old Load button
  // NEW: Reference to the 'Carica' button with id="load-btn-1"
  let loadBtn1 = null; // Initialize as null, will be assigned when content loads

  // --- CORE FUNCTIONS ---
  const { addTab, switchTab, closeTab, renderTabs } = initializeTabManager(
    tabs,
    nextTabId,
    tabBar,
    newTabBtn,
    contentPanes,
    (tabId) => loadHomeIntoTab(tabId, tabs, renderTabs, addTab, saveExerciseState),
    (tabId, filePath) => loadContentIntoTab(tabId, filePath, tabs, renderTabs, addTab, saveExerciseState, setupLoadButton), // Pass setupLoadButton
    (tabId) => loadSettingsIntoTab(tabId, tabs, renderTabs)
  );

  // --- UTILITY & SETUP FUNCTIONS ---
  
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  async function displayAppVersion() {
    const version = await window.api.getAppVersion();
    if (appVersionSpan) appVersionSpan.innerText = version;
  }

  function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    if (networkIndicator) {
      networkIndicator.classList.toggle('bg-green-500', isOnline);
      networkIndicator.classList.toggle('bg-red-500', !isOnline);
    }
    if (networkLabel) networkLabel.innerText = isOnline ? 'Online' : 'Offline';
  }

  // --- UPDATE UI LOGIC ---

  function setInitialUpdateStatus() {
    if (updateIndicator) {
        updateIndicator.className = 'w-3 h-3 bg-gray-400 rounded-full mr-2 animate-pulse';
    }
    if (updateContainer) {
        updateContainer.innerText = 'Checking for updates...';
    }
  }

  function handleUpdateStatus(event, status, info) {
    if (!updateIndicator || !updateContainer) return;

    switch (status) {
      case 'available':
        updateIndicator.className = 'w-3 h-3 bg-blue-500 rounded-full mr-2';
        updateContainer.innerHTML = `
          <span class="mr-2">Update ${info.version} available.</span>
          <button id="download-btn" class="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">Download</button>
          <button id="later-btn" class="ml-1 px-2 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs">Later</button>
        `;
        document.getElementById('download-btn').addEventListener('click', () => {
          window.api.startDownload();
          updateIndicator.className = 'w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse';
          updateContainer.innerText = 'Downloading... (0%)';
        });
        document.getElementById('later-btn').addEventListener('click', () => {
          updateIndicator.className = 'w-3 h-3 bg-green-500 rounded-full mr-2';
          updateContainer.innerText = 'Up to date';
        });
        break;

      case 'not-available':
        updateIndicator.className = 'w-3 h-3 bg-green-500 rounded-full mr-2';
        updateContainer.innerText = 'Up to date';
        break;

      case 'downloaded':
        updateIndicator.className = 'w-3 h-3 bg-green-500 rounded-full mr-2';
        updateContainer.innerHTML = `
          <span class="mr-2">Update ready to install.</span>
          <button id="restart-btn" class="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">Restart Now</button>
        `;
        document.getElementById('restart-btn').addEventListener('click', () => {
          window.api.restartApp();
        });
        break;

      case 'error':
        updateIndicator.className = 'w-3 h-3 bg-red-500 rounded-full mr-2';
        updateContainer.innerText = 'Update failed';
        break;
    }
  }
  
  function handleDownloadProgress(event, progressObj) {
      if (updateContainer) {
          updateContainer.innerText = `Downloading... (${Math.round(progressObj.percent)}%)`;
      }
  }

  // NEW: Function to set up the load button listener
  function setupLoadButton(contentPaneElement) {
    // Look for the load button within the specific content pane
    loadBtn1 = contentPaneElement.querySelector('#load-btn-1'); 
    if (loadBtn1) {
      // Remove any existing listener to prevent duplicates if content is reloaded
      loadBtn1.removeEventListener('click', handleLoadButtonClick); 
      loadBtn1.addEventListener('click', handleLoadButtonClick);
      console.log('Load button #load-btn-1 found and event listener attached.');
    } else {
      console.log('Load button #load-btn-1 not found in the current content pane.');
    }
  }

  // NEW: Handler for the load button click
  async function handleLoadButtonClick() {
    console.log('Load button #load-btn-1 clicked.'); // Debug log
    const result = await window.api.showOpenDialogAndLoadFile();
    if (result.success && !result.canceled) {
      console.log('File loaded successfully:', result.path);
      console.log('Loaded data:', result.data);
      // TODO: Implement logic to apply the loaded data to the current exercise state
      // This will depend on how your exercise state is structured and managed across tabs.
      // For now, it just logs the data.
    } else if (result.canceled) {
      console.log('File load canceled.');
    } else {
      console.error('Failed to load file:', result.error);
    }
  }

  // --- INITIALIZATION ---

  const saveExerciseState = debounce(async (tab) => {
    if (tab && tab.filePath && tab.exerciseState) {
      try {
        await window.api.saveExerciseState(tab.filePath, tab.exerciseState);
        console.log(`Autosaved progress for ${tab.filePath}`);
      } catch (error) {
        console.error(`Failed to autosave progress for ${tab.filePath}:`, error);
      }
    }
  }, 500);

  async function initializeApp() {
    displayAppVersion();
    updateNetworkStatus();
    setInitialUpdateStatus();

    if (newTabBtn) {
        newTabBtn.addEventListener('click', () => addTab(true));
    }
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for all update status messages from the main process
    window.api.onUpdateStatus(handleUpdateStatus);
    window.api.onDownloadProgress(handleDownloadProgress);

    // No longer attach listener here directly to loadSaveBtn as it's removed/replaced
    // The setupLoadButton will be called when new content is loaded into a tab.

    await addTab(true); // Add initial home tab
    // After adding the initial tab, if it contains a load button, set it up.
    // This assumes the home tab might contain load-btn-1, or that setupLoadButton
    // will be called when other content (like exercises) is loaded.
    // The loadContentIntoTab function now takes setupLoadButton as an argument.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
});
