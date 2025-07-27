import './style.css';
import { initializeTabManager } from './sub-functions/tab-manager.js';
import { loadContentIntoTab, loadHomeIntoTab, loadSettingsIntoTab } from './sub-functions/content-loader.js';
// The following imports are for exercise initialization, but the actual initialization
// is now handled within content-loader.js based on the file path.
// import { initializeExercise } from './sub-functions/exercise-initializer.js';
// import { initializeGrammarExercise } from './sub-functions/grammar-exercise.js';
// import { initializeVerbsExercise } from './sub-functions/verb-exercise.js';

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
  // New: Update notification badge - now expected in the footer
  const updateNotificationBadge = document.getElementById('update-notification-badge');


  // --- CORE FUNCTIONS ---
  const { addTab, switchTab, closeTab, renderTabs } = initializeTabManager(
    tabs,
    nextTabId,
    tabBar,
    newTabBtn,
    contentPanes,
    // Callbacks for loading content into tabs, passed to tab-manager
    (tabId) => loadHomeIntoTab(tabId, tabs, renderTabs, addTab, saveExerciseState),
    (tabId, filePath) => loadContentIntoTab(tabId, filePath, tabs, renderTabs, addTab, saveExerciseState),
    (tabId) => loadSettingsIntoTab(tabId, tabs, renderTabs)
  );

  // --- UTILITY & SETUP FUNCTIONS ---
  
  /**
   * Debounce function to limit the rate at which a function gets called.
   * @param {Function} func - The function to debounce.
   * @param {number} delay - The debounce delay in milliseconds.
   * @returns {Function} The debounced function.
   */
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  /**
   * Displays the application version in the footer.
   */
  async function displayAppVersion() {
    const version = await window.api.getAppVersion();
    if (appVersionSpan) appVersionSpan.innerText = version;
  }

  /**
   * Updates the network status indicator.
   */
  function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    if (networkIndicator) {
      networkIndicator.classList.toggle('bg-green-500', isOnline);
      networkIndicator.classList.toggle('bg-red-500', !isOnline);
    }
    if (networkLabel) networkLabel.innerText = isOnline ? 'Online' : 'Offline';
  }

  /**
   * Shows the update notification badge and makes it visible.
   */
  function showUpdateNotification() {
    if (updateNotificationBadge) {
      updateNotificationBadge.classList.remove('hidden'); // Make it visible
      updateNotificationBadge.classList.add('bg-blue-500'); // Light up the badge
      updateNotificationBadge.classList.remove('bg-gray-400'); // Remove greyed out
    }
  }

  // --- INITIALIZATION ---

  /**
   * Saves the current state of an exercise to the filesystem.
   * Debounced to prevent too frequent writes.
   * @param {object} tab - The tab object containing the exercise state.
   */
  const saveExerciseState = debounce(async (tab) => {
    if (tab && tab.filePath && tab.exerciseState) {
      try {
        await window.api.saveExerciseState(tab.filePath, tab.exerciseState);
        console.log(`Autosaved progress for ${tab.filePath}`);
      } catch (error) {
        console.error(`Failed to autosave progress for ${tab.filePath}:`, error);
      }
    }
  }, 500); // 500ms debounce delay


  /**
   * Initializes the main application components and event listeners.
   */
  async function initializeApp() {
    displayAppVersion();
    updateNetworkStatus();

    // Attach event listener for the new tab button
    if (newTabBtn) { // Null check
        newTabBtn.addEventListener('click', () => addTab(true));
    }
    
    // Attach event listeners for network status changes
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for update-available messages from the main process
    window.api.onUpdateAvailable(() => {
      showUpdateNotification();
    });

    // Add initial tab on app startup and wait for it to complete
    await addTab(true);
  }

  // Ensure the app initializes after the DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
});
