import './style.css';
import { initializeTabManager } from './sub-functions/tab-manager.js';
import { loadContentIntoTab, loadHomeIntoTab, loadSettingsIntoTab } from './sub-functions/content-loader.js';
import { initializeExercise } from './sub-functions/exercise-initializer.js';
import { initializeGrammarExercise } from './sub-functions/grammar-exercise.js';
import { initializeVerbsExercise } from './sub-functions/verb-exercise.js';

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
  const { addTab, switchTab, closeTab, renderTabs } = initializeTabManager(
    tabs,
    nextTabId,
    tabBar,
    newTabBtn,
    contentPanes,
    (tabId) => loadHomeIntoTab(tabId, tabs, renderTabs, addTab),
    (tabId, filePath) => loadContentIntoTab(tabId, filePath, tabs, renderTabs, addTab),
    (tabId) => loadSettingsIntoTab(tabId, tabs, renderTabs)
  );


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

      addNavigationListeners(fase, questionWrapper);
    }

    /**
     * Attaches navigation listeners (Previous, Next, Jump) for a given fase.
     * @param {string} fase - The current fase.
     * @param {HTMLElement} container - The DOM element containing the navigation buttons.
     */
    function addNavigationListeners(fase, questionWrapper) {
      const container = paneElement.querySelector(`#tab-content-${fase.slice(-1)}`);
      if (!container) return;

      const prevBtn = questionWrapper.querySelector(`#prev-${fase}`);
      const nextBtn = questionWrapper.querySelector(`#next-${fase}`);
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


  function initializeGrammarExercise(paneElement, tab) {
    const exerciseDataEl = paneElement.querySelector('#exercise-data');
    if (!exerciseDataEl) return;

    const { testData } = JSON.parse(exerciseDataEl.textContent);
    let chartInstances = {};
    let currentBlock = 1;
    let testState = tab.exerciseState || {
        1: { completed: false, answers: {} },
        2: { completed: false, answers: {} },
        3: { completed: false, answers: {} }
    };
    tab.exerciseState = testState;

    const testContainer = paneElement.querySelector('#test-container');
    const diagnosticsView = paneElement.querySelector('#diagnostics-view');
    const questionsContainer = paneElement.querySelector('#questions-container');
    const submissionArea = paneElement.querySelector('#submission-area');
    const form = paneElement.querySelector('#diagnostic-form');
    const tabs = paneElement.querySelectorAll('.tab-btn');
    const diagTabs = paneElement.querySelectorAll('.diag-tab-btn');
    const loadFileInput = paneElement.querySelector('#load-file-input');

    const renderQuestions = (block) => {
        questionsContainer.innerHTML = '';
        
        const blockQuestions = testData.filter(q => q.block === block);
        
        const sections = new Map();
        blockQuestions.forEach(q => {
            if (!sections.has(q.section)) sections.set(q.section, { questions: [], explanation: q.sectionExplanation });
            sections.get(q.section).questions.push(q);
        });

        for (const [sectionName, data] of sections.entries()) {
            const sectionHeader = document.createElement('h3');
            sectionHeader.className = 'text-lg font-bold text-slate-900 mt-6 mb-4 border-b border-slate-200 pb-2';
            sectionHeader.textContent = sectionName;
            questionsContainer.appendChild(sectionHeader);
            
            if (data.explanation) {
                const explanationP = document.createElement('div');
                explanationP.className = 'text-sm text-slate-600 mb-4 prose prose-sm max-w-none';
                explanationP.innerHTML = data.explanation;
                questionsContainer.appendChild(explanationP);
            }

            const questionWithBank = data.questions.find(q => q.wordBank);
            if (questionWithBank) {
                const bank = [...questionWithBank.wordBank.correct, ...questionWithBank.wordBank.intruders, '(leave blank)'];
                for (let i = bank.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [bank[i], bank[j]] = [bank[j], bank[i]];
                }
                
                const wordBankEl = document.createElement('div');
                wordBankEl.className = 'p-4 border-2 border-dashed border-slate-300 rounded-lg mb-4';
                wordBankEl.innerHTML = `
                    <h4 class="font-bold text-sm text-slate-600 mb-2">Word Bank (for Section A only)</h4>
                    <div class="flex flex-wrap gap-2">
                        ${bank.map(word => `<span class="bg-slate-200 text-slate-700 text-sm font-mono py-1 px-2 rounded-md">${word}</span>`).join('')}
                    </div>
                `;
                questionsContainer.appendChild(wordBankEl);
            }
            
            if (data.questions[0].type === 'input_correction') {
                 const example = document.createElement('div');
                 example.className = 'example p-3 rounded-md';
                 example.innerHTML = `<p><strong>Example:</strong></p>
                    <p><em>Original:</em> Despite of his many efforts and working hardly, the manager found that little of his staffs understood their new responsibilities, which was a great disappointment for he and his team.</p>
                    <p><em>Corrected:</em> <strong>Despite</strong> his many efforts and working <strong>hard</strong>, the manager found that <strong>few</strong> of his <strong>staff</strong> understood their new responsibilities, which was a great disappointment for <strong>him</strong> and his team.</p>`;
                questionsContainer.appendChild(example);
            }

            data.questions.forEach(q => {
                const questionWrapper = document.createElement('div');
                questionWrapper.className = 'question-block mb-6';
                questionWrapper.id = `q-wrapper-${q.displayNum}`;

                if (q.type === 'input_correction' || q.type === 'input_rewrite') {
                    // Determine rows based on block and type
                    const rows = (q.block === 3 && q.section.includes('B: Multi-Error Identification II')) ? 5 : 1;
                    questionWrapper.innerHTML = `
                        <p class="mb-3 text-slate-700 leading-relaxed">${createQuestionHTML(q)}</p>
                        <textarea name="q${q.displayNum}" rows="${rows}" class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-slate-100 text-slate-900" autocomplete="off"></textarea>
                        ${createNotesHTML(q.displayNum)} <!-- Pass displayNum for notes -->
                    `;
                } else if (q.type === 'paragraph_input') {
                     let questionHTML = q.question;
                     q.parts.forEach((part, index) => {
                         const partIdName = `q${q.displayNum}_part${index}`; // This is for the input's name attribute
                         const noteIdForPart = `${q.displayNum}_part${index}`; // This is for the note's ID, matching JSON
                         // Notes are now per-input for paragraph_input type
                         const inputHTML = `<span class="inline-block" id="input-wrapper-${partIdName}"><input type="text" name="${partIdName}" class="inline-block w-24 mx-1 text-center rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-slate-100 text-slate-900"></span>${createNotesHTML(noteIdForPart)}`; 
                         questionHTML = questionHTML.replace(`{${index + 1}}`, inputHTML);
                     });
                     questionWrapper.innerHTML = `${questionHTML}`;
                } else { // MC questions
                     questionWrapper.innerHTML = `
                        <p class="mb-3 text-slate-700 leading-relaxed">${createQuestionHTML(q)}</p>
                        ${createNotesHTML(q.displayNum)} <!-- Pass displayNum for notes -->
                     `;
                }
                
                questionsContainer.appendChild(questionWrapper);
            });
        }
        loadNotes();
        addNotesListeners();
        renderSubmissionArea();

        if (testState[block].completed) {
            enterReviewMode(block, testState[block].answers);
        }
    };
    
    function renderSubmissionArea() {
        submissionArea.innerHTML = '';
        if (testState[currentBlock].completed) {
            const p = document.createElement('p');
            p.className = 'text-green-600 font-semibold';
            p.textContent = `Block ${String.fromCharCode(64 + currentBlock)} Completed.`;
            submissionArea.appendChild(p);
        } else {
            submissionArea.innerHTML = `
                <hr class="border-slate-200 my-8">
                <button type="button" id="submit-block-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300 shadow-md">
                    Submit Block ${String.fromCharCode(64 + currentBlock)}
                </button>`;
            paneElement.querySelector('#submit-block-btn').addEventListener('click', handleBlockSubmit);
        }
        
        const completedBlocks = Object.values(testState).filter(b => b.completed).length;
        if (completedBlocks > 0) {
             const buttonContainer = document.createElement('div');
             buttonContainer.className = 'mt-6 flex flex-col md:flex-row justify-center items-center gap-4';
             buttonContainer.innerHTML = `
                <button type="button" id="view-diagnostics-btn" class="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 shadow-md">View Diagnostics</button>
                <button type="button" id="download-notes-btn" class="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 shadow-md">Download All Notes</button>
                <button type="button" id="retake-test-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 shadow-md">Retake Full Test</button>
             `;
             submissionArea.appendChild(buttonContainer);
             paneElement.querySelector('#view-diagnostics-btn').addEventListener('click', showDiagnostics);
             paneElement.querySelector('#download-notes-btn').addEventListener('click', saveProgress); // Renamed
             paneElement.querySelector('#retake-test-btn').addEventListener('click', () => {
                // Using a custom modal for confirmation instead of alert/confirm
                if(confirm('Are you sure you want to retake the entire test? All your progress and notes will be lost.')) {
                    localStorage.clear();
                    window.location.reload();
                }
            });
        }
    }

    function handleBlockSubmit() {
        const userAnswers = {};
        const blockQuestions = testData.filter(q => q.block === currentBlock);
        
        blockQuestions.forEach(q => {
            if (q.type === 'paragraph_input') {
                q.parts.forEach((part, index) => {
                    const inputEl = paneElement.querySelector(`[name="q${q.displayNum}_part${index}"]`);
                    if(inputEl) userAnswers[`q${q.displayNum}_part${index}`] = inputEl.value.trim();
                });
            } else {
                const inputEl = paneElement.querySelector(`[name="q${q.displayNum}"]`);
                if(inputEl) userAnswers[`q${q.displayNum}`] = inputEl.value.trim().replace(/[.,]/g, '');
            }
        });

        testState[currentBlock].completed = true;
        testState[currentBlock].answers = userAnswers;
        saveExerciseState(tab);
        
        enterReviewMode(currentBlock, userAnswers);
        renderSubmissionArea();
    }

    const switchTab = (block) => {
        currentBlock = block;
        tabs.forEach(tab => {
            tab.classList.toggle('tab-active', tab.id === `tab-block-${block}`);
            tab.classList.toggle('tab-inactive', tab.id !== `tab-block-${block}`);
        });
        renderQuestions(currentBlock);
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const block = parseInt(tab.id.split('-')[2]);
            switchTab(block);
        });
    });

    function createQuestionHTML(q) {
        let questionText = `<span class="font-bold">${q.displayNum}.</span> ${q.question}`;
        if (q.type === 'mc') {
            return questionText.replace(/______/g, createDropdown(q.displayNum, q.choices));
        }
        return questionText;
    }

    function createDropdown(displayNum, choices) {
        const options = choices.map((choice, index) => `<option value="${String.fromCharCode(65 + index)}">${choice}</option>`).join('');
        const choiceDisplay = choices.map((choice, index) => 
            `<span class="mc-option-item">(${String.fromCharCode(65 + index)}) ${choice}</span>`
        ).join('');
        return `
            <select name="q${displayNum}" class="inline-select"><option value="">Select...</option>${options}</select>
            <div class="mc-options-display">${choiceDisplay}</div>
        `;
    }

    function createNotesHTML(elementId) { // Renamed parameter to elementId for clarity
        return `
            <div class="mt-2">
                <button type="button" class="notes-toggle-btn text-xs text-slate-500 hover:text-slate-800">Hide Notes</button>
                <div class="notes-content mt-1">
                    <textarea id="notes-${elementId}" placeholder="Notes..." class="w-full h-24 p-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                </div>
            </div>
        `;
    }

    function addNotesListeners() {
        paneElement.querySelectorAll('textarea[id^="notes-"]').forEach(area => {
            area.addEventListener('keyup', (e) => {
                const noteId = e.target.id;
                const questionId = noteId.replace('notes-', '');
                if (!tab.exerciseState.notes) {
                    tab.exerciseState.notes = {};
                }
                tab.exerciseState.notes[questionId] = e.target.value;
                saveExerciseState(tab);
            });
        });
        paneElement.querySelectorAll('.notes-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const content = e.target.nextElementSibling;
                content.classList.toggle('hidden');
                e.target.textContent = content.classList.contains('hidden') ? 'Show Notes' : 'Hide Notes';
            });
        });
    }

    function loadNotes() {
        if (!tab.exerciseState.notes) return;
        // Only load notes for currently rendered elements.
        paneElement.querySelectorAll('textarea[id^="notes-"]').forEach(area => {
            const noteId = area.id;
            const questionId = noteId.replace('notes-', '');
            const savedNote = tab.exerciseState.notes[questionId];
            if (savedNote) {
                area.value = savedNote;
                // Ensure the notes container is visible if there's content
                const notesContentDiv = area.closest('.notes-content');
                const notesToggleButton = notesContentDiv ? notesContentDiv.previousElementSibling : null;
                if (notesContentDiv && notesContentDiv.classList.contains('hidden')) {
                    notesContentDiv.classList.remove('hidden');
                    if (notesToggleButton) {
                        notesToggleButton.textContent = 'Hide Notes';
                    }
                }
            }
        });
    }
    
    function saveProgress() {
        saveExerciseState(tab);
        alert('Progress saved!');
    }

    function loadProgress() {
        loadFileInput.click();
    }

    loadFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedData = JSON.parse(e.target.result);
                
                if (loadedData) {
                    tab.exerciseState = loadedData;
                    testState = loadedData;
                }
                
                let blockToRender = 1;
                for (let i = 1; i <= 3; i++) {
                    if (!testState[i].completed) {
                        blockToRender = i;
                        break;
                    }
                }
                switchTab(blockToRender);
                alert('Progress loaded successfully!');

            } catch (error) {
                alert('Error loading progress: Invalid JSON file or data structure.');
                console.error('Error loading progress:', error);
            }
        };
        reader.readAsText(file);
    });

    paneElement.querySelector('#save-progress-btn').addEventListener('click', saveProgress);
    paneElement.querySelector('#load-progress-btn').addEventListener('click', loadProgress);

    function enterReviewMode(block, userAnswers) {
        paneElement.querySelectorAll(`form input, form select, form textarea`).forEach(el => {
            el.disabled = true;
        });

        const blockQuestions = testData.filter(q => q.block === block);
        blockQuestions.forEach(q => {
            const wrapper = paneElement.querySelector(`#q-wrapper-${q.displayNum}`);
            if (!wrapper) return;

            if (q.type === 'paragraph_input') {
                q.parts.forEach((part, index) => {
                    const partIdName = `q${q.displayNum}_part${index}`;
                    const userAnswer = (userAnswers[partIdName] || '').toLowerCase().replace('(leave blank)', '');
                    const isCorrect = userAnswer === (part.answer === '--' ? '' : part.answer.toLowerCase());
                    const inputEl = paneElement.querySelector(`[name="${partIdName}"]`);
                    
                    if (inputEl) {
                        inputEl.value = userAnswers[partIdName] || ''; // Display user's answer (original case)
                        inputEl.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
                        if (!isCorrect) {
                            const feedbackContainer = document.createElement('div');
                            feedbackContainer.className = 'feedback-container mt-1 flex items-center gap-2';
                            
                            const correctAnswerEl = document.createElement('div');
                            correctAnswerEl.className = 'correct-answer-box text-xs font-semibold bg-green-100 border border-green-200 text-green-800 p-1 rounded';
                            const correctAnswer = part.answer === '--' ? '(blank)' : part.answer;
                            correctAnswerEl.textContent = `Correct: ${correctAnswer}`;
                            
                            const markCorrectBtn = document.createElement('button');
                            markCorrectBtn.type = 'button';
                            markCorrectBtn.className = 'mark-correct-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-1 px-2 rounded-lg transition-colors';
                            markCorrectBtn.textContent = '✓';
                            markCorrectBtn.title = 'Mark as Correct';
                            markCorrectBtn.addEventListener('click', (e) => {
                                inputEl.classList.remove('incorrect-answer');
                                inputEl.classList.add('correct-answer');
                                e.target.parentElement.remove();
                            });

                            feedbackContainer.appendChild(correctAnswerEl);
                            feedbackContainer.appendChild(markCorrectBtn);
                            
                            inputEl.parentElement.appendChild(feedbackContainer);
                        }
                    }
                    const noteIdForPart = `${q.displayNum}_part${index}`;
                    const noteArea = paneElement.querySelector(`#notes-${noteIdForPart}`);
                    if (noteArea) {
                        const savedNote = tab.exerciseState.notes[noteIdForPart];
                        if (savedNote) {
                            noteArea.value = savedNote;
                            const notesContentDiv = noteArea.closest('.notes-content');
                            const notesToggleButton = notesContentDiv ? notesContentDiv.previousElementSibling : null;
                            if (notesContentDiv && notesContentDiv.classList.contains('hidden')) {
                                notesContentDiv.classList.remove('hidden');
                                if (notesToggleButton) {
                                    notesToggleButton.textContent = 'Hide Notes';
                                }
                            }
                        }
                    }
                });
            } else { // Handles mc, input_correction, and input_rewrite
                const inputEl = paneElement.querySelector(`[name="q${q.displayNum}"]`);
                if (!inputEl) return;
                
                const userAnswer = (userAnswers[`q${q.displayNum}`] || '').toLowerCase();
                let isCorrect = false;
                if (q.type === 'mc') {
                    isCorrect = userAnswer.toUpperCase() === q.answer;
                    inputEl.classList.add('review-select');
                    inputEl.value = userAnswer;

                    const optionsDisplay = wrapper.querySelector('.mc-options-display');
                    if (optionsDisplay) {
                        optionsDisplay.querySelectorAll('.mc-option-item').forEach(item => {
                            const optionValue = item.textContent.match(/\((.)\)/)[1];
                            if (optionValue === q.answer) {
                                item.classList.add('correct');
                            }
                            if (optionValue === userAnswer.toUpperCase() && optionValue !== q.answer) {
                                item.classList.add('incorrect-selected');
                            }
                        });
                    }

                } else {
                    isCorrect = userAnswer === q.answer.toLowerCase().replace(/[.,]/g, '');
                    inputEl.value = userAnswers[`q${q.displayNum}`] || '';

                    if (!isCorrect) {
                        const feedbackContainer = document.createElement('div');
                        feedbackContainer.className = 'feedback-container mt-2 flex items-center gap-4';
                        
                        const correctAnswerEl = document.createElement('div');
                        correctAnswerEl.className = 'correct-answer-box text-sm font-semibold bg-green-100 border border-green-200 text-green-800 py-1 px-3 rounded-md';
                        correctAnswerEl.textContent = `Correct: ${q.answer}`;
                        
                        const markCorrectBtn = document.createElement('button');
                        markCorrectBtn.type = 'button';
                        markCorrectBtn.className = 'mark-correct-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-1 px-2 rounded-lg transition-colors';
                        markCorrectBtn.textContent = 'Mark as Correct';
                        markCorrectBtn.addEventListener('click', (e) => {
                            inputEl.classList.remove('incorrect-answer');
                            inputEl.classList.add('correct-answer');
                            e.target.parentElement.remove();
                        });
                        
                        feedbackContainer.appendChild(correctAnswerEl);
                        feedbackContainer.appendChild(markCorrectBtn);
                        inputEl.parentElement.appendChild(feedbackContainer);
                    }
                }
                inputEl.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');

                const noteArea = paneElement.querySelector(`#notes-${q.displayNum}`);
                if (noteArea) {
                    const savedNote = tab.exerciseState.notes[q.displayNum];
                    if (savedNote) {
                        noteArea.value = savedNote;
                        const notesContentDiv = noteArea.closest('.notes-content');
                        const notesToggleButton = notesContentDiv ? notesContentDiv.previousElementSibling : null;
                        if (notesContentDiv && notesContentDiv.classList.contains('hidden')) {
                            notesContentDiv.classList.remove('hidden');
                            if (notesToggleButton) {
                                notesToggleButton.textContent = 'Hide Notes';
                            }
                        }
                    }
                }
            }
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'explain-btn text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-3 rounded-full transition-colors mt-4';
            btn.textContent = 'Explain';
            wrapper.appendChild(btn);
            const explanationContent = document.createElement('div');
            explanationContent.className = 'explanation-content hidden mt-3 pt-3 border-t border-slate-200 text-sm text-slate-700 prose max-w-none';
            if (q.type === 'paragraph_input') {
                 explanationContent.innerHTML = q.parts.map((p, i) => `<div><p><b>Blank ${i+1} (${p.answer === '--' ? 'blank' : p.answer}):</b> ${p.explanation}</p></div>`).join('');
            } else {
                 explanationContent.innerHTML = q.explanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            }
            wrapper.appendChild(explanationContent);
        });

        paneElement.querySelectorAll('.explain-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const content = e.target.closest('.question-block').querySelector('.explanation-content');
                content.classList.toggle('hidden');
                e.target.textContent = content.classList.contains('hidden') ? 'Explain' : 'Hide';
            });
        });
    }
    
    function showDiagnostics() {
        testContainer.classList.add('hidden');
        paneElement.querySelector('#intro-view').classList.add('hidden');
        diagnosticsView.classList.remove('hidden');
        
        const allCompleted = testState[1].completed && testState[2].completed && testState[3].completed;
        
        paneElement.querySelector('#diag-tab-block-a').disabled = !testState[1].completed;
        paneElement.querySelector('#diag-tab-block-b').disabled = !testState[2].completed;
        paneElement.querySelector('#diag-tab-block-c').disabled = !testState[3].completed;
        paneElement.querySelector('#diag-tab-overall').disabled = !allCompleted;

        let firstActiveTab = '';
        if (allCompleted) firstActiveTab = 'overall';
        else if (testState[1].completed) firstActiveTab = 'block-a';
        else if (testState[2].completed) firstActiveTab = 'block-b';
        else if (testState[3].completed) firstActiveTab = 'block-c';
        
        if(firstActiveTab) switchDiagTab(firstActiveTab);

        renderAllCharts();
    }

    function renderAllCharts() {
        const results = [];
        testData.forEach(q => {
            if (!testState[q.block].completed) return;
            const blockAnswers = testState[q.block].answers;
            if (q.type === 'paragraph_input') {
                q.parts.forEach((part, index) => {
                    const userAnswer = (blockAnswers[`q${q.displayNum}_part${index}`] || '').toLowerCase().replace('(leave blank)', '');
                    const isCorrect = userAnswer === (part.answer === '--' ? '' : part.answer.toLowerCase());
                    results.push({ ...q, category: q.category, isCorrect });
                });
            } else {
                 const userAnswer = (blockAnswers[`q${q.displayNum}`] || '').toLowerCase();
                 let isCorrect = false;
                 if (q.type === 'mc') isCorrect = userAnswer.toUpperCase() === q.answer;
                 else isCorrect = userAnswer === q.answer.toLowerCase().replace(/[.,]/g, '');
                 results.push({ ...q, isCorrect });
            }
        });

        if (testState[1].completed && testState[2].completed && testState[3].completed) {
            renderDiagnosticChart('overallChart', results);
        }
        if (testState[1].completed) renderDiagnosticChart('blockAChart', results.filter(r => r.block === 1));
        if (testState[2].completed) renderDiagnosticChart('blockBChart', results.filter(r => r.block === 2));
        if (testState[3].completed) renderDiagnosticChart('blockCChart', results.filter(r => r.block === 3));
    }

    function renderDiagnosticChart(canvasId, results) {
        const categories = [...new Set(results.map(r => r.category))];
        
        const categoryData = categories.map(cat => {
            const catQuestions = results.filter(r => r.category === cat);
            const correctCount = catQuestions.filter(r => r.isCorrect).length;
            const totalCount = catQuestions.length;
            const score = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
            return { category: cat, score, raw: `${correctCount}Q/${totalCount}Q` };
        });

        const ctx = paneElement.querySelector(`#${canvasId}`).getContext('2d');
        if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
        
        chartInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categoryData.map(d => d.category),
                datasets: [{
                    label: '% Correct',
                    data: categoryData.map(d => d.score),
                    backgroundColor: 'rgba(79, 70, 229, 0.6)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { beginAtZero: true, max: 100, ticks: { color: '#64748b' }, grid: { color: 'rgba(226, 232, 240, 0.5)' } },
                    y: { ticks: { color: '#334155' }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.raw.toFixed(1)}%` } },
                    datalabels: {
                        anchor: 'end', align: 'end', color: '#1e293b', font: { weight: 'bold' },
                        formatter: (value, context) => categoryData[context.dataIndex].raw
                    }
                }
            }
        });
    }

    paneElement.querySelector('#back-to-review-btn').addEventListener('click', () => {
        diagnosticsView.classList.add('hidden');
        testContainer.classList.remove('hidden');
        paneElement.querySelector('#intro-view').classList.remove('hidden');
        renderQuestions(currentBlock); 
    });

    function switchDiagTab(tabName) {
        const targetId = `diag-content-${tabName}`;
        diagTabs.forEach(t => {
            t.classList.toggle('tab-active', t.dataset.tab === tabName);
            t.classList.toggle('tab-inactive', t.dataset.tab !== tabName);
        });
        paneElement.querySelectorAll('.diag-content').forEach(content => {
            content.classList.toggle('hidden', content.id !== targetId);
        });
    }

    diagTabs.forEach(tab => {
        tab.addEventListener('click', () => { if(!tab.disabled) switchDiagTab(tab.dataset.tab); });
    });


    switchTab(currentBlock);
  }

  function initializeVerbsExercise(paneElement, tab) {
    const exerciseDataEl = paneElement.querySelector('#exercise-data');
    if (!exerciseDataEl) return;

    const { testData } = JSON.parse(exerciseDataEl.textContent);
    let chartInstances = {};
    let currentBlock = 1;
    let testState = tab.exerciseState || {
        1: { completed: false, answers: {} },
        2: { completed: false, answers: {} },
        3: { completed: false, answers: {} }
    };
    tab.exerciseState = testState;

    const testContainer = paneElement.querySelector('#test-container');
    const diagnosticsView = paneElement.querySelector('#diagnostics-view');
    const questionsContainer = paneElement.querySelector('#questions-container');
    const submissionArea = paneElement.querySelector('#submission-area');
    const form = paneElement.querySelector('#diagnostic-form');
    const tabs = paneElement.querySelectorAll('.tab-btn');
    const diagTabs = paneElement.querySelectorAll('.diag-tab-btn');
    const loadFileInput = paneElement.querySelector('#load-file-input');

        const renderQuestions = (block) => {
            questionsContainer.innerHTML = '';
            
            const blockQuestions = testData.filter(q => q.block === block);
            
            const sections = new Map();
            blockQuestions.forEach(q => {
                if (!sections.has(q.section)) sections.set(q.section, { questions: [], explanation: q.sectionExplanation });
                sections.get(q.section).questions.push(q);
            });

            for (const [sectionName, data] of sections.entries()) {
                const sectionHeader = document.createElement('h3');
                sectionHeader.className = 'text-lg font-bold text-slate-900 mt-6 mb-4 border-b border-slate-200 pb-2';
                sectionHeader.textContent = sectionName;
                questionsContainer.appendChild(sectionHeader);
                
                if (data.explanation) {
                    const explanationP = document.createElement('div'); // Changed to div to allow ul
                    explanationP.className = 'text-sm text-slate-600 mb-4 prose prose-sm max-w-none';
                    explanationP.innerHTML = data.explanation;
                    questionsContainer.appendChild(explanationP);
                }

                if (sectionName === 'A: Contextual Multiple-Choice' && block === 1) {
                    const emailContainer = document.createElement('div');
                    emailContainer.className = 'p-4 border border-slate-200 rounded-lg mb-6 bg-slate-50';
                    emailContainer.innerHTML = `
                        <p class="font-bold text-slate-800">To: Sarah Jenkins</p>
                        <p class="font-bold text-slate-800">From: Mark Gibbons</p>
                        <p class="mb-4 font-bold text-slate-800">Subject: Urgent: Quarterly Report Figures</p>
                        <div id="q-wrapper-A1" class="text-slate-700 leading-relaxed">Hi Sarah,<br><br>I ${createDropdown('A1', testData.find(q => q.displayNum === 'A1').choices)} the draft of the quarterly report you sent over this morning, and it looks solid. ${createNotesHTML('A1')}</div>
                        <div id="q-wrapper-A2" class="text-slate-700 leading-relaxed mt-2">However, a few of the final sales figures from the European division are missing. According to the project timeline, the complete report ${createDropdown('A2', testData.find(q => q.displayNum === 'A2').choices)} to the board by this Friday. We need to ensure all data is included. ${createNotesHTML('A2')}</div>
                        <div id="q-wrapper-A3" class="text-slate-700 leading-relaxed mt-2">I spoke to Jean-Paul from the Paris office. He said the delay ${createDropdown('A3', testData.find(q => q.displayNum === 'A3').choices)} by an unexpected server update last night. ${createNotesHTML('A3')}</div>
                        <div id="q-wrapper-A4" class="text-slate-700 leading-relaxed mt-2">He assured me that the final numbers are being compiled now. Neither Jean-Paul nor his team members ${createDropdown('A4', testData.find(q => q.displayNum === 'A4').choices)}. ${createNotesHTML('A4')}</div>
                        <div id="q-wrapper-A5" class="text-slate-700 leading-relaxed mt-2">Let's plan to have the final version of the report ${createDropdown('A5', testData.find(q => q.displayNum === 'A5').choices)}. ${createNotesHTML('A5')}</div>
                        <p class="text-slate-700 mt-4">Thanks,<br>Mark</p>
                    `;
                    questionsContainer.appendChild(emailContainer);
                } else {
                    data.questions.forEach(q => {
                        const questionWrapper = document.createElement('div');
                        questionWrapper.className = 'question-block mb-6';
                        questionWrapper.id = `q-wrapper-${q.displayNum}`;

                        if (q.type === 'input') {
                             questionWrapper.innerHTML = `
                                <p class="mb-3 text-slate-700 leading-relaxed">${createQuestionHTML(q)}</p>
                                <textarea name="q${q.displayNum}" rows="1" class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-slate-100 text-slate-900" autocomplete="off"></textarea>
                                ${createNotesHTML(q.displayNum)}
                            `;
                        } else if (q.type === 'paragraph_error_id') {
                            const para = document.createElement('div');
                            para.innerHTML = q.question;
                            questionWrapper.appendChild(para);

                            const inputsContainer = document.createElement('div');
                            inputsContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4';
                            q.parts.forEach((part, index) => {
                                const inputId = `q${q.displayNum}_part${index}`;
                                const inputGroup = document.createElement('div');
                                inputGroup.className = 'flex items-center';
                                inputGroup.innerHTML = `
                                    <label for="${inputId}" class="w-32 text-sm text-slate-500 font-mono text-right pr-4">${part.label} &rarr;</label>
                                    <input type="text" id="${inputId}" name="${inputId}" class="flex-grow block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-slate-100 text-slate-900">
                                `;
                                inputsContainer.appendChild(inputGroup);
                            });
                            questionWrapper.appendChild(inputsContainer);
                            questionWrapper.insertAdjacentHTML('beforeend', createNotesHTML(q.displayNum));

                        } else { // MC questions
                             questionWrapper.innerHTML = `
                                <p class="mb-3 text-slate-700 leading-relaxed">${createQuestionHTML(q)}</p>
                                ${createNotesHTML(q.displayNum)}
                            `;
                        }
                        questionsContainer.appendChild(questionWrapper);
                    });
                }
            }
            loadNotes();
            addNotesListeners();
            renderSubmissionArea();

            if (testState[block].completed) {
                enterReviewMode(block, testState[block].answers);
            }
        };
        
        function renderSubmissionArea() {
            submissionArea.innerHTML = '';
            if (testState[currentBlock].completed) {
                const p = document.createElement('p');
                p.className = 'text-green-600 font-semibold';
                p.textContent = `Block ${String.fromCharCode(64 + currentBlock)} Completed.`;
                submissionArea.appendChild(p);
            } else {
                submissionArea.innerHTML = `
                    <hr class="border-slate-200 my-8">
                    <button type="button" id="submit-block-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300 shadow-md">
                        Submit Block ${String.fromCharCode(64 + currentBlock)}
                    </button>`;
                paneElement.querySelector('#submit-block-btn').addEventListener('click', handleBlockSubmit);
            }
            
            const completedBlocks = Object.values(testState).filter(b => b.completed).length;
            if (completedBlocks > 0) {
                 const buttonContainer = document.createElement('div');
                 buttonContainer.className = 'mt-6 flex flex-col md:flex-row justify-center items-center gap-4';
                 buttonContainer.innerHTML = `
                    <button type="button" id="view-diagnostics-btn" class="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 shadow-md">View Diagnostics</button>
                    <button type="button" id="download-notes-btn" class="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 shadow-md">Download All Notes</button>
                    <button type="button" id="retake-test-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 shadow-md">Retake Full Test</button>
                 `;
                 submissionArea.appendChild(buttonContainer);
                 paneElement.querySelector('#view-diagnostics-btn').addEventListener('click', showDiagnostics);
                 paneElement.querySelector('#download-notes-btn').addEventListener('click', saveProgress); // Renamed
                 paneElement.querySelector('#retake-test-btn').addEventListener('click', () => {
                    if(confirm('Are you sure you want to retake the entire test? All your progress and notes will be lost.')) {
                        localStorage.clear(); // Clears all local storage for the domain, including notes
                        window.location.reload();
                    }
                });
            }
        }

        function handleBlockSubmit() {
            const userAnswers = {};
            const blockQuestions = testData.filter(q => q.block === currentBlock);
            
            blockQuestions.forEach(q => {
                if (q.type === 'paragraph_error_id') {
                    q.parts.forEach((part, index) => {
                        const inputEl = paneElement.querySelector(`[name="q${q.displayNum}_part${index}"]`);
                        if(inputEl) userAnswers[`q${q.displayNum}_part${index}`] = inputEl.value.trim().toLowerCase();
                    });
                } else {
                    const inputEl = paneElement.querySelector(`[name="q${q.displayNum}"]`);
                    if(inputEl) userAnswers[`q${q.displayNum}`] = inputEl.value.trim().toLowerCase();
                }
            });

            testState[currentBlock].completed = true;
            testState[currentBlock].answers = userAnswers;
            saveExerciseState(tab);
            
            enterReviewMode(currentBlock, userAnswers);
            renderSubmissionArea();
        }

        const switchTab = (block) => {
            currentBlock = block;
            tabs.forEach(tab => {
                tab.classList.toggle('tab-active', tab.id === `tab-block-${block}`);
                tab.classList.toggle('tab-inactive', tab.id !== `tab-block-${block}`);
            });
            renderQuestions(currentBlock);
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const block = parseInt(tab.id.split('-')[2]);
                switchTab(block);
            });
        });
        
        function createQuestionHTML(q) {
            if (q.type === 'mc') {
                return `<span class="font-bold">${q.displayNum}.</span> ${q.question.replace(/______/g, createDropdown(q.displayNum, q.choices))}`;
            } else {
                return `<span class="font-bold">${q.displayNum}.</span> ${q.question}`;
            }
        }

        function createDropdown(displayNum, choices) {
            const options = choices.map((choice, index) => `<option value="${String.fromCharCode(65 + index)}">${choice}</option>`).join('');
            const choiceDisplay = choices.map((choice, index) => 
                `<span class="mc-option-item">(${String.fromCharCode(65 + index)}) ${choice}</span>`
            ).join('');
            return `
                <select name="q${displayNum}" class="inline-select"><option value="">Select...</option>${options}</select>
                <div class="mc-options-display">${choiceDisplay}</div>
            `;
        }

        function createNotesHTML(displayNum) {
            return `
                <div class="mt-2">
                    <button type="button" class="notes-toggle-btn text-xs text-slate-500 hover:text-slate-800">Hide Notes</button>
                    <div class="notes-content mt-1">
                        <textarea id="notes-${displayNum}" placeholder="Notes..." class="w-full h-24 p-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                </div>
            `;
        }

        function addNotesListeners() {
            paneElement.querySelectorAll('textarea[id^="notes-"]').forEach(area => {
                area.addEventListener('keyup', (e) => {
                    const noteId = e.target.id;
                    const questionId = noteId.replace('notes-', '');
                    if (!tab.exerciseState.notes) {
                        tab.exerciseState.notes = {};
                    }
                    tab.exerciseState.notes[questionId] = e.target.value;
                    saveExerciseState(tab);
                });
            });
            paneElement.querySelectorAll('.notes-toggle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const content = e.target.nextElementSibling;
                    content.classList.toggle('hidden');
                    e.target.textContent = content.classList.contains('hidden') ? 'Show Notes' : 'Hide Notes';
                });
            });
        }

        function loadNotes() {
            if (!tab.exerciseState.notes) return;
            paneElement.querySelectorAll('textarea[id^="notes-"]').forEach(area => {
                const noteId = area.id;
                const questionId = noteId.replace('notes-', '');
                const savedNote = tab.exerciseState.notes[questionId];
                if (savedNote) {
                    area.value = savedNote;
                }
            });
        }
        
        function saveProgress() {
            saveExerciseState(tab);
            alert('Progress saved!');
        }

        function loadProgress() {
            loadFileInput.click();
        }

        loadFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const loadedData = JSON.parse(e.target.result);
                    
                    if (loadedData) {
                        tab.exerciseState = loadedData;
                        testState = loadedData;
                    }
                    
                    let blockToRender = 1;
                    for (let i = 1; i <= 3; i++) {
                        if (!testState[i].completed) {
                            blockToRender = i;
                            break;
                        }
                    }
                    switchTab(blockToRender);
                    alert('Progress loaded successfully!');

                } catch (error) {
                    alert('Error loading progress: Invalid JSON file or data structure.');
                    console.error('Error loading progress:', error);
                }
            };
            reader.readAsText(file);
        });

        paneElement.querySelector('#save-progress-btn').addEventListener('click', saveProgress);
        paneElement.querySelector('#load-progress-btn').addEventListener('click', loadProgress);

        function enterReviewMode(block, userAnswers) {
            paneElement.querySelectorAll(`form input, form select, form textarea`).forEach(el => {
                el.disabled = true;
            });

            const blockQuestions = testData.filter(q => q.block === block);
            blockQuestions.forEach(q => {
                const wrapper = paneElement.querySelector(`#q-wrapper-${q.displayNum}`);
                if (!wrapper) return;

                if (q.type === 'paragraph_error_id') {
                    q.parts.forEach((part, index) => {
                        const partIdName = `q${q.displayNum}_part${index}`;
                        const userAnswer = userAnswers[partIdName] || '';
                        const isCorrect = userAnswer === part.answer.toLowerCase();
                        const inputEl = paneElement.querySelector(`[name="${partIdName}"]`);
                        if (inputEl) {
                            inputEl.value = userAnswer; // Display user's answer
                            inputEl.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
                            
                            const feedbackContainer = document.createElement('div');
                            feedbackContainer.className = 'feedback-container mt-1 ml-32 pl-4 flex items-center gap-4';
                            
                            const correctAnswerEl = document.createElement('div');
                            correctAnswerEl.className = 'correct-answer-text text-sm text-green-600 font-semibold';
                            correctAnswerEl.textContent = `Correct: ${part.answer}`;
                            feedbackContainer.appendChild(correctAnswerEl);

                            if (!isCorrect) {
                                const markCorrectBtn = document.createElement('button');
                                markCorrectBtn.type = 'button';
                                markCorrectBtn.className = 'mark-correct-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-1 px-2 rounded-lg transition-colors';
                                markCorrectBtn.textContent = 'Mark as Correct';
                                feedbackContainer.appendChild(markCorrectBtn);
                            }
                            inputEl.parentElement.appendChild(feedbackContainer);
                        }
                    });
                     const btn = document.createElement('button');
                     btn.type = 'button';
                     btn.className = 'explain-btn text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-3 rounded-full transition-colors mt-4';
                     btn.textContent = 'Explain';
                     wrapper.appendChild(btn);
                     const explanationContent = document.createElement('div');
                     explanationContent.className = 'explanation-content hidden mt-3 pt-3 border-t border-slate-200 text-sm text-slate-700 prose max-w-none';
                     explanationContent.innerHTML = q.parts.map(p => `<div><p><b>${p.label} &rarr; ${p.answer}:</b> ${p.explanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p></div>`).join('');
                     wrapper.appendChild(explanationContent);

                } else {
                    const inputEl = paneElement.querySelector(`[name="q${q.displayNum}"]`);
                    if (!inputEl) return;
                    
                    const userAnswer = userAnswers[`q${q.displayNum}`] || '';
                    let isCorrect = false;
                    if (q.type === 'mc') {
                        isCorrect = userAnswer.toUpperCase() === q.answer;
                        inputEl.classList.add('review-select');
                        inputEl.value = userAnswer; // Set selected value for MC

                        const optionsDisplay = wrapper.querySelector('.mc-options-display');
                        if (optionsDisplay) {
                            optionsDisplay.querySelectorAll('.mc-option-item').forEach(item => {
                                const optionValue = item.textContent.match(/\((.)\)/)[1]; // Extract A, B, C, D
                                if (optionValue === q.answer) {
                                    item.classList.add('correct');
                                }
                                if (optionValue === userAnswer.toUpperCase() && optionValue !== q.answer) {
                                    item.classList.add('incorrect-selected');
                                }
                            });
                        }

                    } else { // For 'input' type (sentence transformation)
                        isCorrect = userAnswer.toLowerCase() === q.answer.toLowerCase(); // Compare lowercase answers
                        inputEl.value = userAnswer; // Display user's answer
                    }
                    
                    inputEl.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
                    
                    if (!isCorrect) {
                        const feedbackContainer = document.createElement('div');
                        feedbackContainer.className = 'feedback-container mt-2 flex items-center gap-4';
                        
                        const correctAnswerEl = document.createElement('div');
                        correctAnswerEl.className = 'correct-answer-text text-sm text-green-600 font-semibold';
                        let correctAnswerText = q.type === 'mc' ? `Correct: (${q.answer}) ${q.choices[q.answer.charCodeAt(0) - 65]}` : `Correct: ${q.answer}`;
                        correctAnswerEl.textContent = correctAnswerText;
                        
                        const markCorrectBtn = document.createElement('button');
                        markCorrectBtn.type = 'button';
                        markCorrectBtn.className = 'mark-correct-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-1 px-2 rounded-lg transition-colors';
                        markCorrectBtn.textContent = 'Mark as Correct';
                        
                        feedbackContainer.appendChild(correctAnswerEl);
                        feedbackContainer.appendChild(markCorrectBtn);
                        inputEl.parentElement.appendChild(feedbackContainer);
                    }
                    
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'explain-btn text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-3 rounded-full transition-colors mt-4';
                    btn.textContent = 'Explain';
                    
                    const explanationContent = document.createElement('div');
                    explanationContent.className = 'explanation-content hidden mt-3 pt-3 border-t border-slate-200 text-sm text-slate-700 prose max-w-none';
                    explanationContent.innerHTML = q.explanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    
                    wrapper.appendChild(btn);
                    wrapper.appendChild(explanationContent);
                }
            });

            paneElement.querySelectorAll('.explain-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const content = e.target.parentElement.querySelector('.explanation-content');
                    content.classList.toggle('hidden');
                    e.target.textContent = content.classList.contains('hidden') ? 'Explain' : 'Hide';
                });
            });

            paneElement.querySelectorAll('.mark-correct-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const button = e.target;
                    const feedbackContainer = button.parentElement;
                    const inputEl = feedbackContainer.parentElement.querySelector('[name^="q"], [id^="q"]');
                    
                    if (inputEl) {
                        inputEl.classList.remove('incorrect-answer');
                        inputEl.classList.add('correct-answer');
                    }
                    
                    feedbackContainer.remove();
                });
            });
        }
        
        function showDiagnostics() {
            testContainer.classList.add('hidden');
            paneElement.querySelector('#intro-view').classList.add('hidden');
            diagnosticsView.classList.remove('hidden');
            
            const allCompleted = testState[1].completed && testState[2].completed && testState[3].completed;
            
            paneElement.querySelector('#diag-tab-block-a').disabled = !testState[1].completed;
            paneElement.querySelector('#diag-tab-block-b').disabled = !testState[2].completed;
            paneElement.querySelector('#diag-tab-block-c').disabled = !testState[3].completed;
            paneElement.querySelector('#diag-tab-overall').disabled = !allCompleted;

            let firstActiveTab = '';
            if (allCompleted) {
                firstActiveTab = 'overall';
            } else if (testState[1].completed) {
                firstActiveTab = 'block-a';
            } else if (testState[2].completed) {
                firstActiveTab = 'block-b';
            } else if (testState[3].completed) {
                firstActiveTab = 'block-c';
            }
            
            if(firstActiveTab) {
                switchDiagTab(firstActiveTab);
            }

            renderAllCharts();
        }

        function renderAllCharts() {
            const results = [];
            testData.forEach(q => {
                if (!testState[q.block].completed) return;
                const blockAnswers = testState[q.block].answers;
                if (q.type === 'paragraph_error_id') {
                    q.parts.forEach((part, index) => {
                        results.push({ ...part, block: q.block, category: q.category, isCorrect: (blockAnswers[`q${q.displayNum}_part${index}`] || '').toLowerCase() === part.answer.toLowerCase() });
                    });
                } else {
                     const userAnswer = blockAnswers[`q${q.displayNum}`] || '';
                     let isCorrect = false;
                     if (q.type === 'mc') {
                         isCorrect = userAnswer.toUpperCase() === q.answer;
                     } else {
                         isCorrect = userAnswer.toLowerCase() === q.answer.toLowerCase(); // Ensure case-insensitive comparison
                     }
                    results.push({ ...q, isCorrect });
                }
            });

            if (testState[1].completed && testState[2].completed && testState[3].completed) {
                renderDiagnosticChart('overallChart', results);
            }
            if (testState[1].completed) renderDiagnosticChart('blockAChart', results.filter(r => r.block === 1));
            if (testState[2].completed) renderDiagnosticChart('blockBChart', results.filter(r => r.block === 2));
            if (testState[3].completed) renderDiagnosticChart('blockCChart', results.filter(r => r.block === 3));
        }

        function renderDiagnosticChart(canvasId, results) {
            const categories = [...new Set(results.map(r => r.category))];
            
            const categoryData = categories.map(cat => {
                const catQuestions = results.filter(r => r.category === cat);
                const correctCount = catQuestions.filter(r => r.isCorrect).length;
                const totalCount = catQuestions.length;
                const score = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
                return { category: cat, score, raw: `${correctCount}Q/${totalCount}Q` };
            });

            const ctx = paneElement.querySelector(`#${canvasId}`).getContext('2d');
            if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
            
            chartInstances[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: categoryData.map(d => d.category),
                    datasets: [{
                        label: '% Correct',
                        data: categoryData.map(d => d.score),
                        backgroundColor: 'rgba(79, 70, 229, 0.6)',
                        borderColor: 'rgba(99, 102, 241, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { color: '#64748b' },
                            grid: { color: 'rgba(226, 232, 240, 0.5)' }
                        },
                        y: {
                            ticks: { color: '#334155' },
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.dataset.label}: ${context.raw.toFixed(1)}%`
                            }
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'end',
                            color: '#1e293b',
                            font: { weight: 'bold' },
                            formatter: (value, context) => {
                                return categoryData[context.dataIndex].raw;
                            }
                        }
                    }
                }
            });
        }

        paneElement.querySelector('#back-to-review-btn').addEventListener('click', () => {
            diagnosticsView.classList.add('hidden');
            testContainer.classList.remove('hidden');
            paneElement.querySelector('#intro-view').classList.remove('hidden');
        });

        function switchDiagTab(tabName) {
            const targetId = `diag-content-${tabName}`;
            diagTabs.forEach(t => {
                t.classList.toggle('tab-active', t.dataset.tab === tabName);
                t.classList.toggle('tab-inactive', t.dataset.tab !== tabName);
            });
            paneElement.querySelectorAll('.diag-content').forEach(content => {
                content.classList.toggle('hidden', content.id !== targetId);
            });
        }

        diagTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if(!tab.disabled) {
                    switchDiagTab(tab.dataset.tab);
                }
            });
        });

        renderQuestions(currentBlock);
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
