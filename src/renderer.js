import './style.css';
import { initializeTabManager } from './sub-functions/tab-manager.js';
import { loadContentIntoTab, loadHomeIntoTab, loadSettingsIntoTab } from './sub-functions/content-loader.js';

window.addEventListener('api-ready', () => {
  // --- STATE MANAGEMENT ---
  let tabs = [];
  let nextTabId = 1;
  let activeTab = null;

  // --- DOM ELEMENTS ---
  const tabBar = document.getElementById('tab-bar');
  const newTabBtn = document.getElementById('new-tab-btn');
  const contentPanes = document.getElementById('content-panes');
  const appVersionSpan = document.getElementById('app-version');
  const networkIndicator = document.getElementById('network-indicator');
  const networkLabel = document.getElementById('network-label');
  const updateIndicator = document.getElementById('update-indicator');
  const updateContainer = document.getElementById('update-label');
  
  // Global Toolbar Buttons
  const globalHomeBtn = document.getElementById('global-home-btn');
  const globalReloadBtn = document.getElementById('global-reload-btn');
  const globalSaveBtn = document.getElementById('global-save-btn');
  const globalLoadBtn = document.getElementById('global-load-btn');
  const globalResetBtn = document.getElementById('global-reset-btn');
  const globalGithubBtn = document.getElementById('global-github-btn');
  const globalSettingsBtn = document.getElementById('global-settings-btn');


  // --- CORE FUNCTIONS ---
  const { renderTabs, addTab: _addTab, switchTab: _switchTab, closeTab: _closeTab } = initializeTabManager(
    tabs,
    nextTabId,
    tabBar,
    newTabBtn,
    contentPanes,
    handleLoadHome,
    handleLoadContent,
    handleLoadSettings
  );

  // --- WRAPPER FUNCTIONS for Tab Manager ---
  // These wrappers ensure the activeTab and toolbar are always updated
  async function addTab(setActive = true, filePath = null, type = 'home') {
    activeTab = await _addTab(setActive, filePath, type);
    updateGlobalToolbar(activeTab);
  }

  async function switchTab(tabId) {
    activeTab = await _switchTab(tabId);
    updateGlobalToolbar(activeTab);
  }

  async function closeTab(tabId) {
    activeTab = await _closeTab(tabId);
    updateGlobalToolbar(activeTab);
  }

  // --- HANDLERS for Content Loading ---
  function handleLoadHome(tabId, ...args) {
    loadHomeIntoTab(tabId, tabs, renderTabs, addTab, autoSaveExerciseState);
  }

  function handleLoadContent(tabId, filePath, ...args) {
    loadContentIntoTab(tabId, filePath, tabs, renderTabs, addTab, autoSaveExerciseState);
  }
  
  function handleLoadSettings(tabId, ...args) {
    loadSettingsIntoTab(tabId, tabs, renderTabs);
  }

  // --- GLOBAL TOOLBAR LOGIC ---
  function updateGlobalToolbar(tab) {
    if (!tab) { // No active tab, disable everything
      [globalHomeBtn, globalReloadBtn, globalSaveBtn, globalLoadBtn, globalResetBtn, globalSettingsBtn].forEach(btn => btn.disabled = true);
      return;
    }
    
    const isHome = tab.view === 'home';
    const isContent = tab.view === 'content';
    const isSettings = tab.view === 'settings';

    // Enable/Disable buttons based on view
    globalHomeBtn.disabled = isHome;
    globalSettingsBtn.disabled = isSettings;
    globalSaveBtn.disabled = !isContent;
    globalLoadBtn.disabled = !isContent;
    globalResetBtn.disabled = !isContent;
    globalReloadBtn.disabled = false; // Always enabled
    globalGithubBtn.disabled = false; // Always enabled

    // Update onclick listeners to point to the active tab's context
    globalHomeBtn.onclick = () => !isHome && handleLoadHome(tab.id);
    globalReloadBtn.onclick = () => {
      if (isHome) handleLoadHome(tab.id);
      if (isContent) handleLoadContent(tab.id, tab.filePath);
      if (isSettings) handleLoadSettings(tab.id);
    };
    globalSettingsBtn.onclick = () => !isSettings && addTab(true, null, 'settings');
    globalGithubBtn.onclick = () => window.api.openExternalLink('https://github.com/Drehon/vsapp');

    // Specific listeners for content-related buttons
    globalSaveBtn.onclick = isContent ? () => handleSaveButtonClick(tab) : null;
    globalLoadBtn.onclick = isContent ? () => handleLoadButtonClick(tab) : null;
    globalResetBtn.onclick = isContent ? async () => {
      await window.api.resetExerciseState(tab.filePath);
      handleLoadContent(tab.id, tab.filePath);
    } : null;
  }

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

  async function handleSaveButtonClick(tab) {
    if (!tab || !tab.filePath || !tab.exerciseState) {
      console.error('No active exercise tab or state to save.');
      return;
    }
    const dataStr = JSON.stringify(tab.exerciseState, null, 2);
    const defaultFilename = `${tab.title}-manual-progress.json`;
    const result = await window.api.showSaveDialogAndSaveFile({
        defaultFilename: defaultFilename,
        data: dataStr
    });
    if (result.success) {
        console.log(`Manually saved progress to: ${result.path}`);
    } else if (!result.canceled) {
        console.error('Failed to manually save progress:', result.error);
    }
  }

  async function handleLoadButtonClick(tab) {
    if (!tab) return;
    const result = await window.api.showOpenDialogAndLoadFile();
  
    if (result.success && !result.canceled) {
      try {
        const loadedState = JSON.parse(result.data);
        // Basic validation to ensure the loaded file is a valid state object
        const isValidState = loadedState && typeof loadedState === 'object' && Object.keys(loadedState).length > 0;

        if (isValidState && tab.filePath) {
          await window.api.saveExerciseState(tab.filePath, loadedState); // Overwrite autosave with this state
          handleLoadContent(tab.id, tab.filePath); // Reload content to apply the new state
          console.log('Successfully loaded and applied state from', result.path);
        } else if (!tab.filePath) {
          console.error('No active exercise tab to load the state into.');
        } else {
          console.error('Loaded file does not appear to be a valid progress file.');
          // Optionally, inform the user via a UI element
        }
      } catch (e) {
        console.error('Failed to parse or apply loaded file:', e);
      }
    } else if (result.canceled) {
      console.log('File load canceled.');
    } else if (result.error) {
      console.error('Failed to load file:', result.error);
    }
  }

  // --- INITIALIZATION ---

  const autoSaveExerciseState = debounce(async (tab, force = false) => {
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

    window.api.onUpdateStatus(handleUpdateStatus);
    window.api.onDownloadProgress(handleDownloadProgress);

    await addTab(true); // Add initial home tab
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
});
