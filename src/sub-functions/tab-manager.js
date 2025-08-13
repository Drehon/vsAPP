// eslint-disable-next-line import/prefer-default-export
export function initializeTabManager(tabs, nextTabId, tabBar, newTabBtn, contentPanes, loadHomeIntoTab, loadContentIntoTab, loadSettingsIntoTab, updateGlobalToolbar) {
  let localNextTabId = nextTabId;
  const manager = {};

  manager.renderTabs = () => {
    while (tabBar.children.length > 1) {
      tabBar.removeChild(tabBar.firstChild);
    }

    tabs.forEach((tab) => {
      const tabEl = document.createElement('div');
      tabEl.id = `tab-${tab.id}`;
      tabEl.className = `flex items-center justify-between h-9 px-4 cursor-pointer border-r border-slate-700 ${tab.active ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`;
      tabEl.innerHTML = `
        <span class="truncate pr-2">${tab.title}</span>
        <button class="close-tab-btn w-6 h-6 rounded-full hover:bg-slate-600 flex-shrink-0 flex items-center justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      `;

      tabEl.addEventListener('click', (e) => {
        if (e.target.closest('.close-tab-btn')) return;
        if (tab.active && tab.view !== 'home') {
          loadHomeIntoTab(tab.id, tabs, manager.renderTabs, manager.addTab);
        } else if (!tab.active) {
          manager.switchTab(tab.id);
        }
      });

      tabEl.querySelector('.close-tab-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        manager.closeTab(tab.id);
      });

      tabBar.insertBefore(tabEl, newTabBtn);
    });

    const activeTab = tabs.find((t) => t.active);
    if (activeTab) {
      document.querySelectorAll('.content-pane').forEach((pane) => {
        const paneToModify = pane;
        paneToModify.style.display = pane.id === `pane-${activeTab.id}` ? 'block' : 'none';
      });
    }
  };

  manager.addTab = async (setActive = true, filePath = null, type = 'home') => {
    if (setActive) {
      tabs.forEach((t) => {
        const tabToModify = t;
        tabToModify.active = false;
      });
    }

    const newTab = {
      id: localNextTabId,
      title: 'Home',
      view: 'home',
      filePath: null,
      pageId: null, // Add pageId property
      active: true,
      exerciseState: null,
    };
    localNextTabId += 1;
    tabs.push(newTab);

    const paneEl = document.createElement('div');
    paneEl.id = `pane-${newTab.id}`;
    paneEl.className = 'content-pane h-full w-full';
    contentPanes.appendChild(paneEl);

    if (type === 'content' && filePath) {
      await loadContentIntoTab(newTab.id, filePath, tabs, manager.renderTabs, manager.addTab);
    } else if (type === 'settings') {
      await loadSettingsIntoTab(newTab.id, tabs, manager.renderTabs);
    } else {
      await loadHomeIntoTab(newTab.id, tabs, manager.renderTabs, manager.addTab);
    }

    if (setActive) {
      return manager.switchTab(newTab.id);
    }
    manager.renderTabs();
    return newTab;
  };

  manager.switchTab = async (tabId) => {
    tabs.forEach((t) => {
      const tabToModify = t;
      tabToModify.active = (t.id === tabId);
    });
    const newActiveTab = tabs.find((t) => t.active);

    if (newActiveTab) {
      // This is the critical fix for the unresponsive UI bug.
      // After switching tabs, we check if the newly active tab has an
      // exercise handler instance attached to it.
      if (newActiveTab.exerciseInstance && typeof newActiveTab.exerciseInstance.render === 'function') {
        // If it does, we call its render() method. This forces the UI
        // of the exercise to be completely redrawn using its own correct,
        // isolated state, ensuring the view is always in sync.
        newActiveTab.exerciseInstance.render();
      }
    }
    if (updateGlobalToolbar) {
      updateGlobalToolbar(newActiveTab);
    }

    manager.renderTabs();
    return newActiveTab;
  };

  manager.closeTab = (tabId) => {
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return null;

    const pane = document.getElementById(`pane-${tabId}`);
    if (pane) pane.remove();

    const wasActive = tabs[tabIndex].active;
    tabs.splice(tabIndex, 1);

    if (wasActive && tabs.length > 0) {
      const newActiveIndex = Math.max(0, tabIndex - 1);
      return manager.switchTab(tabs[newActiveIndex].id);
    } if (tabs.length === 0) {
      return manager.addTab();
    }

    manager.renderTabs();
    return tabs.find((t) => t.active) || null;
  };

  return {
    renderTabs: manager.renderTabs,
    addTab: manager.addTab,
    switchTab: manager.switchTab,
    closeTab: manager.closeTab,
  };
}
