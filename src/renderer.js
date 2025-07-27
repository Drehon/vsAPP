import './style.css';

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


  // --- CORE FUNCTIONS ---

  /**
   * Renders the tab bar and manages content pane visibility based on the current tabs state.
   */
  function renderTabs() {
    // Clear existing tab elements, except for the new tab button
    while (tabBar.children.length > 1) {
      tabBar.removeChild(tabBar.firstChild);
    }

    // Create and append tab elements for each tab in the state
    tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.id = `tab-${tab.id}`;
      tabEl.className = `flex items-center justify-between h-9 px-4 cursor-pointer border-r border-slate-700 ${tab.active ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`;
      tabEl.innerHTML = `
        <span class="truncate pr-2">${tab.title}</span>
        <button class="close-tab-btn w-6 h-6 rounded-full hover:bg-slate-600 flex-shrink-0 flex items-center justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      `;

      // Event listener for clicking on a tab (to switch or go home)
      tabEl.addEventListener('click', (e) => {
        if (e.target.closest('.close-tab-btn')) return; // Ignore clicks on the close button
        if (tab.active && tab.view !== 'home') {
          // If active tab is clicked and it's not home, go to home view for that tab
          loadHomeIntoTab(tab.id);
        } else if (!tab.active) {
          // If inactive tab is clicked, switch to it
          switchTab(tab.id);
        }
      });

      // Event listener for closing a tab
      tabEl.querySelector('.close-tab-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the tab click event from firing
        closeTab(tab.id);
      });

      tabBar.insertBefore(tabEl, newTabBtn); // Insert tab before the "New Tab" button
    });

    // Show/hide content panes based on the active tab
    const activeTab = tabs.find(t => t.active);
    if (activeTab) {
      document.querySelectorAll('.content-pane').forEach(pane => {
        pane.style.display = pane.id === `pane-${activeTab.id}` ? 'block' : 'none';
      });
    }
  }

  /**
   * Adds a new tab to the application.
   * @param {boolean} [setActive=true] - Whether to make the new tab active.
   * @param {string} [filePath=null] - Optional file path to load into the new tab.
   * @param {string} [type='home'] - The type of content to load ('home', 'content', 'settings').
   */
  async function addTab(setActive = true, filePath = null, type = 'home') {
    if (setActive) {
      tabs.forEach(t => t.active = false); // Deactivate all other tabs if setting new one active
    }

    const newTab = {
      id: nextTabId++,
      title: 'Home',
      view: 'home',
      filePath: null,
      active: true,
      exerciseState: null, // Initialize exercise state as null
    };
    tabs.push(newTab);

    // Create a new content pane for the tab
    const paneEl = document.createElement('div');
    paneEl.id = `pane-${newTab.id}`;
    paneEl.className = 'content-pane h-full w-full overflow-auto';
    contentPanes.appendChild(paneEl);

    if (type === 'content' && filePath) {
      await loadContentIntoTab(newTab.id, filePath);
    } else if (type === 'settings') {
      await loadSettingsIntoTab(newTab.id);
    } else {
      await loadHomeIntoTab(newTab.id);
    }

    // Ensure the new tab is marked as active before rendering, or just render if not setting active
    if (setActive) {
      await switchTab(newTab.id);
    } else {
      renderTabs();
    }
  }

  /**
   * Switches the active tab to the specified tabId.
   * @param {number} tabId - The ID of the tab to activate.
   */
  async function switchTab(tabId) { // Made async to await content loading
    const previouslyActiveTab = tabs.find(t => t.active);
    tabs.forEach(t => t.active = (t.id === tabId)); // Set active flag for the selected tab

    const newActiveTab = tabs.find(t => t.id === tabId);

    // If the new active tab has content (lesson/exercise), reload it to ensure latest state
    if (newActiveTab && newActiveTab.view === 'content' && newActiveTab.filePath) {
      // This will re-fetch the content and re-initialize the exercise state from the file system
      await loadContentIntoTab(newActiveTab.id, newActiveTab.filePath);
    }

    renderTabs(); // Re-render the tab bar and content panes
  }

  /**
   * Closes the specified tab.
   * @param {number} tabId - The ID of the tab to close.
   */
  function closeTab(tabId) {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return; // Tab not found

    const pane = document.getElementById(`pane-${tabId}`);
    if (pane) pane.remove(); // Remove the content pane from the DOM

    const wasActive = tabs[tabIndex].active;
    tabs.splice(tabIndex, 1); // Remove the tab from the array

    // If the closed tab was active and there are other tabs, activate the nearest one
    if (wasActive && tabs.length > 0) {
      const newActiveIndex = Math.max(0, tabIndex - 1); // Activate previous tab or first if none
      switchTab(tabs[newActiveIndex].id); // Use switchTab to trigger potential reload
    } else if (tabs.length === 0) {
      // If no tabs left, add a new default home tab
      addTab();
      return;
    }

    renderTabs(); // Re-render the UI
  }

  /**
   * Loads content from a specified file path into a given tab.
   * This function also handles loading and initializing exercise states.
   * @param {number} tabId - The ID of the tab to load content into.
   * @param {string} filePath - The relative path to the HTML file (e.g., 'lessons/L1.html').
   */
  async function loadContentIntoTab(tabId, filePath) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.view = 'content';
    tab.filePath = filePath;
    tab.title = filePath.split('/').pop().replace('.html', ''); // Set tab title from filename

    const content = await window.api.getFileContent(filePath);
    const pane = document.getElementById(`pane-${tab.id}`);

    if (pane && content) {
        pane.innerHTML = ''; // Clear existing content

        // Create the main content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = "lesson-content bg-slate-200 text-slate-700 h-full flex flex-col"; // Use flex-col

        // Create the toolbar
        const toolbar = document.createElement('div');
        toolbar.className = "flex-shrink-0 bg-slate-100 border-b border-slate-300 px-4 py-1 flex justify-between items-center";

        // Left group: Home and Reload
        const leftGroup = document.createElement('div');
        leftGroup.className = 'flex items-center gap-2';
        leftGroup.innerHTML = `
            <button id="home-btn-${tab.id}" title="Go Home" class="p-2 rounded-md hover:bg-slate-300"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg></button>
            <button id="reload-btn-${tab.id}" title="Reload Content" class="p-2 rounded-md hover:bg-slate-300"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 4l16 16"></path></svg></button>
        `;
        toolbar.appendChild(leftGroup);

        // Right group: Actions and Info
        const rightGroup = document.createElement('div');
        rightGroup.className = 'flex items-center gap-2';
        rightGroup.innerHTML = `
            <button id="save-btn-${tab.id}" class="text-sm bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-lg transition-colors">Salva</button>
            <button id="load-btn-${tab.id}" class="text-sm bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg transition-colors">Carica</button>
            <button id="reset-btn-${tab.id}" class="text-sm bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg transition-colors">Azzera</button>
            <button id="github-btn-${tab.id}" title="Open on GitHub" class="p-2 rounded-md hover:bg-slate-300"><svg class="w-6 h-6 text-slate-600" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg></button>
            <button id="settings-btn-${tab.id}" title="Settings" class="p-2 rounded-md hover:bg-slate-300"><svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></button>
            <div id="update-badge-${tab.id}" class="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-100 hidden" title="Update available!"></div>
        `;
        toolbar.appendChild(rightGroup);

        // Content area that will scroll
        const scrollableContent = document.createElement('div');
        scrollableContent.className = 'flex-grow overflow-y-auto p-6 md:p-10';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;

        // FIX: More robust selector for removing old buttons.
        const oldButtonContainer = tempDiv.querySelector('#save-btn')?.parentNode;
        if (oldButtonContainer && oldButtonContainer.querySelector('#load-btn')) {
            oldButtonContainer.remove();
        }

        scrollableContent.innerHTML = tempDiv.innerHTML;

        // Assemble the pane
        contentWrapper.appendChild(toolbar);
        contentWrapper.appendChild(scrollableContent);
        pane.appendChild(contentWrapper);

        // Attach event listeners to the new toolbar buttons
        document.getElementById(`home-btn-${tab.id}`).addEventListener('click', () => loadHomeIntoTab(tab.id));
        document.getElementById(`reload-btn-${tab.id}`).addEventListener('click', () => loadContentIntoTab(tab.id, filePath));
        document.getElementById(`github-btn-${tab.id}`).addEventListener('click', () => window.api.openExternalLink('https://github.com/Drehon/vsapp'));
        document.getElementById(`settings-btn-${tab.id}`).addEventListener('click', () => addTab(true, null, 'settings'));


        // Check if the loaded content is an exercise and initialize it
        if (scrollableContent.querySelector('#exercise-data')) {
            const savedState = await window.api.loadExerciseState(filePath);
            tab.exerciseState = savedState ? savedState : null;
            initializeExercise(scrollableContent, tab); // Pass the scrollable area
        }
    }
    renderTabs(); // Re-render tabs to update title etc.
}

  /**
   * Loads the home page content into a given tab.
   * @param {number} tabId - The ID of the tab to load home content into.
   */
  async function loadHomeIntoTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.view = 'home';
    tab.filePath = null;
    tab.title = 'Home';

    const homeContent = await window.api.getHomeContent();
    const pane = document.getElementById(`pane-${tab.id}`);

    if (pane && homeContent) {
        pane.innerHTML = ''; // Clear existing content

        const contentWrapper = document.createElement('div');
        contentWrapper.className = "h-full flex flex-col bg-slate-800 text-white"; // Home theme

        // Create the toolbar for Home
        const toolbar = document.createElement('div');
        toolbar.className = "flex-shrink-0 bg-slate-700 border-b border-slate-600 px-4 py-1 flex justify-between items-center";

        // Left group: Home and Reload
        const leftGroup = document.createElement('div');
        leftGroup.className = 'flex items-center gap-2';
        leftGroup.innerHTML = `
            <button id="home-btn-${tab.id}" title="Go Home" class="p-2 rounded-md" disabled><svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg></button>
            <button id="reload-btn-${tab.id}" title="Reload Home" class="p-2 rounded-md hover:bg-slate-600"><svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 4l16 16"></path></svg></button>
        `;
        toolbar.appendChild(leftGroup);

        // Right group: Actions and Info (disabled)
        const rightGroup = document.createElement('div');
        rightGroup.className = 'flex items-center gap-2';
        rightGroup.innerHTML = `
            <button disabled class="text-sm bg-slate-500 text-white font-bold py-1 px-3 rounded-lg transition-colors cursor-not-allowed">Salva</button>
            <button disabled class="text-sm bg-slate-500 text-white font-bold py-1 px-3 rounded-lg transition-colors cursor-not-allowed">Carica</button>
            <button disabled class="text-sm bg-slate-500 text-white font-bold py-1 px-3 rounded-lg transition-colors cursor-not-allowed">Azzera</button>
            <button id="github-btn-${tab.id}" title="Open on GitHub" class="p-2 rounded-md hover:bg-slate-600"><svg class="w-6 h-6 text-slate-400" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg></button>
            <button id="settings-btn-${tab.id}" title="Settings" class="p-2 rounded-md hover:bg-slate-600"><svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></button>
            <div id="update-badge-${tab.id}" class="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-700 hidden" title="Update available!"></div>
        `;
        toolbar.appendChild(rightGroup);

        // Content area that will scroll
        const scrollableContent = document.createElement('div');
        scrollableContent.className = 'flex-grow overflow-y-auto';
        scrollableContent.innerHTML = homeContent;

        // Assemble the pane
        contentWrapper.appendChild(toolbar);
        contentWrapper.appendChild(scrollableContent);
        pane.appendChild(contentWrapper);

        // Attach event listeners
        document.getElementById(`reload-btn-${tab.id}`).addEventListener('click', () => loadHomeIntoTab(tab.id));
        document.getElementById(`github-btn-${tab.id}`).addEventListener('click', () => window.api.openExternalLink('https://github.com/Drehon/vsapp'));
        document.getElementById(`settings-btn-${tab.id}`).addEventListener('click', () => addTab(true, null, 'settings'));
        attachHomeEventListeners(scrollableContent);
    }

    renderTabs();
  }
  
  /**
   * Loads the settings page content into a given tab.
   * @param {number} tabId - The ID of the tab to load settings into.
   */
  async function loadSettingsIntoTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.view = 'settings';
    tab.filePath = null;
    tab.title = 'Settings';

    const settingsContent = await window.api.getSettingsContent();
    const pane = document.getElementById(`pane-${tab.id}`);

    if (pane && settingsContent) {
      pane.innerHTML = ''; // Clear existing content

      const contentWrapper = document.createElement('div');
      contentWrapper.className = "h-full flex flex-col bg-slate-800 text-white"; // Settings theme

      // Create the toolbar for Settings
      const toolbar = document.createElement('div');
      toolbar.className = "flex-shrink-0 bg-slate-700 border-b border-slate-600 px-4 py-1 flex justify-between items-center";
      
      // Left group
      const leftGroup = document.createElement('div');
      leftGroup.className = 'flex items-center gap-2';
      leftGroup.innerHTML = `
          <button id="home-btn-${tab.id}" title="Go Home" class="p-2 rounded-md hover:bg-slate-600"><svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg></button>
          <button id="reload-btn-${tab.id}" title="Reload Settings" class="p-2 rounded-md hover:bg-slate-600"><svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 4l16 16"></path></svg></button>
      `;
      toolbar.appendChild(leftGroup);

      // Right group
      const rightGroup = document.createElement('div');
      rightGroup.className = 'flex items-center gap-2';
      rightGroup.innerHTML = `
          <button id="github-btn-${tab.id}" title="Open on GitHub" class="p-2 rounded-md hover:bg-slate-600"><svg class="w-6 h-6 text-slate-400" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg></button>
          <button id="settings-btn-${tab.id}" title="Settings" class="p-2 rounded-md" disabled><svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></button>
      `;
      toolbar.appendChild(rightGroup);

      const scrollableContent = document.createElement('div');
      scrollableContent.className = 'flex-grow overflow-y-auto';
      scrollableContent.innerHTML = settingsContent;

      contentWrapper.appendChild(toolbar);
      contentWrapper.appendChild(scrollableContent);
      pane.appendChild(contentWrapper);

      // Attach event listeners
      document.getElementById(`home-btn-${tab.id}`).addEventListener('click', () => loadHomeIntoTab(tab.id));
      document.getElementById(`reload-btn-${tab.id}`).addEventListener('click', () => loadSettingsIntoTab(tab.id));
      document.getElementById(`github-btn-${tab.id}`).addEventListener('click', () => window.api.openExternalLink('https://github.com/Drehon/vsapp'));
    }
    renderTabs();
  }

  /**
   * Attaches event listeners to lesson and exercise links on the home page.
   * @param {HTMLElement} paneElement - The DOM element containing the home page content.
   */
  function attachHomeEventListeners(paneElement) {
    /**
     * Populates a list of lessons or exercises.
     * @param {string} listId - The ID of the list container.
     * @param {Function} getFiles - IPC function to get file list (e.g., `window.api.getLessons`).
     * @param {string} folder - The folder name (e.g., 'lessons', 'exercises').
     */
    const populateList = async (listId, getFiles, folder) => {
      const list = paneElement.querySelector(`#${listId}`);
      if (!list) return;

      list.innerHTML = '<p class="text-slate-400">Loading...</p>';
      try {
        const files = await getFiles();
        list.innerHTML = '';
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
            const activeTab = tabs.find(t => t.active);
            if (activeTab.view === 'home') {
              loadContentIntoTab(activeTab.id, `${folder}/${file}`);
            } else {
              addTab(true, `${folder}/${file}`, 'content');
            }
          });
          list.appendChild(link);
        });
      }
      catch (error) {
        console.error(`Failed to load ${folder}:`, error);
        list.innerHTML = `<p class="text-red-400">Error loading ${folder}.</p>`;
      }
    };

    populateList('lessons-list', window.api.getLessons, 'lessons');
    populateList('exercises-list', window.api.getExercises, 'exercises');
  }

  // --- EXERCISE INITIALIZATION & LOGIC ---

  /**
   * Saves the current exercise state to the main process for persistence.
   * @param {object} tab - The current tab object containing filePath and exerciseState.
   */
  async function saveExerciseState(tab) {
    if (tab.filePath && tab.exerciseState) {
      const result = await window.api.saveExerciseState(tab.filePath, tab.exerciseState);
      if (!result.success) {
        console.error('Failed to auto-save exercise state:', result.error);
      }
    }
  }

  /**
   * Initializes and manages the interactive exercise logic for a given tab.
   * @param {HTMLElement} paneElement - The DOM element containing the exercise content.
   * @param {object} tab - The tab object associated with this exercise.
   */
  function initializeExercise(paneElement, tab) {
    const exerciseDataEl = paneElement.querySelector('#exercise-data');
    if (!exerciseDataEl) return;

    const exercises = JSON.parse(exerciseDataEl.textContent);
    let appState; // Reference to the tab's exerciseState

    /**
     * Initializes or re-initializes the exercise state for the current tab.
     * If tab.exerciseState already exists (e.g., loaded from file), it's used.
     * Otherwise, a new default state is created.
     */
    function initializeState() {
      if (tab.exerciseState) {
        appState = tab.exerciseState;
        console.log("Using existing exercise state:", appState);
      } else {
        // Initialize state with a new 'phaseNote' for each fase
        const defaultState = {
          fase1: { answers: Array(exercises.fase1.length).fill(null).map(() => ({ userAnswer: null, isCorrect: null, note: "" })), phaseNote: "" },
          fase2: { answers: Array(exercises.fase2.length).fill(null).map(() => ({ userAnswer: null, isCorrect: null, note: "" })), phaseNote: "" },
          fase3: { answers: Array(exercises.fase3.length).fill(null).map(() => ({ userAnswer: null, isCorrect: null, note: "" })), phaseNote: "" },
          currentQuestion: { fase1: 0, fase2: 0, fase3: 0 }
        };
        appState = defaultState;
        tab.exerciseState = appState; // Assign the new state to the tab
        console.log("Initialized new exercise state:", appState);
      }
    }

    /**
     * Creates or updates the scoreboard for a given fase.
     * @param {string} fase - The current fase (e.g., 'fase1').
     * @returns {HTMLElement} The scoreboard element.
     */
    function createScoreboard(fase) {
      const total = exercises[fase].length;
      const current = appState.currentQuestion[fase] + 1;
      const correct = appState[fase].answers.filter(a => a && a.isCorrect).length;
      const answered = appState[fase].answers.filter(a => a && a.userAnswer !== null).length;

      let scoreboard = paneElement.querySelector(`#scoreboard-${fase}`);
      if (!scoreboard) {
        scoreboard = document.createElement('div');
        scoreboard.id = `scoreboard-${fase}`;
        scoreboard.className = 'flex justify-between items-center text-sm text-slate-500 mb-4 pb-4 border-b border-slate-200';
      }

      scoreboard.innerHTML = `
        <div class="flex items-center gap-4">
            <span>Domanda: <strong>${current > total ? total : current}/${total}</strong></span>
            <div class="flex items-center gap-1">
                <input type="number" id="jump-to-${fase}" class="w-16 text-center border border-slate-300 rounded-md text-sm p-1" min="1" max="${total}" value="${current > total ? total : current}">
                <button id="jump-btn-${fase}" class="text-xs bg-slate-200 hover:bg-slate-300 font-bold py-1 px-2 rounded-lg">Vai</button>
            </div>
        </div>
        <span>Corrette: <strong>${correct}/${answered}</strong></span>
      `;
      return scoreboard;
    }

    /**
     * Creates or updates the question-specific notes area.
     * @param {string} fase - The current fase.
     * @param {number} index - The current question index.
     * @returns {HTMLElement} The notes area element.
     */
    function createNotesArea(fase, index) {
      let notesArea = paneElement.querySelector(`#notes-container-${fase}-${index}`);
      if (!notesArea) {
        notesArea = document.createElement('div');
        notesArea.id = `notes-container-${fase}-${index}`;
        // Added classes for visual consistency with phase notes area
        notesArea.className = 'mt-4 p-4 rounded-lg border border-slate-300 bg-slate-100';
        notesArea.innerHTML = `
            <label for="notes-${fase}-${index}" class="block text-sm font-medium text-slate-600">Note per la domanda:</label>
            <textarea id="notes-${fase}-${index}" class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-100" rows="3"></textarea>
        `;
      }

      const textarea = notesArea.querySelector('textarea');
      textarea.value = appState[fase].answers[index].note || '';
      // Ensure the listener is added only once or properly cleaned up
      textarea.onkeyup = () => { // Using onkeyup to avoid multiple listeners
        appState[fase].answers[index].note = textarea.value;
        saveExerciseState(tab); // Auto-save on note change
      };
      return notesArea;
    }

    /**
     * Creates or updates the phase-specific notes area.
     * @param {string} fase - The current fase.
     * @returns {HTMLElement} The phase notes area element.
     */
    function createPhaseNotesArea(fase) {
      let phaseNotesEl = paneElement.querySelector(`#phase-notes-container-${fase}`);
      if (!phaseNotesEl) {
        phaseNotesEl = document.createElement('div');
        phaseNotesEl.id = `phase-notes-container-${fase}`;
        phaseNotesEl.className = 'mt-6 p-4 rounded-lg border border-slate-300 bg-slate-100'; // Lighter background
        phaseNotesEl.innerHTML = `
            <label for="phase-notes-${fase}" class="block text-sm font-medium text-slate-600">Note per questa fase:</label>
            <textarea id="phase-notes-${fase}" class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-100" rows="4"></textarea>
        `;
      }
      const textarea = phaseNotesEl.querySelector('textarea');
      textarea.value = appState[fase].phaseNote || '';
      // Ensure the listener is added only once or properly cleaned up
      textarea.onkeyup = () => { // Using onkeyup to avoid multiple listeners
        appState[fase].phaseNote = textarea.value;
        saveExerciseState(tab); // Auto-save on phase note change
      };
      return phaseNotesEl;
    }

    /**
     * Creates or updates the feedback area for an answer.
     * @param {string} fase - The current fase.
     * @param {number} index - The current question index.
     * @param {boolean} isCorrect - Whether the answer was correct.
     * @param {string} explanation - The explanation text.
     * @returns {HTMLElement} The feedback element.
     */
    function createFeedbackArea(fase, index, isCorrect, explanation) {
      let feedbackEl = paneElement.querySelector(`#feedback-${fase}-${index}`);
      if (!feedbackEl) {
        feedbackEl = document.createElement('div');
        feedbackEl.id = `feedback-${fase}-${index}`;
        feedbackEl.className = 'mt-4 p-4 border-l-4 rounded-r-lg';
      }
      feedbackEl.className = feedbackEl.className.replace(/feedback-(correct|incorrect)/g, ''); // Remove old classes
      feedbackEl.classList.add(isCorrect ? 'feedback-correct' : 'feedback-incorrect');

      let markCorrectBtn = '';
      if (!isCorrect) {
        markCorrectBtn = `<button class="mark-correct-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-yellow-800 font-bold py-1 px-2 rounded-lg ml-4" data-fase="${fase}" data-index="${index}">Segna come Corretta</button>`;
      }

      feedbackEl.innerHTML = explanation + markCorrectBtn;

      if (!isCorrect) {
        const markBtn = feedbackEl.querySelector('.mark-correct-btn');
        if (markBtn) {
          markBtn.onclick = (e) => { // Use onclick to avoid multiple listeners
            const { fase, index } = e.target.dataset;
            appState[fase].answers[parseInt(index)].isCorrect = true;
            saveExerciseState(tab); // Auto-save on marking correct
            rerenderAll();
          };
        }
      }
      return feedbackEl;
    }

    /**
     * Renders a specific fase of the exercise.
     * This function now focuses on updating existing DOM elements where possible
     * to prevent flickering and improve performance.
     * @param {string} fase - The fase to render (e.g., 'fase1', 'fase2', 'fase3').
     */
    function renderFase(fase) {
      const containerId = `tab-content-${fase.slice(-1)}`;
      const container = paneElement.querySelector(`#${containerId}`);
      if (!container) return;

      // Ensure the main question wrapper exists or create it
      let questionWrapper = container.querySelector('.question-wrapper');
      if (!questionWrapper) {
        questionWrapper = document.createElement('div');
        questionWrapper.className = 'question-wrapper';
        container.appendChild(questionWrapper);
      }

      // Update/Append Scoreboard
      const scoreboard = createScoreboard(fase);
      // Prepend scoreboard if not already the first child
      if (container.firstChild !== scoreboard) {
        container.insertBefore(scoreboard, container.firstChild);
      }

      const index = appState.currentQuestion[fase];
      if (index >= exercises[fase].length) {
        // Fase completed view
        questionWrapper.innerHTML = `<div class="text-center p-8"><h3 class="text-xl font-bold">Fase Completata!</h3><p>${appState[fase].answers.filter(a => a.isCorrect).length} / ${exercises[fase].length} corrette.</p></div>`;

        const navContainer = document.createElement('div');
        navContainer.className = "flex justify-center items-center gap-4 pt-4";
        navContainer.innerHTML = `<button id="prev-${fase}" class="bg-slate-500 text-white font-bold py-2 px-6 rounded-lg">Precedente</button>`;
        questionWrapper.appendChild(navContainer);
        addNavigationListeners(fase, questionWrapper);
        return;
      }

      const ex = exercises[fase][index];
      const answerState = appState[fase].answers[index];

      let contentHTML = '';
      if (fase === 'fase1') {
        contentHTML = `
            <div class="space-y-4">
                <p class="text-lg text-slate-600">La seguente frase è grammaticalmente corretta?</p>
                <div class="p-4 bg-slate-100 rounded-lg text-xl text-center font-semibold text-slate-800">${ex.question}</div>
                <div class="flex justify-center space-x-4 pt-4">
                    <button class="fase-btn border-2 font-bold py-2 px-8 rounded-lg transition-colors" data-fase="fase1" data-answer="true">Vero</button>
                    <button class="fase-btn border-2 font-bold py-2 px-8 rounded-lg transition-colors" data-fase="fase1" data-answer="false">Falso</button>
                </div>
            </div>`;
      } else if (fase === 'fase2') {
        contentHTML = `
            <div class="space-y-4">
                <p class="text-lg text-slate-600">Scegli l'opzione corretta per completare la frase.</p>
                <div class="p-4 bg-slate-100 rounded-lg text-xl text-center font-semibold text-slate-800">${ex.question}</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    ${ex.options.map(opt => `<button class="fase-btn border-2 font-bold py-3 px-6 rounded-lg transition-colors" data-fase="fase2" data-answer="${opt}">${opt}</button>`).join('')}
                </div>
            </div>`;
      } else if (fase === 'fase3') {
        contentHTML = `
            <div class="space-y-4">
                <p class="text-lg text-slate-600">Riscrivi o completa la frase usando una struttura con il congiuntivo.</p>
                <div class="p-4 bg-slate-100 rounded-lg space-y-2">
                    <p class="text-slate-600"><strong>Frase di partenza:</strong> "${ex.prompt}"</p>
                    <p class="text-xl font-semibold text-slate-800">${ex.question} <input type="text" id="fase3-input" class="font-normal text-base border-b-2 border-slate-300 focus:border-indigo-500 outline-none w-1/2 bg-slate-100"></p>
                </div>
                <div class="flex justify-center space-x-4 pt-4">
                    <button id="check-fase3" class="fase-btn border-2 font-bold py-2 px-8 rounded-lg transition-colors">Controlla</button>
                </div>
            </div>`;
      }

      // Update question content and navigation buttons
      questionWrapper.innerHTML = `${contentHTML}<div class="feedback-container mt-4"></div><div class="flex justify-center items-center gap-4 pt-4"><button id="prev-${fase}" class="bg-slate-500 text-white font-bold py-2 px-6 rounded-lg">Precedente</button><button id="next-${fase}" class="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">Prossimo</button></div>`;

      // Append/Update notes areas
      const notesArea = createNotesArea(fase, index);
      questionWrapper.appendChild(notesArea);

      const phaseNotesEl = createPhaseNotesArea(fase);
      questionWrapper.appendChild(phaseNotesEl); // Phase notes below question notes

      // Handle feedback and disable inputs if answered
      if (answerState.userAnswer !== null) {
        const feedbackContainer = questionWrapper.querySelector('.feedback-container');
        const feedbackEl = createFeedbackArea(fase, index, answerState.isCorrect, ex.explanation);
        feedbackContainer.innerHTML = ''; // Clear previous feedback
        feedbackContainer.appendChild(feedbackEl);

        if (fase === 'fase1' || fase === 'fase2') {
          questionWrapper.querySelectorAll('.fase-btn').forEach(b => {
            b.disabled = true;
            const isCorrectAnswer = String(ex.answer) === b.dataset.answer;
            const isUserAnswer = String(answerState.userAnswer) === b.dataset.answer;
            if (isCorrectAnswer) b.classList.add('btn-correct');
            if (isUserAnswer && !answerState.isCorrect) b.classList.add('btn-incorrect');
            if (!isCorrectAnswer && !isUserAnswer) b.classList.add('opacity-50');
          });
        } else { // fase3
          const inputEl = questionWrapper.querySelector('#fase3-input');
          inputEl.value = answerState.userAnswer;
          inputEl.disabled = true;
          questionWrapper.querySelector('#check-fase3').disabled = true;
        }

      } else {
        // Clear feedback if question is not answered
        const feedbackContainer = questionWrapper.querySelector('.feedback-container');
        if (feedbackContainer) feedbackContainer.innerHTML = '';
        addPhaseListeners(fase, questionWrapper); // Re-attach listeners for unanswered questions
      }

      addNavigationListeners(fase, questionWrapper); // Always attach navigation listeners
    }

    /**
     * Attaches navigation listeners (Previous, Next, Jump) for a given fase.
     * @param {string} fase - The current fase.
     * @param {HTMLElement} container - The DOM element containing the navigation buttons.
     */
    function addNavigationListeners(fase, container) {
      const prevBtn = container.querySelector(`#prev-${fase}`);
      const nextBtn = container.querySelector(`#next-${fase}`);
      const jumpBtn = container.querySelector(`#jump-btn-${fase}`);
      const jumpInput = container.querySelector(`#jump-to-${fase}`);
      const index = appState.currentQuestion[fase];
      const total = exercises[fase].length;

      // Disable 'Previous' button if at the first question
      if (prevBtn) {
        prevBtn.disabled = index <= 0;
        prevBtn.classList.toggle('opacity-50', index <= 0);
        prevBtn.classList.toggle('cursor-not-allowed', index <= 0);
        prevBtn.onclick = () => { // Use onclick for single listener
          if (appState.currentQuestion[fase] > 0) {
            appState.currentQuestion[fase]--;
            renderFase(fase);
            saveExerciseState(tab); // Auto-save on navigation
          }
        };
      }

      // Update 'Next' button text if at the last question
      if (nextBtn) {
        nextBtn.textContent = index >= total - 1 ? 'Fine' : 'Prossimo';
        nextBtn.onclick = () => { // Use onclick for single listener
          if (appState.currentQuestion[fase] < total) {
            appState.currentQuestion[fase]++;
            renderFase(fase);
            saveExerciseState(tab); // Auto-save on navigation
          }
        };
      }

      // Jump to question functionality
      if (jumpBtn && jumpInput) {
        jumpBtn.onclick = () => { // Use onclick for single listener
          const questionNum = parseInt(jumpInput.value);
          if (!isNaN(questionNum) && questionNum >= 1 && questionNum <= total) {
            appState.currentQuestion[fase] = questionNum - 1;
            renderFase(fase);
            saveExerciseState(tab); // Auto-save on jump
          }
        };
        jumpInput.onkeydown = (e) => { // Use onkeydown for single listener
          if (e.key === 'Enter') {
            jumpBtn.click();
          }
        };
      }
    }

    /**
     * Attaches listeners for answering questions in each fase.
     * @param {string} fase - The current fase.
     * @param {HTMLElement} container - The DOM element containing the question inputs/buttons.
     */
    function addPhaseListeners(fase, container) {
      if (fase === 'fase1' || fase === 'fase2') {
        container.querySelectorAll('.fase-btn').forEach(btn => {
          btn.classList.add('btn-neutral'); // Ensure neutral style initially
          btn.onclick = (e) => { // Use onclick for single listener
            const userAnswer = e.target.dataset.answer === 'true' ? true : e.target.dataset.answer === 'false' ? false : e.target.dataset.answer;
            const index = appState.currentQuestion[fase];
            appState[fase].answers[index].userAnswer = userAnswer;
            appState[fase].answers[index].isCorrect = userAnswer === exercises[fase][index].answer;
            saveExerciseState(tab); // Auto-save on answer
            renderFase(fase);
          };
        });
      } else { // fase3
        const checkBtn = container.querySelector('#check-fase3');
        const inputEl = container.querySelector('#fase3-input');
        if (checkBtn && inputEl) {
          checkBtn.classList.add('btn-neutral'); // Ensure neutral style initially
          checkBtn.onclick = () => { // Use onclick for single listener
            const userAnswer = inputEl.value.trim();
            const index = appState.currentQuestion[fase];
            const correctAnswer = exercises.fase3[index].answer.trim();
            appState.fase3.answers[index].userAnswer = userAnswer;
            // Case-insensitive and punctuation-agnostic comparison
            appState.fase3.answers[index].isCorrect = userAnswer.toLowerCase().replace(/[.,]/g, '') === correctAnswer.toLowerCase().replace(/[.,]/g, '');
            saveExerciseState(tab); // Auto-save on answer
            renderFase('fase3');
          };
          inputEl.onkeydown = (e) => { // Use onkeydown for single listener
            if (e.key === 'Enter') checkBtn.click();
          };
        }
      }
    }

    /**
     * Rerenders all fases of the exercise.
     */
    function rerenderAll() {
      renderFase('fase1');
      renderFase('fase2');
      renderFase('fase3');
    }

    // Main execution for exercise initialization
    initializeState(); // Load or create initial state
    rerenderAll(); // Render the UI based on the state

    // Attach event listeners for phase tab buttons
    paneElement.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => { // Use onclick for single listener
        const tabNum = btn.id.split('-')[2];
        paneElement.querySelectorAll('.tab-btn').forEach(b => b.classList.replace('tab-active', 'tab-inactive'));
        btn.classList.replace('tab-inactive', 'tab-active');
        paneElement.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        paneElement.querySelector(`#tab-content-${tabNum}`).classList.remove('hidden');
      };
    });

    // Reset button functionality
    const resetBtn = document.getElementById(`reset-btn-${tab.id}`);
    if (resetBtn) {
        resetBtn.onclick = async () => {
            const confirmReset = true; // No confirm dialog
            if (confirmReset) {
                await window.api.resetExerciseState(tab.filePath);
                tab.exerciseState = null;
                initializeState();
                rerenderAll();
                console.log(`Exercise state reset for ${tab.filePath}`);
            }
        };
    }


    // Save/Load functionality
    const saveBtn = document.getElementById(`save-btn-${tab.id}`);
    const loadBtn = document.getElementById(`load-btn-${tab.id}`);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    if (saveBtn) {
        saveBtn.onclick = async () => {
            const dataStr = JSON.stringify(tab.exerciseState, null, 2);
            const defaultFilename = `${tab.title}-manual-progress.json`;
            const result = await window.api.showSaveDialogAndSaveFile(defaultFilename, dataStr);
            if (result.success) {
                console.log(`Manually saved progress to: ${result.path}`);
            } else if (!result.canceled) {
                console.error('Failed to manually save progress:', result.error);
            }
        };
    }

    if (loadBtn) {
        loadBtn.onclick = () => {
            fileInput.click();
        };
    }

    fileInput.onchange = (event) => { // Use onchange for single listener
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const newState = JSON.parse(e.target.result);
          if (newState.fase1 && newState.fase2 && newState.fase3) {
            tab.exerciseState = newState;
            initializeState(); // Re-initialize with loaded state
            rerenderAll(); // Re-render UI
            saveExerciseState(tab); // Auto-save the newly loaded state
            console.log(`Manually loaded progress for ${tab.title}`);
          } else { throw new Error("Invalid JSON structure"); }
        } catch (error) {
          console.error("Error loading JSON:", error);
        }
      };
      reader.readAsText(file);
      fileInput.value = ''; // Reset for next load
    };
  }


  // --- UTILITY & SETUP FUNCTIONS ---

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


  // --- INITIALIZATION ---

  /**
   * Initializes the main application components and event listeners.
   */
  async function initializeApp() {
    displayAppVersion();
    updateNetworkStatus();

    newTabBtn.addEventListener('click', () => addTab(true));
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

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
