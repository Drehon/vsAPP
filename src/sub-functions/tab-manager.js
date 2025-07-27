export function initializeTabManager(tabs, nextTabId, tabBar, newTabBtn, contentPanes, loadHomeIntoTab, loadContentIntoTab, loadSettingsIntoTab) {
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
          loadHomeIntoTab(tab.id, tabs, renderTabs, addTab);
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
    paneEl.className = 'content-pane h-full w-full flex flex-col';
    contentPanes.appendChild(paneEl);

    if (type === 'content' && filePath) {
      await loadContentIntoTab(newTab.id, filePath, tabs, renderTabs, addTab);
    } else if (type === 'settings') {
      await loadSettingsIntoTab(newTab.id, tabs, renderTabs);
    } else {
      await loadHomeIntoTab(newTab.id, tabs, renderTabs, addTab);
    }

    // Ensure the new tab is marked as active before rendering, or just render if not setting active
    if (setActive) {
      await switchTab(newTab.id);
    } else {
      renderTabs();
    }
  }

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

  return { renderTabs, addTab, switchTab, closeTab };
}
