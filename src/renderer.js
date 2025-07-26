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

function renderTabs() {
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
  
  const activeTab = tabs.find(t => t.active);
  if (activeTab) {
    document.querySelectorAll('.content-pane').forEach(pane => {
      pane.style.display = pane.id === `pane-${activeTab.id}` ? 'block' : 'none';
    });
  }
}

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
  };

  tabs.push(newTab);

  const paneEl = document.createElement('div');
  paneEl.id = `pane-${newTab.id}`;
  paneEl.className = 'content-pane h-full w-full overflow-auto';
  contentPanes.appendChild(paneEl);

  loadHomeIntoTab(newTab.id);
  renderTabs();
}

function switchTab(tabId) {
  tabs.forEach(t => t.active = (t.id === tabId));
  renderTabs();
}

function closeTab(tabId) {
  const tabIndex = tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;

  const pane = document.getElementById(`pane-${tabId}`);
  if (pane) pane.remove();

  const wasActive = tabs[tabIndex].active;
  tabs.splice(tabIndex, 1);

  if (wasActive && tabs.length > 0) {
    const newActiveIndex = Math.max(0, tabIndex - 1);
    tabs[newActiveIndex].active = true;
  } else if (tabs.length === 0) {
    addTab();
    return;
  }

  renderTabs();
}

async function loadContentIntoActiveTab(filePath) {
    const activeTab = tabs.find(t => t.active);
    if (!activeTab) return;

    activeTab.view = 'content';
    activeTab.filePath = filePath;
    activeTab.title = filePath.split('/').pop().replace('.html', '');
    
    const content = await window.api.getFileContent(filePath);
    const activePane = document.getElementById(`pane-${activeTab.id}`);
    
    if (activePane && content) {
        const wrapper = document.createElement('div');
        wrapper.className = "lesson-content bg-slate-200 text-slate-700 h-full overflow-y-auto";
        wrapper.innerHTML = content;
        activePane.innerHTML = '';
        activePane.appendChild(wrapper);

        // Check if the loaded content is an exercise file
        if (wrapper.querySelector('#exercise-data')) {
            initializeExercise(wrapper, activeTab);
        }
    }

    renderTabs();
}

async function loadHomeIntoTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    tab.view = 'home';
    tab.filePath = null;
    tab.title = 'Home';

    const homeContent = await window.api.getHomeContent();
    const pane = document.getElementById(`pane-${tab.id}`);
    
    if (pane && homeContent) {
        pane.innerHTML = homeContent;
        attachHomeEventListeners(pane);
    }
    
    renderTabs();
}

function attachHomeEventListeners(paneElement) {
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

// --- EXERCISE INITIALIZATION LOGIC ---

function initializeExercise(paneElement, tab) {
    const exerciseDataEl = paneElement.querySelector('#exercise-data');
    if (!exerciseDataEl) return;

    const exercises = JSON.parse(exerciseDataEl.textContent);
    const storageKey = `exerciseState-${tab.filePath}`;
    let appState;

    function initializeState() {
        // Initialize state with a new 'phaseNote' for each fase
        const defaultState = {
            fase1: { answers: Array(exercises.fase1.length).fill(null).map(() => ({ userAnswer: null, isCorrect: null, note: "" })), phaseNote: "" },
            fase2: { answers: Array(exercises.fase2.length).fill(null).map(() => ({ userAnswer: null, isCorrect: null, note: "" })), phaseNote: "" },
            fase3: { answers: Array(exercises.fase3.length).fill(null).map(() => ({ userAnswer: null, isCorrect: null, note: "" })), phaseNote: "" },
            currentQuestion: { fase1: 0, fase2: 0, fase3: 0 }
        };
        appState = JSON.parse(localStorage.getItem(storageKey)) || defaultState;
    }

    function saveState() {
        localStorage.setItem(storageKey, JSON.stringify(appState));
    }

    // Modified to return the scoreboard element instead of prepending
    function createScoreboard(fase) {
        const total = exercises[fase].length;
        const current = appState.currentQuestion[fase] + 1;
        const correct = appState[fase].answers.filter(a => a && a.isCorrect).length;
        const answered = appState[fase].answers.filter(a => a && a.userAnswer !== null).length;
        
        const scoreboard = document.createElement('div');
        scoreboard.id = `scoreboard-${fase}`; // Add ID for easier selection
        scoreboard.className = 'flex justify-between items-center text-sm text-slate-500 mb-4 pb-4 border-b border-slate-200';
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
        return scoreboard; // Return the element
    }
    
    // Function to create question-specific notes area
    function createNotesArea(fase, index, container) {
         const notesArea = document.createElement('div');
         notesArea.className = 'mt-4';
         notesArea.innerHTML = `
            <label for="notes-${fase}-${index}" class="block text-sm font-medium text-slate-600">Note per la domanda:</label>
            <textarea id="notes-${fase}-${index}" class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-50" rows="3">${appState[fase].answers[index].note || ''}</textarea>
         `;
         container.appendChild(notesArea);
         
         const textarea = notesArea.querySelector('textarea');
         textarea.addEventListener('keyup', () => {
             appState[fase].answers[index].note = textarea.value;
             saveState();
         });
         return notesArea; // Return the element for consistency, though not used for insertion here
    }

    // Modified to return the phase notes element instead of appending
    function createPhaseNotesArea(fase) {
        let phaseNotesEl = document.createElement('div');
        phaseNotesEl.id = `phase-notes-container-${fase}`;
        phaseNotesEl.className = 'mt-6 p-4 rounded-lg border border-slate-300 bg-slate-50'; // Apply lighter background
        phaseNotesEl.innerHTML = `
            <label for="phase-notes-${fase}" class="block text-sm font-medium text-slate-600">Note per questa fase:</label>
            <textarea id="phase-notes-${fase}" class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-50" rows="4"></textarea>
        `;
        const textarea = phaseNotesEl.querySelector('textarea');
        textarea.value = appState[fase].phaseNote || '';
        textarea.addEventListener('keyup', () => {
            appState[fase].phaseNote = textarea.value;
            saveState();
        });
        return phaseNotesEl; // Return the element
    }

    function createFeedbackArea(fase, index, container, isCorrect, explanation) {
        const feedbackEl = document.createElement('div');
        feedbackEl.className = 'mt-4 p-4 border-l-4 rounded-r-lg';
        feedbackEl.classList.add(isCorrect ? 'feedback-correct' : 'feedback-incorrect');
        
        let markCorrectBtn = '';
        if (!isCorrect) {
            markCorrectBtn = `<button class="mark-correct-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-yellow-800 font-bold py-1 px-2 rounded-lg ml-4" data-fase="${fase}" data-index="${index}">Segna come Corretta</button>`;
        }
        
        feedbackEl.innerHTML = explanation + markCorrectBtn;
        container.appendChild(feedbackEl);

        if (!isCorrect) {
            feedbackEl.querySelector('.mark-correct-btn').addEventListener('click', (e) => {
                const { fase, index } = e.target.dataset;
                appState[fase].answers[parseInt(index)].isCorrect = true;
                saveState();
                rerenderAll();
            });
        }
    }

    function renderFase(fase) {
        const containerId = `tab-content-${fase.slice(-1)}`;
        const container = paneElement.querySelector(`#${containerId}`);
        if (!container) return;

        // Remove existing dynamic elements to re-render them in correct order
        // This is crucial for a clean render without clearing static tab-content structure
        let existingPhaseNotes = container.querySelector(`#phase-notes-container-${fase}`);
        if (existingPhaseNotes) existingPhaseNotes.remove();

        let existingScoreboard = container.querySelector(`#scoreboard-${fase}`);
        if (existingScoreboard) existingScoreboard.remove();

        let existingQuestionWrapper = container.querySelector('.question-wrapper');
        if (existingQuestionWrapper) existingQuestionWrapper.remove();

        // 1. Create and append the Scoreboard first
        const scoreboard = createScoreboard(fase);
        container.appendChild(scoreboard);

        // 2. Create and append the Question Wrapper
        const questionWrapper = document.createElement('div');
        questionWrapper.className = 'question-wrapper';
        container.appendChild(questionWrapper);

        const index = appState.currentQuestion[fase];
        if (index >= exercises[fase].length) {
            questionWrapper.innerHTML = `<div class="text-center p-8"><h3 class="text-xl font-bold">Fase Completata!</h3><p>${appState[fase].answers.filter(a=>a.isCorrect).length} / ${exercises[fase].length} corrette.</p></div>`;
            
            const navContainer = document.createElement('div');
            navContainer.className = "flex justify-center items-center gap-4 pt-4";
            navContainer.innerHTML = `<button id="prev-${fase}" class="bg-slate-500 text-white font-bold py-2 px-6 rounded-lg">Precedente</button>`;
            questionWrapper.appendChild(navContainer); // Append navigation to questionWrapper
            addNavigationListeners(fase, questionWrapper); // Listeners on questionWrapper
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

        questionWrapper.innerHTML = `${contentHTML}<div class="feedback-container mt-4"></div><div class="flex justify-center items-center gap-4 pt-4"><button id="prev-${fase}" class="bg-slate-500 text-white font-bold py-2 px-6 rounded-lg">Precedente</button><button id="next-${fase}" class="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">Prossimo</button></div>`;
        
        // Create and append the question-specific notes area
        createNotesArea(fase, index, questionWrapper); 

        // Create and append the Phase Notes Area within the questionWrapper, AFTER the question-specific notes
        const phaseNotesEl = createPhaseNotesArea(fase);
        questionWrapper.appendChild(phaseNotesEl);


        if (answerState.userAnswer !== null) {
            const feedbackContainer = questionWrapper.querySelector('.feedback-container');
            createFeedbackArea(fase, index, feedbackContainer, answerState.isCorrect, ex.explanation);
            
            if(fase === 'fase1' || fase === 'fase2') {
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
            addPhaseListeners(fase, questionWrapper);
        }

        addNavigationListeners(fase, questionWrapper);
    }
    
    function addNavigationListeners(fase, container) {
        const prevBtn = container.querySelector(`#prev-${fase}`);
        const nextBtn = container.querySelector(`#next-${fase}`);
        const jumpBtn = container.querySelector(`#jump-btn-${fase}`);
        const jumpInput = container.querySelector(`#jump-to-${fase}`);
        const index = appState.currentQuestion[fase];
        const total = exercises[fase].length;

        if (index <= 0) {
            prevBtn.disabled = true;
            prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if (nextBtn && index >= total - 1) {
            nextBtn.textContent = 'Fine';
        }
        
        // Ensure prevBtn exists before adding listener
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (appState.currentQuestion[fase] > 0) {
                    appState.currentQuestion[fase]--;
                    saveState();
                    renderFase(fase);
                }
            });
        }

        if(nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (appState.currentQuestion[fase] < total) {
                    appState.currentQuestion[fase]++;
                    saveState();
                    renderFase(fase);
                }
            });
        }

        // Ensure jumpBtn exists before adding listener
        if (jumpBtn) {
            jumpBtn.addEventListener('click', () => {
                const questionNum = parseInt(jumpInput.value);
                if (questionNum >= 1 && questionNum <= total) { // Corrected condition: <= total
                    appState.currentQuestion[fase] = questionNum - 1;
                    saveState();
                    renderFase(fase);
                }
            });
        }
        
        // Ensure jumpInput exists before adding listener
        if (jumpInput) {
            jumpInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && jumpBtn) { // Also ensure jumpBtn exists for click
                    jumpBtn.click();
                }
            });
        }
    }

    function addPhaseListeners(fase, container) {
        if (fase === 'fase1' || fase === 'fase2') {
            container.querySelectorAll('.fase-btn').forEach(btn => {
                btn.classList.add('btn-neutral');
                btn.addEventListener('click', (e) => {
                    const userAnswer = e.target.dataset.answer === 'true' ? true : e.target.dataset.answer === 'false' ? false : e.target.dataset.answer;
                    const index = appState.currentQuestion[fase];
                    appState[fase].answers[index].userAnswer = userAnswer;
                    appState[fase].answers[index].isCorrect = userAnswer === exercises[fase][index].answer;
                    saveState();
                    renderFase(fase);
                });
            });
        } else { // fase3
            const checkBtn = container.querySelector('#check-fase3');
            const inputEl = container.querySelector('#fase3-input');
            checkBtn.classList.add('btn-neutral');
            checkBtn.addEventListener('click', () => {
                const userAnswer = inputEl.value.trim();
                const index = appState.currentQuestion[fase];
                const correctAnswer = exercises.fase3[index].answer.trim();
                appState.fase3.answers[index].userAnswer = userAnswer;
                appState.fase3.answers[index].isCorrect = userAnswer.toLowerCase().replace(/[.,]/g, '') === correctAnswer.toLowerCase().replace(/[.,]/g, '');
                saveState();
                renderFase('fase3');
            });
            inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkBtn.click(); });
        }
    }
    
    function rerenderAll() {
        renderFase('fase1');
        renderFase('fase2');
        renderFase('fase3');
    }

    // Main execution for exercise
    initializeState();
    rerenderAll();

    // Attach event listeners for tabs and global buttons
    paneElement.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabNum = btn.id.split('-')[2];
            paneElement.querySelectorAll('.tab-btn').forEach(b => b.classList.replace('tab-active', 'tab-inactive'));
            btn.classList.replace('tab-inactive', 'tab-active');
            paneElement.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            paneElement.querySelector(`#tab-content-${tabNum}`).classList.remove('hidden');
        });
    });

    paneElement.querySelector('#reset-btn').addEventListener('click', () => {
        // Replaced confirm() with direct action
        localStorage.removeItem(storageKey);
        initializeState();
        rerenderAll();
    });
    
    // Save/Load functionality
    const saveBtn = paneElement.querySelector('#save-btn');
    const loadBtn = paneElement.querySelector('#load-btn');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    saveBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(appState, null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tab.title}-progress.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    loadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const newState = JSON.parse(e.target.result);
                if (newState.fase1 && newState.fase2 && newState.fase3) {
                    appState = newState;
                    saveState();
                    rerenderAll();
                } else { throw new Error("Invalid JSON structure"); }
            } catch (error) { console.error("Error loading JSON:", error); }
        };
        reader.readAsText(file);
        fileInput.value = ''; // Reset for next load
    });
}


// --- UTILITY & SETUP FUNCTIONS ---

async function displayAppVersion() {
  const version = await window.api.getAppVersion();
  if (appVersionSpan) appVersionSpan.innerText = version;
}

function updateNetworkStatus() {
  const isOnline = navigator.onLine;
  if (networkIndicator) {
    networkIndicator.classList.toggle('bg-green-500', isOnline);
    networkIndicator.classList.toggle('bg-red-500', !isOnline);
  }
  if (networkLabel) networkLabel.innerText = isOnline ? 'Online' : 'Offline';
}


// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
  displayAppVersion();
  updateNetworkStatus();
  
  newTabBtn.addEventListener('click', () => addTab(true));
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  
  addTab(true);
});
