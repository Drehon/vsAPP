export function initializeExercise(paneElement, tab, saveExerciseState) {
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
