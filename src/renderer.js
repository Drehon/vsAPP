import './style.css';
import initializeTabManager from './sub-functions/tab-manager';
import { loadContentIntoTab, loadHomeIntoTab, loadSettingsIntoTab } from './sub-functions/content-loader';

window.addEventListener('api-ready', () => {
  // --- STATE MANAGEMENT ---
  const tabs = [];
  const nextTabId = 1;
  let activeTab = null;
  let mostRecentlyLoadedFile = null; // Variable to track the last loaded file

  // --- DOM ELEMENTS ---
  const tabBar = document.getElementById('tab-bar');
  const newTabBtn = document.getElementById('new-tab-btn');
  const contentPanes = document.getElementById('content-panes');
  const appVersionSpan = document.getElementById('app-version');
  const networkIndicator = document.getElementById('network-indicator');
  const networkLabel = document.getElementById('network-label');
  const updateIndicator = document.getElementById('update-indicator');
  const updateContainer = document.getElementById('update-label');

  const resetFeedbackMessage = document.getElementById('reset-feedback-message');

  // Global Toolbar Buttons
  const globalHomeBtn = document.getElementById('global-home-btn');
  const globalReloadBtn = document.getElementById('global-reload-btn');
  const globalSaveBtn = document.getElementById('global-save-btn');
  const globalLoadBtn = document.getElementById('global-load-btn');
  const globalResetBtn = document.getElementById('global-reset-btn');
  const globalGithubBtn = document.getElementById('global-github-btn');
  const globalSettingsBtn = document.getElementById('global-settings-btn');

  // --- UTILITY & SETUP FUNCTIONS ---

  function getActivePageId(tab) {
    // The pageId is now reliably stored on the tab object.
    return tab ? tab.pageId : null;
  }

  function debounce(func, delay) {
    let timeout;
    return function debouncedFunction(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  const autoSaveExerciseState = debounce(async (tab) => {
    // Directly use the reliable pageId from the tab object.
    if (tab && tab.pageId && tab.exerciseState) {
      try {
        await window.api.saveExerciseState(tab.pageId, tab.exerciseState);
      } catch (error) {
        // error handling
      }
    }
  }, 500);

  // --- FEEDBACK MESSAGE LOGIC ---
  // Store the timer ID in a closure to ensure only one feedback message runs at a time
  let feedbackTimer = null;

  function showFeedbackMessage(message, duration = 5000) {
    if (!resetFeedbackMessage) return;

    // Clear any existing feedback timeout
    clearTimeout(feedbackTimer);

    resetFeedbackMessage.textContent = message;
    resetFeedbackMessage.classList.remove('opacity-0');

    feedbackTimer = setTimeout(() => {
      resetFeedbackMessage.classList.add('opacity-0');

      // Use another timeout to clear the content after the transition ends
      feedbackTimer = setTimeout(() => {
        resetFeedbackMessage.innerHTML = '&nbsp;';
      }, 500); // This duration should match the CSS transition duration
    }, duration);
  }

  async function handleSaveButtonClick(tab) {
    const pageId = getActivePageId(tab);

    if (!tab || !pageId || !tab.exerciseState) {
      return;
    }
    const dataStr = JSON.stringify(tab.exerciseState, null, 2);

    // --- New file naming logic ---
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Use pageId for a more reliable default filename
    const defaultFilename = `${pageId}-save-${dateString}.json`;

    // --- End new file naming logic ---

    const result = await window.api.showSaveDialogAndSaveFile({
      defaultFilename,
      data: dataStr,
    });

    if (result.success) {
      // --- Show Feedback Message ---
      let objectName;
      const lessonMatch = tab.title.match(/^(L\d+)/);
      const [pageIdPrefix] = pageId.split('-');

      // Use pageId for more reliable feedback
      if (pageId.includes('student-verbs')) {
        objectName = 'Verbs';
      } else if (pageId.includes('student-grammar')) {
        objectName = 'Grammar';
      } else if (lessonMatch) {
        objectName = lessonMatch[1];
      } else {
        objectName = pageIdPrefix || 'File'; // Fallback
      }
      showFeedbackMessage(`Saved ${objectName}`);
      // --- End Feedback Message ---
    }
  }

  async function handleLoadButtonClick(tab) {
    if (!tab) return;

    const pageId = getActivePageId(tab);
    if (!pageId) {
      return;
    }

    const result = await window.api.showOpenDialogAndLoadFile();

    if (result.success && !result.canceled) {
      try {
        const loadedState = JSON.parse(result.data);
        // Basic validation to ensure the loaded file is a valid state object
        const isValidState = loadedState && typeof loadedState === 'object'
        && Object.keys(loadedState).length > 0;

        if (isValidState) {
          mostRecentlyLoadedFile = result.path; // Track the recently loaded file
          await window.api.saveExerciseState(pageId, loadedState); // Overwrite autosave
          handleLoadContent(tab.id, tab.filePath); // Reload content

          // --- Show Feedback Message ---
          let objectName;
          const lessonMatch = tab.title.match(/^(L\d+)/);
          const [pageIdPrefix] = pageId.split('-');

          if (pageId.includes('student-verbs')) {
            objectName = 'Verbs';
          } else if (pageId.includes('student-grammar')) {
            objectName = 'Grammar';
          } else if (lessonMatch) {
            objectName = lessonMatch[1];
          } else {
            objectName = pageIdPrefix || 'File'; // Fallback
          }
          showFeedbackMessage(`Loaded ${objectName}`);
          // --- End Feedback Message ---
        }
      } catch (e) {
        // error handling
      }
    }
  }

  async function handleSaveButtonClick(tab) {
    const pageId = getActivePageId(tab);

    if (!tab || !pageId || !tab.exerciseState) {
      return;
    }
    const dataStr = JSON.stringify(tab.exerciseState, null, 2);

    // --- New file naming logic ---
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Use pageId for a more reliable default filename
    const defaultFilename = `${pageId}-save-${dateString}.json`;

    // --- End new file naming logic ---

    const result = await window.api.showSaveDialogAndSaveFile({
      defaultFilename,
      data: dataStr,
    });

    if (result.success) {
      // --- Show Feedback Message ---
      let objectName;
      const lessonMatch = tab.title.match(/^(L\d+)/);
      const pageIdPrefix = pageId.split('-')[0];

      // Use pageId for more reliable feedback
      if (pageId.includes('student-verbs')) {
        objectName = 'Verbs';
      } else if (pageId.includes('student-grammar')) {
        objectName = 'Grammar';
      } else if (lessonMatch) {
        objectName = lessonMatch[1];
      } else {
        objectName = pageIdPrefix || 'File'; // Fallback
      }
      showFeedbackMessage(`Saved ${objectName}`);
      // --- End Feedback Message ---
    }
  }

  async function handleLoadButtonClick(tab) {
    if (!tab) return;

    const pageId = getActivePageId(tab);
    if (!pageId) {
      return;
    }

    const result = await window.api.showOpenDialogAndLoadFile();

    if (result.success && !result.canceled) {
      try {
        const loadedState = JSON.parse(result.data);
        // Basic validation to ensure the loaded file is a valid state object
        const isValidState = loadedState && typeof loadedState === 'object'
        && Object.keys(loadedState).length > 0;

        if (isValidState) {
          mostRecentlyLoadedFile = result.path; // Track the recently loaded file
          await window.api.saveExerciseState(pageId, loadedState); // Overwrite autosave
          handleLoadContent(tab.id, tab.filePath); // Reload content

          // --- Show Feedback Message ---
          let objectName;
          const lessonMatch = tab.title.match(/^(L\d+)/);
          const pageIdPrefix = pageId.split('-')[0];

          if (pageId.includes('student-verbs')) {
            objectName = 'Verbs';
          } else if (pageId.includes('student-grammar')) {
            objectName = 'Grammar';
          } else if (lessonMatch) {
            objectName = lessonMatch[1];
          } else {
            objectName = pageIdPrefix || 'File'; // Fallback
          }
          showFeedbackMessage(`Loaded ${objectName}`);
          // --- End Feedback Message ---
        }
      } catch (e) {
        // error handling
      }
    }
  }

  // --- HANDLERS for Content Loading ---
  function handleLoadHome(tabId) {
    loadHomeIntoTab(tabId, tabs, renderTabs, addTab, autoSaveExerciseState, updateGlobalToolbar);
  }

  function handleLoadContent(tabId, filePath, options) {
    loadContentIntoTab(
      tabId,
      filePath,
      tabs,
      renderTabs,
      addTab,
      autoSaveExerciseState,
      updateGlobalToolbar,
      options,
    );
  }

  function handleLoadSettings(tabId) {
    loadSettingsIntoTab(tabId, tabs, renderTabs, updateGlobalToolbar, mostRecentlyLoadedFile);
  }

  // --- WRAPPER FUNCTIONS for Tab Manager ---
  // These wrappers ensure the activeTab and toolbar are always updated
  async function addTab(setActive = true, filePath = null, type = 'home') {
    activeTab = await _addTab(setActive, filePath, type);
    updateGlobalToolbar(activeTab);
  }

  function updateGlobalToolbar(tab) {
    if (!tab) { // No active tab, disable everything
      [
        document.getElementById('global-home-btn'),
        document.getElementById('global-reload-btn'),
        document.getElementById('global-save-btn'),
        document.getElementById('global-load-btn'),
        document.getElementById('global-reset-btn'),
        document.getElementById('global-settings-btn'),
      ].forEach((btn) => {
        const button = btn;
        button.disabled = true;
      });
      return;
    }

    const isHome = tab.view === 'home';
    const isContent = tab.view === 'content';
    const isSettings = tab.view === 'settings';

    // Enable/Disable buttons based on view
    document.getElementById('global-home-btn').disabled = isHome;
    document.getElementById('global-settings-btn').disabled = isSettings;
    document.getElementById('global-save-btn').disabled = !isContent;
    document.getElementById('global-load-btn').disabled = !isContent;
    document.getElementById('global-reset-btn').disabled = !isContent;
    document.getElementById('global-reload-btn').disabled = false; // Always enabled
    document.getElementById('global-github-btn').disabled = false; // Always enabled

    // Update onclick listeners to point to the active tab's context
    document.getElementById('global-home-btn').onclick = () => !isHome && handleLoadHome(tab.id);
    document.getElementById('global-reload-btn').onclick = () => {
      if (isHome) handleLoadHome(tab.id);
      if (isContent) handleLoadContent(tab.id, tab.filePath);
      if (isSettings) handleLoadSettings(tab.id);
    };
    document.getElementById('global-settings-btn').onclick = () => !isSettings && addTab(true, null, 'settings');
    document.getElementById('global-github-btn').onclick = () => window.api.openExternalLink('https://github.com/Drehon/vsapp');

    // Specific listeners for content-related buttons
    document.getElementById('global-save-btn').onclick = isContent ? () => handleSaveButtonClick(tab) : null;
    document.getElementById('global-load-btn').onclick = isContent ? () => handleLoadButtonClick(tab) : null;
    document.getElementById('global-reset-btn').onclick = isContent ? async () => {
      const pageId = getActivePageId(tab);
      if (!pageId) {
        return;
      }

      // --- Capture View State Before Reset ---
      const pane = document.getElementById(`pane-${tab.id}`);
      let activePhaseId = null;
      let scrollTop = 0;

      if (pane) {
        // Find active phase
        const activeButton = pane.querySelector('.tab-btn.tab-active');
        if (activeButton) {
          activePhaseId = activeButton.id; // Store the full ID
        }
        // Find scroll position
        const scrollable = pane.querySelector('.lesson-content');
        if (scrollable) {
          scrollTop = scrollable.scrollTop;
        }
      }

      const result = await window.api.resetExerciseState(pageId);

      // --- Reload content with view state ---
      // We still need tab.filePath to reload the content source
      handleLoadContent(tab.id, tab.filePath, { activePhaseId, scrollTop });

      if (result.success) {
        showFeedbackMessage('Reset Complete');
      }
    } : null;
  }

  // --- CORE FUNCTIONS ---
  const {
    renderTabs, addTab: _addTab,
  } = initializeTabManager(
    tabs,
    nextTabId,
    tabBar,
    newTabBtn,
    contentPanes,
    handleLoadHome,
    handleLoadContent,
    handleLoadSettings,
  );

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
      default:
        break;
    }
  }

  function handleDownloadProgress(event, progressObj) {
    if (updateContainer) {
      updateContainer.innerText = `Downloading... (${Math.round(progressObj.percent)}%)`;
    }
  }

  // --- INITIALIZATION ---

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

    // Listen for custom feedback events from other parts of the renderer
    window.addEventListener('show-feedback', (e) => {
      if (e.detail && e.detail.message) {
        showFeedbackMessage(e.detail.message);
      }
    });

    await addTab(true); // Add initial home tab
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
});
