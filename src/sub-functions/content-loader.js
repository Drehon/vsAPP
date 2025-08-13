import hydrateContent from './content-hydrator';

function attachHomeEventListeners(paneElement, tabs, addTab, renderTabs, saveExerciseState, updateGlobalToolbar) {
  const populateList = async (listId, getFiles, folder) => {
    const list = paneElement.querySelector(`#${listId}`);
    if (!list) {
      return;
    }

    list.innerHTML = '<p class="text-slate-400">Loading...</p>';
    try {
      const files = await getFiles();
      list.innerHTML = '';
      if (files.length === 0) {
        list.innerHTML = `<p class="text-slate-400">No ${folder} found.</p>`;
        return;
      }
      files.forEach((file) => {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = file.replace('.html', '').replace(/-/g, ' ');
        link.className = 'block p-3 bg-slate-700 rounded-md hover:bg-indigo-600 transition-colors font-medium';
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const activeTab = tabs.find((t) => t.active);
          if (activeTab.view === 'home') {
            // eslint-disable-next-line no-use-before-define
            loadContentIntoTab(activeTab.id, `${folder}/${file}`, tabs, renderTabs, addTab, saveExerciseState, updateGlobalToolbar);
          } else {
            addTab(true, `${folder}/${file}`, 'content');
          }
        });
        list.appendChild(link);
      });
    } catch (error) {
      list.innerHTML = `<p class="text-red-400">Error loading ${folder}.</p>`;
    }
  };

  populateList('lessons-list', window.api.getLessons, 'lessons');
  populateList('lessons-an-list', window.api.getLessonsAN, 'lessonsAN');
  populateList('exercises-list', window.api.getExercises, 'exercises');
  populateList('tests-list', window.api.getTests, 'others');
}

export async function loadContentIntoTab(tabId, filePath, tabs, renderTabs, addTab, saveExerciseState, updateGlobalToolbar, options) {
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;

  tab.view = 'content';
  tab.filePath = filePath;
  tab.title = filePath.split('/').pop().replace('.html', '');

  const content = await window.api.getFileContent(filePath);
  const pane = document.getElementById(`pane-${tab.id}`);

  if (pane && content) {
    pane.innerHTML = ''; // Clear previous content

    // The content wrapper now takes up the full height and handles its own scrolling
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'lesson-content bg-white text-slate-800 h-full overflow-y-auto p-6 md:p-10';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    // Clean up old save/load buttons if they exist in the HTML file
    const oldButtonContainer = tempDiv.querySelector('#save-btn')?.parentNode;
    if (oldButtonContainer && oldButtonContainer.querySelector('#load-btn')) {
      oldButtonContainer.remove();
    }

    // --- State Loading Fix ---
    // 1. Extract pageId from the content BEFORE hydrating.
    const contentRoot = tempDiv.querySelector('[data-page-id]');
    const pageId = contentRoot ? contentRoot.dataset.pageId : null;

    // Store the pageId on the tab object for universal access
    tab.pageId = pageId;

    // 2. Load state using the correct pageId.
    // The tab's title is used as a fallback to maintain compatibility with legacy content.
    const stateIdentifier = pageId || tab.title;
    const loadedState = await window.api.loadExerciseState(stateIdentifier);
    if (loadedState) {
      tab.exerciseState = loadedState;
    } else {
      // CRITICAL: If no state is loaded, ensure any old in-memory state is cleared.
      // This forces the handler to initialize a fresh state object.
      tab.exerciseState = null;
    }
    // --- End of Fix ---

    // --- Toolbar Update ---
    // The toolbar is updated *after* the pageId is known and state is loaded,
    // ensuring all buttons are correctly configured.
    if (updateGlobalToolbar) {
      updateGlobalToolbar(tab);
    }
    // --- End of Update ---

    contentWrapper.innerHTML = tempDiv.innerHTML;
    pane.appendChild(contentWrapper);

    // The universal hydrator is now called. If state was loaded, the tab object
    // will already have it, and the handler will use it instead of creating a new one.
    hydrateContent(contentWrapper, tab, saveExerciseState);

    // After initialization, restore view state if options are provided
    if (options) {
      // Restore active phase/tab by simulating a click
      if (options.activePhaseId) {
        const phaseButton = pane.querySelector(`#${options.activePhaseId}`);
        if (phaseButton) {
          phaseButton.click(); // This will show the correct tab content
        }
      }

      // Restore scroll position
      if (options.scrollTop) {
        // The scrollable element is the contentWrapper itself
        contentWrapper.scrollTop = options.scrollTop;
      }
    }
  }
  renderTabs();
}

export async function loadHomeIntoTab(tabId, tabs, renderTabs, addTab, saveExerciseState, updateGlobalToolbar) {
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;

  tab.view = 'home';
  tab.filePath = null;
  tab.title = 'Home';

  if (updateGlobalToolbar) {
    updateGlobalToolbar(tab);
  }

  let homeContent = '';
  try {
    homeContent = await window.api.getHomeContent();
  } catch (error) {
    homeContent = '<div class="p-6 text-red-700 bg-red-100 rounded-lg"><h2 class="font-bold text-lg">Error Loading Home Page</h2><p>Could not load the home page content.</p></div>';
  }

  const pane = document.getElementById(`pane-${tab.id}`);
  if (pane) {
    pane.innerHTML = ''; // Clear previous content

    // Home content is wrapped in a div that allows scrolling
    const scrollableContent = document.createElement('div');
    scrollableContent.className = 'h-full overflow-y-auto';
    scrollableContent.innerHTML = homeContent;
    pane.appendChild(scrollableContent);

    try {
      // Attach listeners to the newly added home content
      attachHomeEventListeners(scrollableContent, tabs, addTab, renderTabs, saveExerciseState, updateGlobalToolbar);
    } catch (error) {
      // empty
    }
  }

  renderTabs();
}

export async function loadSettingsIntoTab(tabId, tabs, renderTabs, updateGlobalToolbar, mostRecentlyLoadedFile) {
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;

  tab.view = 'settings';
  tab.filePath = null;
  tab.title = 'Settings';

  if (updateGlobalToolbar) {
    updateGlobalToolbar(tab);
  }

  const settingsContent = await window.api.getSettingsContent();
  const pane = document.getElementById(`pane-${tab.id}`);

  if (pane && settingsContent) {
    pane.innerHTML = ''; // Clear previous content

    const scrollableContent = document.createElement('div');
    scrollableContent.className = 'h-full overflow-y-auto p-8';
    scrollableContent.innerHTML = settingsContent;
    pane.appendChild(scrollableContent);

    // --- Get DOM elements ---
    const autoSavePathInput = scrollableContent.querySelector('#auto-save-path');
    const browseAutoSavePathBtn = scrollableContent.querySelector('#browse-auto-save-path');
    const manualSavePathInput = scrollableContent.querySelector('#manual-save-path');
    const browseManualSavePathBtn = scrollableContent.querySelector('#browse-manual-save-path');
    const saveSettingsBtn = scrollableContent.querySelector('#save-settings-btn');
    const activeSavesList = scrollableContent.querySelector('#active-saves-list');
    const recentLoadDisplay = scrollableContent.querySelector('#recent-load-display');

    // --- Load and Display Configurable Paths ---
    const config = await window.api.getConfig();
    if (config) {
      if (autoSavePathInput) autoSavePathInput.value = config.autoSavePath || '';
      if (manualSavePathInput) manualSavePathInput.value = config.manualSavePath || '';
    }

    // --- Add Event Listeners ---
    if (browseAutoSavePathBtn && autoSavePathInput) {
      browseAutoSavePathBtn.addEventListener('click', async () => {
        const result = await window.api.openDirectoryDialog();
        if (!result.canceled && result.path) {
          autoSavePathInput.value = result.path;
        }
      });
    }

    if (browseManualSavePathBtn && manualSavePathInput) {
      browseManualSavePathBtn.addEventListener('click', async () => {
        const result = await window.api.openDirectoryDialog();
        if (!result.canceled && result.path) {
          manualSavePathInput.value = result.path;
        }
      });
    }

    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', async () => {
        try {
          const currentConfig = await window.api.getConfig();
          const newConfig = {
            ...currentConfig,
            autoSavePath: autoSavePathInput.value,
            manualSavePath: manualSavePathInput.value,
          };
          const result = await window.api.saveConfig(newConfig);
          if (result.success) {
            window.dispatchEvent(new CustomEvent('show-feedback', { detail: { message: 'Settings saved successfully!' } }));
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          window.dispatchEvent(new CustomEvent('show-feedback', { detail: { message: `Failed to save settings: ${error.message}` } }));
        }
      });
    }

    // --- Populate Save Display Information ---
    if (activeSavesList) {
      const saveFiles = await window.api.getActiveSaveStates();
      activeSavesList.innerHTML = ''; // Clear placeholder
      if (saveFiles && saveFiles.length > 0) {
        saveFiles.forEach((file) => {
          const li = document.createElement('li');
          li.textContent = file;
          activeSavesList.appendChild(li);
        });
      } else {
        activeSavesList.innerHTML = '<li class="italic">No active auto-saves found.</li>';
      }
    }

    if (recentLoadDisplay) {
      if (mostRecentlyLoadedFile) {
        recentLoadDisplay.textContent = mostRecentlyLoadedFile;
      } else {
        recentLoadDisplay.innerHTML = '<span class="italic">No file loaded in this session.</span>';
      }
    }

    // --- Add Reset All Saves Logic ---
    const resetAllSavesBtn = scrollableContent.querySelector('#reset-all-saves-btn');
    if (resetAllSavesBtn) {
      const originalButtonParent = resetAllSavesBtn.parentNode;
      let confirmationContainer = null;

      const hideConfirmation = () => {
        if (confirmationContainer) {
          confirmationContainer.remove();
          confirmationContainer = null;
        }
        resetAllSavesBtn.style.display = 'inline-flex';
      };

      const handleNoClick = () => {
        hideConfirmation();
      };

      const handleYesClick = async () => {
        try {
          const result = await window.api.resetAllAutoSaves();
          if (result.success) {
            window.dispatchEvent(new CustomEvent('show-feedback', { detail: { message: `Successfully deleted ${result.count} auto-save file(s).` } }));
            if (activeSavesList) {
              activeSavesList.innerHTML = '<li class="italic">No active auto-saves found.</li>';
            }
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          window.dispatchEvent(new CustomEvent('show-feedback', { detail: { message: `An error occurred: ${error.message}` } }));
        } finally {
          hideConfirmation();
        }
      };

      const showConfirmation = () => {
        resetAllSavesBtn.style.display = 'none';

        confirmationContainer = document.createElement('div');
        confirmationContainer.className = 'flex items-center justify-end space-x-2';

        const areYouSure = document.createElement('span');
        areYouSure.textContent = 'Are you sure?';
        areYouSure.className = 'text-white font-bold mr-4';

        const yesBtn = document.createElement('button');
        yesBtn.textContent = 'Yes';
        yesBtn.className = 'bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors';

        const noBtn = document.createElement('button');
        noBtn.textContent = 'No';
        noBtn.className = 'bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors';

        confirmationContainer.appendChild(areYouSure);
        confirmationContainer.appendChild(yesBtn);
        confirmationContainer.appendChild(noBtn);

        originalButtonParent.appendChild(confirmationContainer);

        yesBtn.addEventListener('click', handleYesClick);
        noBtn.addEventListener('click', handleNoClick);
      };

      resetAllSavesBtn.addEventListener('click', showConfirmation);
    }
  }
  renderTabs();
}
