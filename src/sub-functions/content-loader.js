import { initializeExercise } from './exercise-initializer.js';
import { initializeGrammarExercise } from './grammar-exercise.js';
import { initializeVerbsExercise } from './verb-exercise.js';

export async function loadContentIntoTab(tabId, filePath, tabs, renderTabs, addTab, saveExerciseState, updateGlobalToolbar, options) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.view = 'content';
    tab.filePath = filePath;
    tab.title = filePath.split('/').pop().replace('.html', '');

    if (updateGlobalToolbar) {
        updateGlobalToolbar(tab);
    }

    const content = await window.api.getFileContent(filePath);
    const pane = document.getElementById(`pane-${tab.id}`);

    if (pane && content) {
        pane.innerHTML = ''; // Clear previous content

        // The content wrapper now takes up the full height and handles its own scrolling
        const contentWrapper = document.createElement('div');
        contentWrapper.className = "lesson-content bg-white text-slate-800 h-full overflow-y-auto p-6 md:p-10";
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;

        // Clean up old save/load buttons if they exist in the HTML file
        const oldButtonContainer = tempDiv.querySelector('#save-btn')?.parentNode;
        if (oldButtonContainer && oldButtonContainer.querySelector('#load-btn')) {
            oldButtonContainer.remove();
        }

        contentWrapper.innerHTML = tempDiv.innerHTML;
        pane.appendChild(contentWrapper);

        if (contentWrapper.querySelector('#exercise-data')) {
            const savedState = await window.api.loadExerciseState(filePath);

            // Validation logic for test pages
            let isValidState = false;
            if (filePath.includes('student-grammar') || filePath.includes('student-verbs')) {
                isValidState = savedState &&
                    typeof savedState === 'object' &&
                    savedState['1'] && savedState['2'] && savedState['3'] &&
                    'completed' in savedState['1'] && 'answers' in savedState['1'] &&
                    'completed' in savedState['2'] && 'answers' in savedState['2'] &&
                    'completed' in savedState['3'] && 'answers' in savedState['3'];
            } else {
                // For now, assume other exercises are valid if they exist.
                isValidState = savedState ? true : false;
            }
    
            tab.exerciseState = isValidState ? savedState : null;
            
            if (filePath.includes('student-grammar')) {
                initializeGrammarExercise(contentWrapper, tab, saveExerciseState);
            } else if (filePath.includes('student-verbs')) {
                initializeVerbsExercise(contentWrapper, tab, saveExerciseState);
            }
            else {
                initializeExercise(contentWrapper, tab, saveExerciseState);
            }
        }
        
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
    const tab = tabs.find(t => t.id === tabId);
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
        console.error("Error fetching home content:", error);
        homeContent = `<div class="p-6 text-red-700 bg-red-100 rounded-lg"><h2 class="font-bold text-lg">Error Loading Home Page</h2><p>Could not load the home page content.</p></div>`;
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
            console.error("Error attaching home event listeners:", error);
        }
    }

    renderTabs();
}

export async function loadSettingsIntoTab(tabId, tabs, renderTabs, updateGlobalToolbar, mostRecentlyLoadedFile) {
    const tab = tabs.find(t => t.id === tabId);
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
                        manualSavePath: manualSavePathInput.value
                    };
                    const result = await window.api.saveConfig(newConfig);
                    if (result.success) {
                        alert('Settings saved successfully!');
                    } else {
                        throw new Error(result.error);
                    }
                } catch (error) {
                    console.error('Failed to save settings:', error);
                    alert(`Failed to save settings: ${error.message}`);
                }
            });
        }

        // --- Populate Save Display Information ---
        if (activeSavesList) {
            const saveFiles = await window.api.getActiveSaveStates();
            activeSavesList.innerHTML = ''; // Clear placeholder
            if (saveFiles && saveFiles.length > 0) {
                saveFiles.forEach(file => {
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
            resetAllSavesBtn.addEventListener('click', async () => {
                const confirmed = confirm('Are you sure you want to delete all auto-saved progress? This action cannot be undone.');
                if (confirmed) {
                    try {
                        const result = await window.api.resetAllAutoSaves();
                        if (result.success) {
                            alert(`Successfully deleted ${result.count} auto-save file(s). The list will now be updated.`);
                            // Refresh the active saves list
                            if (activeSavesList) {
                                activeSavesList.innerHTML = '<li class="italic">No active auto-saves found.</li>';
                            }
                        } else {
                            throw new Error(result.error);
                        }
                    } catch (error) {
                        console.error('Failed to reset all auto-saves:', error);
                        alert(`An error occurred: ${error.message}`);
                    }
                }
            });
        }
    }
    renderTabs();
}

function attachHomeEventListeners(paneElement, tabs, addTab, renderTabs, saveExerciseState, updateGlobalToolbar) {
    const populateList = async (listId, getFiles, folder) => {
      const list = paneElement.querySelector(`#${listId}`);
      if (!list) {
          console.warn(`Home: List element with ID '${listId}' not found.`);
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
        files.forEach(file => {
          const link = document.createElement('a');
          link.href = '#';
          link.textContent = file.replace('.html', '').replace(/-/g, ' ');
          link.className = 'block p-3 bg-slate-700 rounded-md hover:bg-indigo-600 transition-colors font-medium';
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const activeTab = tabs.find(t => t.active);
            if (activeTab.view === 'home') {
              loadContentIntoTab(activeTab.id, `${folder}/${file}`, tabs, renderTabs, addTab, saveExerciseState, updateGlobalToolbar);
            } else {
              addTab(true, `${folder}/${file}`, 'content');
            }
          });
          list.appendChild(link);
        });
      }
      catch (error) {
        console.error(`Home: Failed to load ${folder}:`, error);
        list.innerHTML = `<p class="text-red-400">Error loading ${folder}.</p>`;
      }
    };

    populateList('lessons-list', window.api.getLessons, 'lessons');
    populateList('lessons-an-list', window.api.getLessonsAN, 'lessonsAN');
    populateList('exercises-list', window.api.getExercises, 'exercises');
    populateList('tests-list', window.api.getTests, 'others');
}
