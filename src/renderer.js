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
 * Renders the entire UI based on the current `tabs` state.
 */
function render() {
  // 1. Render Tab Bar
  // Clear all but the 'new tab' button
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
    
    // Event listener for switching or reloading home
    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.close-tab-btn')) return; // Ignore clicks on the close button
      if (tab.active) {
        loadHomeIntoTab(tab.id);
      } else {
        switchTab(tab.id);
      }
    });

    // Event listener for closing
    tabEl.querySelector('.close-tab-btn').addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent tab switch event
      closeTab(tab.id);
    });

    tabBar.insertBefore(tabEl, newTabBtn);
  });
  
  // 2. Render Content Panes
  contentPanes.innerHTML = '';
  tabs.forEach(tab => {
    const paneEl = document.createElement('div');
    paneEl.id = `pane-${tab.id}`;
    paneEl.className = `content-pane h-full w-full overflow-auto ${tab.active ? 'block' : 'none'}`;
    // The content is injected by loader functions
    contentPanes.appendChild(paneEl);
  });

  // 3. Render Active Content
  const activeTab = tabs.find(t => t.active);
  if (activeTab) {
    const activePane = document.getElementById(`pane-${activeTab.id}`);
    if(activePane){
        activePane.classList.remove('none');
        if (activeTab.view === 'home') {
            loadHomeIntoTab(activeTab.id, true); // force re-render of home
        } else {
            loadContentIntoActiveTab(activeTab.filePath, true); // force re-render of content
        }
    }
  }
}

/**
 * Adds a new tab to the state and renders it.
 * @param {boolean} setActive - Whether the new tab should be active.
 */
function addTab(setActive = true) {
  const newTab = {
    id: nextTabId++,
    title: `New Tab ${nextTabId - 1}`,
    view: 'home',
    filePath: null,
    active: setActive,
    exerciseState: null,
  };
  
  if (setActive) {
    tabs.forEach(t => t.active = false);
  }

  tabs.push(newTab);
  render();
}

/**
 * Switches the active tab.
 * @param {number} tabId - The ID of the tab to activate.
 */
function switchTab(tabId) {
  tabs.forEach(t => t.active = (t.id === tabId));
  render();
}

/**
 * Closes a tab and handles switching to a new active tab.
 * @param {number} tabId - The ID of the tab to close.
 */
function closeTab(tabId) {
  const tabIndex = tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;

  const wasActive = tabs[tabIndex].active;
  tabs.splice(tabIndex, 1);

  if (wasActive && tabs.length > 0) {
    // Activate the previous tab, or the first one if the closed tab was the first
    const newActiveIndex = Math.max(0, tabIndex - 1);
    tabs[newActiveIndex].active = true;
  } else if (tabs.length === 0) {
      addTab();
  }

  render();
}


/**
 * Loads a specific file (lesson/exercise) into the active tab.
 * @param {string} filePath - The relative path to the content file.
 * @param {boolean} isRerender - Flag to avoid state change on re-render.
 */
async function loadContentIntoActiveTab(filePath, isRerender = false) {
    const activeTab = tabs.find(t => t.active);
    if (!activeTab) return;

    if (!isRerender) {
        activeTab.view = 'content';
        activeTab.filePath = filePath;
        activeTab.title = filePath.split('/').pop().replace('.html', '');
    }

    const content = await window.api.getFileContent(filePath);
    const activePane = document.getElementById(`pane-${activeTab.id}`);
    if (activePane && content) {
        activePane.innerHTML = content;
        // Logic for handling exercises would go here in a future step
    }

    if (!isRerender) {
        render(); // Re-render to update title and active state styling
    }
}


/**
 * Loads the "Home" view content into a specific tab.
 * @param {number} tabId - The ID of the tab to load content into.
 * @param {boolean} isRerender - Flag to avoid state change on re-render.
 */
async function loadHomeIntoTab(tabId, isRerender = false) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    if (!isRerender) {
        tab.view = 'home';
        tab.filePath = null;
        tab.title = `New Tab ${tab.id}`;
    }

    const homeContent = await window.api.getFileContent('src/index.html');
    const pane = document.getElementById(`pane-${tab.id}`);
    
    if (pane && homeContent) {
        // We need to parse the HTML and extract only the body content
        const parser = new DOMParser();
        const doc = parser.parseFromString(homeContent, 'text/html');
        const homeMainContent = doc.querySelector('body').innerHTML;
        pane.innerHTML = homeMainContent;

        // Re-attach event listeners for the new home content
        attachHomeEventListeners(pane);
    }
    
    if (!isRerender) {
        render();
    }
}

/**
 * Attaches event listeners to the content of a "Home" tab.
 * @param {HTMLElement} paneElement - The content pane of the tab.
 */
async function attachHomeEventListeners(paneElement) {
    // Populate Lessons
    const lessonsList = paneElement.querySelector('#lessons-list');
    if (lessonsList) {
        const lessons = await window.api.getLessons();
        lessonsList.innerHTML = '';
        lessons.forEach(file => {
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = file.replace('.html', '').replace(/-/g, ' ');
            link.className = 'block p-3 bg-slate-100 rounded-md hover:bg-indigo-100 hover:text-indigo-800 transition-colors font-medium text-gray-800';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadContentIntoActiveTab(`lessons/${file}`);
            });
            lessonsList.appendChild(link);
        });
    }

    // Populate Exercises
    const exercisesList = paneElement.querySelector('#exercises-list');
    if (exercisesList) {
        const exercises = await window.api.getExercises();
        exercisesList.innerHTML = '';
        exercises.forEach(file => {
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = file.replace('.html', '').replace(/-/g, ' ');
            link.className = 'block p-3 bg-slate-100 rounded-md hover:bg-indigo-100 hover:text-indigo-800 transition-colors font-medium text-gray-800';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadContentIntoActiveTab(`exercises/${file}`);
            });
            exercisesList.appendChild(link);
        });
    }
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
