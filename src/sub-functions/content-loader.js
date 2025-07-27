import { initializeExercise } from './exercise-initializer.js';
import { initializeGrammarExercise } from './grammar-exercise.js';
import { initializeVerbsExercise } from './verb-exercise.js';

export async function loadContentIntoTab(tabId, filePath, tabs, renderTabs, addTab) {
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
        contentWrapper.className = "lesson-content bg-slate-200 text-slate-700 flex-grow flex flex-col h-full";

        // Create the toolbar
        const toolbar = document.createElement('div');
        toolbar.className = "flex-shrink-0 sticky top-0 z-10 bg-slate-700 border-b border-slate-600 px-4 py-1 flex justify-between items-center";

        // Left group: Home and Reload
        const leftGroup = document.createElement('div');
        leftGroup.className = 'flex items-center gap-2';
        leftGroup.innerHTML = `
            <button id="home-btn-${tab.id}" title="Go Home" class="p-2 rounded-md hover:bg-slate-600"><svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg></button>
            <button id="reload-btn-${tab.id}" title="Reload Content" class="p-2 rounded-md hover:bg-slate-600"><svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 4l16 16"></path></svg></button>
        `;
        toolbar.appendChild(leftGroup);

        // Right group: Actions and Info
        const rightGroup = document.createElement('div');
        rightGroup.className = 'flex items-center gap-2';
        rightGroup.innerHTML = `
            <button id="save-btn-${tab.id}" class="text-sm bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-lg transition-colors">Salva</button>
            <button id="load-btn-${tab.id}" class="text-sm bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg transition-colors">Carica</button>
            <button id="reset-btn-${tab.id}" class="text-sm bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg transition-colors">Azzera</button>
            <button id="github-btn-${tab.id}" title="Open on GitHub" class="p-2 rounded-md hover:bg-slate-600"><svg class="w-6 h-6 text-slate-400" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg></button>
            <button id="settings-btn-${tab.id}" title="Settings" class="p-2 rounded-md hover:bg-slate-600"><svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></button>
            <div id="update-badge-${tab.id}" class="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-700 hidden" title="Update available!"></div>
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
        document.getElementById(`home-btn-${tab.id}`).addEventListener('click', () => loadHomeIntoTab(tab.id, tabs, renderTabs, addTab));
        document.getElementById(`reload-btn-${tab.id}`).addEventListener('click', () => loadContentIntoTab(tab.id, filePath, tabs, renderTabs, addTab));
        document.getElementById(`github-btn-${tab.id}`).addEventListener('click', () => window.api.openExternalLink('https://github.com/Drehon/vsapp'));
        document.getElementById(`settings-btn-${tab.id}`).addEventListener('click', () => addTab(true, null, 'settings'));


        // Check if the loaded content is an exercise and initialize it
        if (scrollableContent.querySelector('#exercise-data')) {
            const savedState = await window.api.loadExerciseState(filePath);
            tab.exerciseState = savedState ? savedState : null;
            if (filePath.includes('student-grammar')) {
                initializeGrammarExercise(scrollableContent, tab);
            } else if (filePath.includes('student-verbs')) {
                initializeVerbsExercise(scrollableContent, tab);
            } else {
                initializeExercise(scrollableContent, tab); // Pass the scrollable area
            }
        }
    }
    renderTabs(); // Re-render tabs to update title etc.
}

export async function loadHomeIntoTab(tabId, tabs, renderTabs, addTab) {
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
        contentWrapper.className = "h-full flex flex-col bg-slate-600 text-white flex-grow"; // Home theme

        // Create the toolbar for Home
        const toolbar = document.createElement('div');
        toolbar.className = "sticky top-0 z-10 bg-slate-700 border-b border-slate-600 px-4 py-1 flex justify-between items-center";

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
        scrollableContent.className = 'flex-grow overflow-y-auto p-8';
        scrollableContent.innerHTML = homeContent;

        // Assemble the pane
        contentWrapper.appendChild(toolbar);
        contentWrapper.appendChild(scrollableContent);
        pane.appendChild(contentWrapper);

        // Attach event listeners
        document.getElementById(`reload-btn-${tab.id}`).addEventListener('click', () => loadHomeIntoTab(tab.id, tabs, renderTabs, addTab));
        document.getElementById(`github-btn-${tab.id}`).addEventListener('click', () => window.api.openExternalLink('https://github.com/Drehon/vsapp'));
        document.getElementById(`settings-btn-${tab.id}`).addEventListener('click', () => addTab(true, null, 'settings'));
        attachHomeEventListeners(scrollableContent, tabs, addTab, renderTabs);
    }

    renderTabs();
}

export async function loadSettingsIntoTab(tabId, tabs, renderTabs) {
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
      contentWrapper.className = "h-full flex flex-col bg-slate-600 text-white"; // Settings theme

      // Create the toolbar for Settings
      const toolbar = document.createElement('div');
      toolbar.className = "sticky top-0 z-10 bg-slate-700 border-b border-slate-600 px-4 py-1 flex justify-between items-center";
      
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
      scrollableContent.className = 'flex-grow overflow-y-auto p-8';
      scrollableContent.innerHTML = settingsContent;

      // Assemble the pane
      contentWrapper.appendChild(toolbar);
      contentWrapper.appendChild(scrollableContent);
      pane.appendChild(contentWrapper);

      // Attach event listeners
      document.getElementById(`home-btn-${tab.id}`).addEventListener('click', () => loadHomeIntoTab(tab.id, tabs, renderTabs));
      document.getElementById(`reload-btn-${tab.id}`).addEventListener('click', () => loadSettingsIntoTab(tab.id, tabs, renderTabs));
      document.getElementById(`github-btn-${tab.id}`).addEventListener('click', () => window.api.openExternalLink('https://github.com/Drehon/vsapp'));
    }
    renderTabs();
}

function attachHomeEventListeners(paneElement, tabs, addTab, renderTabs) {
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
              loadContentIntoTab(activeTab.id, `${folder}/${file}`, tabs, renderTabs, addTab);
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
