import './style.css';

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


// --- CORE FUNCTIONS ---

/**
 * Renders the tab bar and sets the visibility of content panes.
 */
function renderTabs() {
  // 1. Render Tab Bar
  while (tabBar.children.length > 1) {
    tabBar.removeChild(tabBar.firstChild);
  }

  tabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.id = `tab-${tab.id}`;
    tabEl.className = `flex items-center justify-between h-10 px-4 cursor-pointer border-r border-slate-700 ${tab.active ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`;
    tabEl.innerHTML = `
      <span class="truncate pr-2">${tab.title}</span>
      <button class="close-tab-btn w-6 h-6 rounded-full hover:bg-slate-600 flex-shrink-0 flex items-center justify-center">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;
    
    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.close-tab-btn')) return;
      if (tab.active && tab.view !== 'home') {
        loadHomeIntoTab(tab.id);
      } else if (!tab.active) {
        switchTab(tab.id);
      }
    });

    tabEl.querySelector('.close-tab-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    tabBar.insertBefore(tabEl, newTabBtn);
  });
  
  // 2. Update Content Pane Visibility
  const activeTab = tabs.find(t => t.active);
  document.querySelectorAll('.content-pane').forEach(pane => {
    pane.classList.toggle('block', pane.id === `pane-${activeTab.id}`);
    pane.classList.toggle('none', pane.id !== `pane-${activeTab.id}`);
  });
}

/**
 * Adds a new tab, creating its pane and loading home content.
 * @param {boolean} setActive - Whether the new tab should be active.
 */
function addTab(setActive = true) {
  if (setActive) {
    tabs.forEach(t => t.active = false);
  }

  const newTab = {
    id: nextTabId++,
    title: 'Home',
    view: 'home',
    filePath: null,
    active: true,
    exerciseState: null,
  };

  tabs.push(newTab);

  // Create the pane element
  const paneEl = document.createElement('div');
  paneEl.id = `pane-${newTab.id}`;
  paneEl.className = 'content-pane h-full w-full overflow-auto';
  contentPanes.appendChild(paneEl);

  loadHomeIntoTab(newTab.id);
  renderTabs();
}

/**
 * Switches the active tab.
 * @param {number} tabId - The ID of the tab to activate.
 */
function switchTab(tabId) {
  tabs.forEach(t => t.active = (t.id === tabId));
  renderTabs();
}

/**
 * Closes a tab, removes its pane, and handles switching to a new active tab.
 * @param {number} tabId - The ID of the tab to close.
 */
function closeTab(tabId) {
  const tabIndex = tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;

  // Remove pane from DOM
  const pane = document.getElementById(`pane-${tabId}`);
  if (pane) {
    pane.remove();
  }

  const wasActive = tabs[tabIndex].active;
  tabs.splice(tabIndex, 1);

  if (wasActive && tabs.length > 0) {
    const newActiveIndex = Math.max(0, tabIndex - 1);
    tabs[newActiveIndex].active = true;
  } else if (tabs.length === 0) {
    addTab();
    return; // addTab calls renderTabs
  }

  renderTabs();
}


/**
 * Loads a specific file (lesson/exercise) into the active tab.
 * @param {string} filePath - The relative path to the content file.
 */
async function loadContentIntoActiveTab(filePath) {
    const activeTab = tabs.find(t => t.active);
    if (!activeTab) return;

    activeTab.view = 'content';
    activeTab.filePath = filePath;
    activeTab.title = filePath.split('/').pop().replace('.html', '');
    
    const content = await window.api.getFileContent(filePath);
    const activePane = document.getElementById(`pane-${activeTab.id}`);
    if (activePane && content) {
        activePane.innerHTML = content;
        // Future logic for exercises will go here
    }

    renderTabs();
}


/**
 * Loads the "Home" view content into a specific tab.
 * @param {number} tabId - The ID of the tab to load content into.
 */
async function loadHomeIntoTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    tab.view = 'home';
    tab.filePath = null;
    tab.title = 'Home';

    // Fetch from the new home template
    const homeContent = await window.api.getHomeContent();
    const pane = document.getElementById(`pane-${tab.id}`);
    
    if (pane && homeContent) {
        pane.innerHTML = homeContent;
        // Attach event listeners for the new home content
        attachHomeEventListeners(pane);
    }
    
    renderTabs();
}

/**
 * Attaches event listeners to the content of a "Home" tab.
 * @param {HTMLElement} paneElement - The content pane of the tab.
 */
function attachHomeEventListeners(paneElement) {
    const populateList = async (listId, getFiles, folder) => {
        const list = paneElement.querySelector(`#${listId}`);
        if (!list) return;
        
        list.innerHTML = '<p class="text-slate-400">Loading...</p>'; // Loading indicator
        try {
            const files = await getFiles();
            list.innerHTML = ''; // Clear indicator
            if (files.length === 0) {
                list.innerHTML = `<p class="text-slate-400">No ${folder} found.</p>`;
                return;
            }
            files.forEach(file => {
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = file.replace('.html', '').replace(/-/g, ' ');
                link.className = 'block p-3 bg-slate-700 rounded-md hover:bg-indigo-600 transition-colors font-medium';
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadContentIntoActiveTab(`${folder}/${file}`);
                });
                list.appendChild(link);
            });
        } catch (error) {
            console.error(`Failed to load ${folder}:`, error);
            list.innerHTML = `<p class="text-red-400">Error loading ${folder}.</p>`;
        }
    };

    populateList('lessons-list', window.api.getLessons, 'lessons');
    populateList('exercises-list', window.api.getExercises, 'exercises');
}


// --- UTILITY & SETUP FUNCTIONS ---

/**
 * Displays the application version in the footer.
 */
async function displayAppVersion() {
  const version = await window.api.getAppVersion();
  if (appVersionSpan) {
    appVersionSpan.innerText = version;
  }
}

/**
 * Updates the network status indicator in the footer.
 */
function updateNetworkStatus() {
  const isOnline = navigator.onLine;
  if (networkIndicator) {
    networkIndicator.classList.toggle('bg-green-500', isOnline);
    networkIndicator.classList.toggle('bg-red-500', !isOnline);
  }
  if (networkLabel) {
    networkLabel.innerText = isOnline ? 'Online' : 'Offline';
  }
}


// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
  // Setup initial UI
  displayAppVersion();
  updateNetworkStatus();
  
  // Setup event listeners
  newTabBtn.addEventListener('click', () => addTab(true));
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  
  // Create the first tab
  addTab(true);
});
