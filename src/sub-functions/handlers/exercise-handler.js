/**
 * @file exercise-handler.js
 *
 * Handles the initialization and logic for standard, non-diagnostic interactive exercises.
 * This module is designed to be generic and configurable entirely through the
 * `page-data` JSON object, replacing the old phase-based `exercise-initializer.js`.
 */

// Module-level state variables
let appState; // Holds the current state of the exercise (e.g., answers, current index)
let pageData; // Holds the exercise definition (questions, config, etc.)
let containerElement; // The root element of the content pane

/**
 * Initializes or re-initializes the exercise state.
 * If state is loaded from the tab manager, it's used. Otherwise, a new default state is created.
 * This new state is generic and based on a single, flat array of exercises.
 */
function initializeState() {
  // A tab's state is now managed by the central tab manager.
  // We check if the active tab already has a state for this exercise.
  // This part will be fully integrated with renderer.js and main.js later.
  // For now, we assume a simple structure.
  const existingState = null; // Placeholder for tab.exerciseState

  if (existingState) {
    appState = existingState;
    console.log("Using existing exercise state:", appState);
  } else {
    // Create a new, generic state object.
    appState = {
      currentQuestionIndex: 0,
      // Create a default answer object for each exercise.
      answers: Array(pageData.exercises.length).fill(null).map(() => ({
        userAnswer: null,
        isCorrect: null,
        note: ""
      })),
      // A single notes area for the entire exercise.
      exerciseNote: ""
    };
    console.log("Initialized new generic exercise state:", appState);
  }
}

/**
 * Main rendering function that orchestrates the UI update.
 * It will be responsible for calling all the specific rendering components.
 */
function render() {
    console.log("Render triggered. Current state:", appState);
    if (!containerElement) return;

    // Clear the container for a full re-render (a more sophisticated DOM-diffing could be used later)
    const contentBody = containerElement.querySelector('#content-body');
    if (!contentBody) {
        console.error("Fatal: #content-body not found. Cannot render exercise.");
        return;
    }
    contentBody.innerHTML = ''; // Clear previous content

    // Stubbed functions to be implemented in the next steps
    const scoreboardEl = createScoreboard();
    const questionEl = renderCurrentQuestion();
    const navigationEl = createNavigation();
    
    // Append elements to the content body
    contentBody.appendChild(scoreboardEl);
    contentBody.appendChild(questionEl);
    contentBody.appendChild(navigationEl);

    // Attach event listeners
    addNavigationListeners(navigationEl);
    addAnswerListeners(questionEl);
}

// --- Placeholder/Stub Functions for Future Implementation ---

/**
 * Creates or updates the scoreboard UI component.
 * @returns {HTMLElement} The scoreboard element.
 */
function createScoreboard() {
    const total = pageData.exercises.length;
    const current = appState.currentQuestionIndex + 1;
    const correct = appState.answers.filter(a => a && a.isCorrect).length;
    const answered = appState.answers.filter(a => a && a.userAnswer !== null).length;

    const scoreboard = document.createElement('div');
    scoreboard.id = 'scoreboard';
    scoreboard.className = 'flex justify-between items-center text-sm text-slate-500 mb-4 pb-4 border-b border-slate-200';

    scoreboard.innerHTML = `
        <div class="flex items-center gap-4">
            <span>Domanda: <strong>${current > total ? total : current}/${total}</strong></span>
            <div class="flex items-center gap-1">
                <input type="number" id="jump-to-input" class="w-16 text-center border border-slate-300 rounded-md text-sm p-1" min="1" max="${total}" value="${current > total ? total : current}">
                <button id="jump-to-btn" class="text-xs bg-slate-200 hover:bg-slate-300 font-bold py-1 px-2 rounded-lg">Vai</button>
            </div>
        </div>
        <span>Corrette: <strong>${correct}/${answered}</strong></span>
    `;

    // TODO: Add event listeners for jump-to functionality in a later step.

    return scoreboard;
}

/**
 * Renders the current question based on its type, or a completion message if done.
 * @returns {HTMLElement} The DOM element for the current question.
 */
function renderCurrentQuestion() {
    const index = appState.currentQuestionIndex;
    
    const questionWrapper = document.createElement('div');
    questionWrapper.id = 'question-wrapper';
    questionWrapper.className = 'question-wrapper my-6';

    // Check if the exercise is complete
    if (index >= pageData.exercises.length) {
        questionWrapper.innerHTML = `<div class="text-center p-8"><h3 class="text-xl font-bold">Esercizio Completato!</h3><p>Ottimo lavoro.</p></div>`;
        return questionWrapper;
    }

    const question = pageData.exercises[index];
    const answerState = appState.answers[index];

    // Main container for the question content
    const questionContent = document.createElement('div');
    questionContent.className = 'space-y-4';

    let questionHTML = '';

    // Delegate rendering based on question type
    switch (question.type) {
        case 'true-false':
            questionHTML = renderTrueFalseQuestion(question, answerState);
            break;
        case 'multiple-choice':
            questionHTML = renderMultipleChoiceQuestion(question, answerState);
            break;
        case 'fill-in-the-blank':
            questionHTML = renderFillInTheBlankQuestion(question, answerState);
            break;
        default:
            questionHTML = `<p class="text-red-500">Error: Unknown question type "${question.type}"</p>`;
    }
    
    questionContent.innerHTML = questionHTML;
    questionWrapper.appendChild(questionContent);

    // If the question has been answered, show feedback and notes
    if (answerState && answerState.userAnswer !== null) {
        const feedbackEl = createFeedbackArea(answerState.isCorrect, question.explanation);
        questionWrapper.appendChild(feedbackEl);
    }

    // Always show the notes areas
    const notesEl = createNotesArea(index, answerState);
    questionWrapper.appendChild(notesEl);
    
    const exerciseNotesEl = createExerciseNotesArea();
    questionWrapper.appendChild(exerciseNotesEl);

    return questionWrapper;
}

/**
 * Generates the HTML for a true/false question.
 * @param {object} question - The question data object.
 * @param {object} answerState - The current state of the answer.
 * @returns {string} The HTML string for the question.
 */
function renderTrueFalseQuestion(question, answerState) {
    return `
        <p class="text-lg text-slate-600">La seguente frase è grammaticalmente corretta?</p>
        <div class="p-4 bg-slate-100 rounded-lg text-xl text-center font-semibold text-slate-800">${question.question}</div>
        <div class="flex justify-center space-x-4 pt-4">
            <button class="fase-btn border-2 font-bold py-2 px-8 rounded-lg transition-colors" data-answer="A">Vero</button>
            <button class="fase-btn border-2 font-bold py-2 px-8 rounded-lg transition-colors" data-answer="B">Falso</button>
        </div>
    `;
}

/**
 * Creates the feedback area for an answered question.
 * @param {boolean} isCorrect - Whether the answer was correct.
 * @param {string} explanation - The explanation text.
 * @returns {HTMLElement} The feedback element.
 */
function createFeedbackArea(isCorrect, explanation) {
    const feedbackEl = document.createElement('div');
    feedbackEl.className = `feedback-container mt-4 p-4 border-l-4 rounded-r-lg ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`;

    let markCorrectBtn = '';
    if (!isCorrect) {
        markCorrectBtn = `<button class="mark-correct-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-yellow-800 font-bold py-1 px-2 rounded-lg ml-4">Segna come Corretta</button>`;
    }

    feedbackEl.innerHTML = explanation + markCorrectBtn;
    return feedbackEl;
}

/**
 * Creates the notes area for the current question.
 * @param {number} index - The current question index.
 * @param {object} answerState - The answer state object for the current question.
 * @returns {HTMLElement} The notes area element.
 */
function createNotesArea(index, answerState) {
    const notesArea = document.createElement('div');
    notesArea.className = 'mt-4 p-4 rounded-lg border border-slate-300 bg-slate-50';
    notesArea.innerHTML = `
        <label for="question-notes-${index}" class="block text-sm font-medium text-slate-600">Note per la domanda:</label>
        <textarea id="question-notes-${index}" class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white" rows="3"></textarea>
    `;

    const textarea = notesArea.querySelector('textarea');
    textarea.value = answerState.note || '';
    
    // TODO: Add event listener for saving notes in a later step.
    
    return notesArea;
}

/**
 * Creates the notes area for the entire exercise.
 * @returns {HTMLElement} The exercise notes area element.
 */
function createExerciseNotesArea() {
    const phaseNotesEl = document.createElement('div');
    phaseNotesEl.className = 'mt-6 p-4 rounded-lg border border-slate-300 bg-slate-50';
    phaseNotesEl.innerHTML = `
        <label for="exercise-notes" class="block text-sm font-medium text-slate-600">Note per l'esercizio:</label>
        <textarea id="exercise-notes" class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white" rows="4"></textarea>
    `;
    
    const textarea = phaseNotesEl.querySelector('textarea');
    textarea.value = appState.exerciseNote || '';

    // TODO: Add event listener for saving notes in a later step.

    return phaseNotesEl;
}

/**
 * Generates the HTML for a multiple-choice question.
 * @param {object} question - The question data object.
 * @param {object} answerState - The current state of the answer.
 * @returns {string} The HTML string for the question.
 */
function renderMultipleChoiceQuestion(question, answerState) {
    return `
        <p class="text-lg text-slate-600">Scegli l'opzione corretta per completare la frase.</p>
        <div class="p-4 bg-slate-100 rounded-lg text-xl text-center font-semibold text-slate-800">${question.question}</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            ${question.options.map((opt, i) => `
                <button class="fase-btn border-2 font-bold py-3 px-6 rounded-lg transition-colors" data-answer="${String.fromCharCode(65 + i)}">${opt}</button>
            `).join('')}
        </div>
    `;
}

/**
 * Generates the HTML for a fill-in-the-blank question.
 * @param {object} question - The question data object.
 * @param {object} answerState - The current state of the answer.
 * @returns {string} The HTML string for the question.
 */
function renderFillInTheBlankQuestion(question, answerState) {
    const promptHTML = question.prompt ? `<p class="text-slate-600"><strong>Frase di partenza:</strong> "${question.prompt}"</p>` : '';
    const questionText = question.question.includes('______') 
        ? question.question.replace('______', '<input type="text" id="fill-in-blank-input" class="font-normal text-base border-b-2 border-slate-300 focus:border-indigo-500 outline-none w-1/2 bg-slate-100 p-1 text-center">')
        : `${question.question} <input type="text" id="fill-in-blank-input" class="font-normal text-base border-b-2 border-slate-300 focus:border-indigo-500 outline-none w-1/2 bg-slate-100">`;

    return `
        <p class="text-lg text-slate-600">Riscrivi o completa la frase.</p>
        <div class="p-4 bg-slate-100 rounded-lg space-y-2">
            ${promptHTML}
            <p class="text-xl font-semibold text-slate-800">${questionText}</p>
        </div>
        <div class="flex justify-center space-x-4 pt-4">
            <button id="check-answer-btn" class="fase-btn border-2 font-bold py-2 px-8 rounded-lg transition-colors">Controlla</button>
        </div>
    `;
}

/**
 * Creates the navigation controls (previous/next).
 * @returns {HTMLElement}
 */
function createNavigation() {
    console.log("Stub: createNavigation");
    const el = document.createElement('div');
    el.id = 'navigation-controls';
    el.className = 'flex justify-center items-center gap-4 pt-4';
    el.innerHTML = `
        <button id="prev-btn" class="bg-slate-500 text-white font-bold py-2 px-6 rounded-lg">Precedente</button>
        <button id="next-btn" class="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">Prossimo</button>
    `;
    return el;
}

/**
 * Attaches event listeners for navigation (Prev/Next buttons, jump-to input).
 * @param {HTMLElement} navElement - The element containing navigation controls.
 */
function addNavigationListeners(navElement) {
    const prevBtn = navElement.querySelector('#prev-btn');
    const nextBtn = navElement.querySelector('#next-btn');
    
    const index = appState.currentQuestionIndex;
    const total = pageData.exercises.length;

    if (prevBtn) {
        prevBtn.disabled = index <= 0;
        prevBtn.classList.toggle('opacity-50', index <= 0);
        prevBtn.onclick = () => {
            if (appState.currentQuestionIndex > 0) {
                appState.currentQuestionIndex--;
                render();
                // autoSaveState(); // Will be added later
            }
        };
    }

    if (nextBtn) {
        nextBtn.textContent = index >= total - 1 ? 'Fine' : 'Prossimo';
        nextBtn.onclick = () => {
            // "Fine" button will just go to the completion screen
            if (appState.currentQuestionIndex < total) {
                appState.currentQuestionIndex++;
                render();
                // autoSaveState();
            }
        };
    }

    // Add listeners for the scoreboard's jump-to controls
    const jumpInput = containerElement.querySelector('#jump-to-input');
    const jumpBtn = containerElement.querySelector('#jump-to-btn');

    if (jumpInput && jumpBtn) {
        jumpBtn.onclick = () => {
            const questionNum = parseInt(jumpInput.value);
            if (!isNaN(questionNum) && questionNum >= 1 && questionNum <= total) {
                appState.currentQuestionIndex = questionNum - 1;
                render();
                // autoSaveState();
            }
        };
        jumpInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                jumpBtn.click();
            }
        };
    }
}

/**
 * Attaches event listeners for answering questions, saving notes, and marking answers.
 * @param {HTMLElement} questionElement - The element containing the question inputs.
 */
function addAnswerListeners(questionElement) {
    const index = appState.currentQuestionIndex;
    if (index >= pageData.exercises.length) return; // No listeners if exercise is complete

    const question = pageData.exercises[index];
    const answerState = appState.answers[index];

    // Do not add new listeners if the question is already answered
    if (answerState.userAnswer !== null) {
        // Still need to attach listener for the "Mark as Correct" button
        const markCorrectBtn = questionElement.querySelector('.mark-correct-btn');
        if (markCorrectBtn) {
            markCorrectBtn.onclick = () => {
                appState.answers[index].isCorrect = true;
                // autoSaveState();
                render(); // Re-render to update scoreboard and feedback
            };
        }
    } else {
        // Attach listeners for answering the question based on its type
        switch (question.type) {
            case 'true-false':
            case 'multiple-choice':
                questionElement.querySelectorAll('.fase-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        const userAnswer = e.target.dataset.answer;
                        let correctAnswer = question.answer;

                        // Normalize boolean answers to A/B format for comparison
                        if (typeof correctAnswer === 'boolean') {
                            correctAnswer = correctAnswer ? "A" : "B";
                        }
                        
                        // Normalize word answers to their letter equivalent for multiple choice
                        if (question.type === 'multiple-choice' && !/^[A-D]$/.test(correctAnswer)) {
                             const correctIndex = question.options.indexOf(correctAnswer);
                             if (correctIndex !== -1) {
                                correctAnswer = String.fromCharCode(65 + correctIndex);
                             }
                        }

                        appState.answers[index].userAnswer = userAnswer;
                        appState.answers[index].isCorrect = userAnswer === correctAnswer;
                        // autoSaveState();
                        render();
                    };
                });
                break;

            case 'fill-in-the-blank':
                const checkBtn = questionElement.querySelector('#check-answer-btn');
                const inputEl = questionElement.querySelector('#fill-in-blank-input');
                if (checkBtn && inputEl) {
                    const handleCheck = () => {
                        const userAnswer = inputEl.value.trim();
                        const correctAnswer = question.answer.trim();
                        
                        appState.answers[index].userAnswer = userAnswer;
                        // Case-insensitive and punctuation-agnostic comparison
                        appState.answers[index].isCorrect = userAnswer.toLowerCase().replace(/[.,]/g, '') === correctAnswer.toLowerCase().replace(/[.,]/g, '');
                        
                        // autoSaveState();
                        render();
                    };
                    checkBtn.onclick = handleCheck;
                    inputEl.onkeydown = (e) => {
                        if (e.key === 'Enter') handleCheck();
                    };
                }
                break;
        }
    }

    // Add listeners for notes
    const notesTextarea = questionElement.querySelector(`#question-notes-${index}`);
    if (notesTextarea) {
        notesTextarea.onkeyup = () => {
            appState.answers[index].note = notesTextarea.value;
            // autoSaveState();
        };
    }

    const exerciseNotesTextarea = questionElement.querySelector('#exercise-notes');
    if (exerciseNotesTextarea) {
        exerciseNotesTextarea.onkeyup = () => {
            appState.exerciseNote = exerciseNotesTextarea.value;
            // autoSaveState();
        };
    }
}


/**
 * Initializes the interactive exercise based on the data provided in the DOM.
 * @param {HTMLElement} container - The root element of the exercise content.
 */
export function handleInteractiveExercise(container) {
    console.log("Initializing generic interactive exercise...");
    containerElement = container;

    const pageDataElement = container.querySelector('#page-data');
    if (!pageDataElement) {
        console.error("Could not find #page-data element. Cannot initialize exercise.");
        return;
    }

    try {
        pageData = JSON.parse(pageDataElement.textContent);
        console.log("Exercise data loaded:", pageData);
        
        // This is where the old initializer's logic is replaced.
        // The new JSON format will have a flat "exercises" array.
        // We must convert the old format, inferring the question type along the way.
        if (pageData.fase1) {
            console.warn("Old 'fase' format detected. Converting to generic format for compatibility.");
            
            const fase1Typed = pageData.fase1.map(q => ({ ...q, type: 'true-false' }));
            
            const fase2Typed = pageData.fase2.map(q => {
                // If it has 'options', it's multiple choice. Otherwise, it's a text input fill-in-the-blank.
                const type = q.options && q.options.length > 1 ? 'multiple-choice' : 'fill-in-the-blank';
                return { ...q, type };
            });
            
            const fase3Typed = pageData.fase3.map(q => ({ ...q, type: 'fill-in-the-blank' }));

            pageData.exercises = [...fase1Typed, ...fase2Typed, ...fase3Typed];
            console.log("Data converted to new format with inferred types:", pageData.exercises);
        }

        if (!pageData.exercises) {
            console.error("No 'exercises' array found in page data.");
            return;
        }

        initializeState();
        render();

    } catch (error) {
        console.error("Failed to parse page data JSON or initialize exercise.", error);
    }
}
