export default function initializeTabManager(
  tabs,
  nextTabId,
  tabBar,
  newTabBtn,
  contentPanes,
  loadHomeIntoTab,
  loadContentIntoTab,
  loadSettingsIntoTab,
) {
  let nextTabIdState = nextTabId;

  function closeTab(tabId, tabsData, render, add, switchT) {
    const tabIndex = tabsData.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return null;

    const pane = document.getElementById(`pane-${tabId}`);
    if (pane) pane.remove();

    const wasActive = tabsData[tabIndex].active;
    const updatedTabs = tabsData.filter((t) => t.id !== tabId);

    if (wasActive && updatedTabs.length > 0) {
      const newActiveIndex = Math.max(0, tabIndex - 1);
      return switchT(updatedTabs[newActiveIndex].id, updatedTabs, render, add);
    } if (updatedTabs.length === 0) {
      return add(updatedTabs, render, add, switchT);
    }

    render(updatedTabs, tabBar, newTabBtn, loadHomeIntoTab, add, switchT, closeTab);
    return updatedTabs.find((t) => t.active) || null;
  }

  function renderTabs(
    tabsData,
    tabBarEl,
    newTabBtnEl,
    loadHome,
    add,
    switchT,
  ) {
    while (tabBarEl.children.length > 1) {
      tabBarEl.removeChild(tabBarEl.firstChild);
    }

    tabsData.forEach((tab) => {
      const tabEl = document.createElement('div');
      tabEl.id = `tab-${tab.id}`;
      const tabClasses = `flex items-center justify-between h-9 px-4 cursor-pointer border-r border-slate-700 ${
        tab.active ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'
      }`;
      tabEl.className = tabClasses;
      tabEl.innerHTML = `
        <span class="truncate pr-2">${tab.title}</span>
        <button class="close-tab-btn w-6 h-6 rounded-full hover:bg-slate-600 flex-shrink-0 flex items-center justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      `;

      tabEl.addEventListener('click', (e) => {
        if (e.target.closest('.close-tab-btn')) return;
        if (tab.active && tab.view !== 'home') {
          loadHome(tab.id, tabsData, renderTabs, add);
        } else if (!tab.active) {
          switchT(tab.id);
        }
      });

      tabEl.querySelector('.close-tab-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id, tabsData, renderTabs, add, switchT);
      });

      tabBarEl.insertBefore(tabEl, newTabBtnEl);
    });

    const activeTab = tabsData.find((t) => t.active);
    if (activeTab) {
      document.querySelectorAll('.content-pane').forEach((pane) => {
        const p = pane;
        p.style.display = p.id === `pane-${activeTab.id}` ? 'block' : 'none';
      });
    }
  }

  async function switchTab(tabId, tabsData, render, add) {
    const updatedTabs = tabsData.map((t) => ({ ...t, active: t.id === tabId }));
    const newActiveTab = updatedTabs.find((t) => t.active);

    if (newActiveTab) {
      if (newActiveTab.exerciseInstance && typeof newActiveTab.exerciseInstance.render === 'function') {
        newActiveTab.exerciseInstance.render();
      }
    }

    render(updatedTabs, tabBar, newTabBtn, loadHomeIntoTab, add, switchTab, closeTab);
    return newActiveTab;
  }

  async function addTab(
    tabsData,
    render,
    add,
    switchT,
    setActive = true,
    filePath = null,
    type = 'home',
  ) {
    let updatedTabs = tabsData;
    if (setActive) {
      updatedTabs = tabsData.map((t) => ({ ...t, active: false }));
    }

    const newTab = {
      id: nextTabIdState,
      title: 'Home',
      view: 'home',
      filePath: null,
      pageId: null,
      active: true,
      exerciseState: null,
    };
    nextTabIdState += 1;
    updatedTabs.push(newTab);

    const paneEl = document.createElement('div');
    paneEl.id = `pane-${newTab.id}`;
    paneEl.className = 'content-pane h-full w-full';
    contentPanes.appendChild(paneEl);

    if (type === 'content' && filePath) {
      await loadContentIntoTab(newTab.id, filePath, updatedTabs, render, add);
    } else if (type === 'settings') {
      await loadSettingsIntoTab(newTab.id, updatedTabs, render);
    } else {
      await loadHomeIntoTab(newTab.id, updatedTabs, render, add);
    }

    if (setActive) {
      return switchT(newTab.id, updatedTabs, render, add);
    }
    render(updatedTabs, tabBar, newTabBtn, loadHomeIntoTab, add, switchT, closeTab);
    return newTab;
  }

  return {
    renderTabs: (tabsData) => renderTabs(
      tabsData,
      tabBar,
      newTabBtn,
      loadHomeIntoTab,
      (data, render, a, s) => addTab(data, render, a, s),
      (id, data, render, a) => switchTab(id, data, render, a),
    ),
    addTab: (tabsData, setActive, filePath, type) => addTab(
      tabsData,
      (d, r, a, s) => addTab(d, r, a, s),
      (id, d, r, a) => switchTab(id, d, r, a),
      setActive,
      filePath,
      type,
    ),
    switchTab: (tabId, tabsData) => switchTab(
      tabId,
      tabsData,
      (d, r, a, s) => renderTabs(d, r, a, s),
      (d, r, a, s) => addTab(d, r, a, s),
    ),
    closeTab: (tabId, tabsData) => closeTab(
      tabId,
      tabsData,
      (d, r, a, s) => renderTabs(d, r, a, s),
      (d, r, a, s) => addTab(d, r, a, s),
      (id, d, r, a) => switchTab(id, d, r, a),
    ),
  };
}
