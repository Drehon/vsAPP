/**
 * @file exercise-handler.js
 *
 * Handles the initialization and logic for standard, non-diagnostic interactive exercises.
 * This module is designed to be generic and configurable entirely through the
 * `page-data` JSON object. It uses a class-based approach to ensure each
 * exercise tab has an isolated instance, preventing state conflicts.
 */

export class ExerciseHandler {
  /**
     * Initializes the interactive exercise based on the data provided in the DOM.
     * @param {HTMLElement} container - The root element of the exercise content.
     * @param {object} tab - The active tab object from the renderer.
     * @param {function} saveFunc - The function to call to auto-save the exercise state.
     */
  constructor(container, tab, saveFunc) {
    console.log('Initializing ExerciseHandler instance...');
    this.containerElement = container;
    this.activeTab = tab;
    this.autoSave = saveFunc;
    this.pageData = null;

    const pageDataElement = this.containerElement.querySelector('#page-data');
    if (!pageDataElement) {
      console.error('Could not find #page-data element. Cannot initialize exercise.');
      return;
    }

    try {
      this.pageData = JSON.parse(pageDataElement.textContent);
      console.log('Exercise data loaded:', this.pageData);

      if (!this.pageData.blocks) {
        console.error("No 'blocks' array found in page data.");
        return;
      }

      this.initializeState();
      this.render();
    } catch (error) {
      console.error('Failed to parse page data JSON or initialize exercise.', error);
    }
  }

  /**
     * Initializes or re-initializes the exercise state directly on the tab object.
     */
  initializeState() {
    if (this.activeTab.exerciseState && this.activeTab.exerciseState.version === 2) {
      console.log('Using existing block-aware exercise state:', this.activeTab.exerciseState);
    } else {
      this.activeTab.exerciseState = {
        version: 2,
        currentBlockIndex: 0,
        answers: this.pageData.blocks.map((block) => Array(block.exercises.length).fill(null).map(() => ({
          userAnswer: null,
          isCorrect: null,
          note: '',
          submitted: false,
        }))),
        blockNotes: Array(this.pageData.blocks.length).fill(''),
        currentQuestionIndexes: Array(this.pageData.blocks.length).fill(0),
      };
      console.log('Initialized new block-aware exercise state:', this.activeTab.exerciseState);
    }
  }

  /**
     * Main rendering function that orchestrates the UI update.
     */
  render() {
    console.log('Render triggered. Current state:', this.activeTab.exerciseState);
    if (!this.containerElement) return;

    const contentBody = this.containerElement.querySelector('#content-body');
    if (!contentBody) {
      console.error('Fatal: #content-body not found. Cannot render exercise.');
      return;
    }
    contentBody.innerHTML = '';

    const blockTabsEl = this.createBlockTabs();
    contentBody.appendChild(blockTabsEl);

    const exerciseContainer = document.createElement('div');
    exerciseContainer.id = 'exercise-container';
    exerciseContainer.className = 'p-4 md:p-6 border border-t-0 rounded-b-lg border-slate-300';
    contentBody.appendChild(exerciseContainer);

    const scoreboardEl = this.createScoreboard();
    const questionEl = this.renderCurrentQuestion();

    exerciseContainer.appendChild(scoreboardEl);
    exerciseContainer.appendChild(questionEl);

    this.addNavigationListeners(questionEl);
    this.addAnswerListeners(questionEl);
    this.addBlockTabListeners(blockTabsEl);
  }

  /**
     * Creates the tabbed interface for switching between exercise blocks.
     * @returns {HTMLElement} The element containing the block tabs.
     */
  createBlockTabs() {
    const blockTabsContainer = document.createElement('div');
    blockTabsContainer.className = 'flex justify-between items-center border-b border-slate-300';

    const tabs = document.createElement('div');
    tabs.className = 'flex';
    this.pageData.blocks.forEach((block, index) => {
      const isActive = index === this.activeTab.exerciseState.currentBlockIndex;
      const button = document.createElement('button');
      button.dataset.blockIndex = index;
      button.textContent = block.name;
      button.className = `py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
      }`;
      tabs.appendChild(button);
    });
    blockTabsContainer.appendChild(tabs);

    const resetButton = document.createElement('button');
    resetButton.id = 'reset-block-btn';
    resetButton.className = 'text-xs bg-red-100 hover:bg-red-200 text-red-700 font-bold py-1 px-3 rounded-lg mr-2';
    resetButton.textContent = 'Reset Fase';
    blockTabsContainer.appendChild(resetButton);

    return blockTabsContainer;
  }

  /**
     * Adds event listeners to the block tabs.
     */
  addBlockTabListeners(blockTabsEl) {
    blockTabsEl.querySelectorAll('div > button').forEach((button) => {
      button.onclick = (e) => {
        const blockIndex = parseInt(e.target.dataset.blockIndex, 10);
        if (this.activeTab.exerciseState.currentBlockIndex !== blockIndex) {
          this.activeTab.exerciseState.currentBlockIndex = blockIndex;
          this.autoSave(this.activeTab);
          this.render();
        }
      };
    });

    const resetBlockBtn = blockTabsEl.querySelector('#reset-block-btn');
    if (resetBlockBtn) {
      resetBlockBtn.onclick = () => {
        const state = this.activeTab.exerciseState;
        const blockIndex = state.currentBlockIndex;
        const totalQuestionsInBlock = this.pageData.blocks[blockIndex].exercises.length;

        state.answers[blockIndex] = Array(totalQuestionsInBlock).fill(null).map(() => ({ userAnswer: null, isCorrect: null, note: '' }));
        state.blockNotes[blockIndex] = '';
        state.currentQuestionIndexes[blockIndex] = 0;
        this.render();
        this.autoSave(this.activeTab);
      };
    }
  }

  /**
     * Creates or updates the scoreboard UI component.
     */
  createScoreboard() {
    const state = this.activeTab.exerciseState;
    const blockIndex = state.currentBlockIndex;
    const block = this.pageData.blocks[blockIndex];
    const total = block.exercises.length;
    const current = state.currentQuestionIndexes[blockIndex] + 1;

    const blockAnswers = state.answers[blockIndex];
    const correct = blockAnswers.filter((a) => a && a.isCorrect).length;
    const answered = blockAnswers.filter((a) => a && a.userAnswer !== null).length;

    const scoreboard = document.createElement('div');
    scoreboard.id = 'scoreboard';
    scoreboard.className = 'flex justify-between items-center text-sm text-slate-500 mb-4 pb-4 border-b border-slate-200';

    scoreboard.innerHTML = `
            <div class="flex items-center gap-4">
                <span>Domanda: <strong>${current > total ? total : current}/${total}</strong></span>
                <div class="flex items-center gap-1">
                    <input type="number" id="jump-to-input" class="w-16 text-center border border-slate-300 rounded-md text-sm p-1" min="1" max="${total}" value="${current > total ? total : current}">
                    <button id="jump-to-btn" class="text-xs bg-slate-200 hover:bg-slate-300 font-bold py-1 px-2 rounded-lg">Vai</button>
                    <button id="first-question-btn" class="text-xs bg-slate-200 hover:bg-slate-300 font-bold py-1 px-2 rounded-lg">Torna alla D.1</button>
                </div>
            </div>
            <span>Corrette: <strong>${correct}/${answered}</strong></span>
        `;
    return scoreboard;
  }

  /**
     * Renders the current question based on its type, or a completion message if done.
     */
  renderCurrentQuestion() {
    const state = this.activeTab.exerciseState;
    const blockIndex = state.currentBlockIndex;
    const questionIndex = state.currentQuestionIndexes[blockIndex];
    const block = this.pageData.blocks[blockIndex];

    const questionWrapper = document.createElement('div');
    questionWrapper.id = 'question-wrapper';
    questionWrapper.className = 'question-wrapper my-6';

    if (questionIndex >= block.exercises.length) {
      questionWrapper.innerHTML = '<div class="text-center p-8"><h3 class="text-xl font-bold">Fase Completata!</h3><p>Puoi passare alla fase successiva o rivedere le tue risposte.</p></div>';
      return questionWrapper;
    }

    const question = block.exercises[questionIndex];
    const answerState = state.answers[blockIndex][questionIndex];
    const questionContent = document.createElement('div');
    questionContent.className = 'space-y-4';

    let questionHTML = '';
    switch (question.type) {
      case 'true-false':
        questionHTML = this.renderTrueFalseQuestion(question, answerState);
        break;
      case 'multiple-choice':
        questionHTML = this.renderMultipleChoiceQuestion(question, answerState);
        break;
      case 'fill-in-the-blank':
        questionHTML = this.renderFillInTheBlankQuestion(question, answerState);
        break;
      default:
        questionHTML = `<p class="text-red-500">Error: Unknown question type "${question.type}"</p>`;
    }

    questionContent.innerHTML = questionHTML;
    questionWrapper.appendChild(questionContent);

    if (answerState && answerState.userAnswer !== null) {
      const feedbackEl = this.createFeedbackArea(answerState.isCorrect, question.explanation);
      questionWrapper.appendChild(feedbackEl);
    }

    const navigationEl = this.createNavigation();
    questionWrapper.appendChild(navigationEl);

    const notesEl = this.createNotesArea(blockIndex, questionIndex, answerState);
    questionWrapper.appendChild(notesEl);

    const blockNotesEl = this.createBlockNotesArea(blockIndex);
    questionWrapper.appendChild(blockNotesEl);

    return questionWrapper;
  }

  /**
     * Generates the HTML for a true/false question.
     */
  renderTrueFalseQuestion(question, answerState) {
    const hasAnswered = answerState && answerState.userAnswer !== null;
    const isCorrect = answerState && answerState.isCorrect;
    const userAnswer = answerState && answerState.userAnswer;
    const correctAnswer = question.answer ? 'A' : 'B';

    const getButtonClasses = (buttonAnswer) => {
      let classes = 'fase-btn border-2 font-bold py-2 px-8 rounded-lg transition-colors';
      if (!hasAnswered) return classes;
      if (buttonAnswer === userAnswer) {
        classes += isCorrect ? ' btn-correct' : ' btn-incorrect';
      } else if (buttonAnswer === correctAnswer && !isCorrect) {
        classes += ' feedback-correct-outline';
      }
      return classes;
    };

    const disabled = hasAnswered ? 'disabled' : '';

    return `
            <p class="text-lg text-slate-600">La seguente frase è grammaticalmente corretta?</p>
            <div class="p-4 bg-slate-100 rounded-lg text-xl text-center font-semibold text-slate-800">${question.question}</div>
            <div class="flex justify-center space-x-4 pt-4">
                <button class="${getButtonClasses('A')}" data-answer="A" ${disabled}>Vero</button>
                <button class="${getButtonClasses('B')}" data-answer="B" ${disabled}>Falso</button>
            </div>
        `;
  }

  /**
     * Generates the HTML for a multiple-choice question.
     */
  renderMultipleChoiceQuestion(question, answerState) {
    const hasAnswered = answerState && answerState.userAnswer !== null;
    const isCorrect = answerState && answerState.isCorrect;
    const userAnswer = answerState && answerState.userAnswer;
    const submitted = answerState && answerState.submitted;

    let correctAnswer = question.answer;
    if (!/^[A-D]$/.test(correctAnswer)) {
      const correctIndex = question.options.indexOf(correctAnswer);
      if (correctIndex !== -1) {
        correctAnswer = String.fromCharCode(65 + correctIndex);
      }
    }

    const getButtonClasses = (buttonAnswer) => {
      let classes = 'fase-btn border-2 font-bold py-3 px-6 rounded-lg transition-colors';
      if (!hasAnswered) return classes;
      if (buttonAnswer === userAnswer) {
        classes += isCorrect ? ' btn-correct' : ' btn-incorrect';
      } else if (buttonAnswer === correctAnswer && !isCorrect) {
        classes += ' feedback-correct-outline';
      }
      return classes;
    };

    const disabled = hasAnswered ? 'disabled' : '';

    let questionHTML = question.question;
    if (submitted && !hasAnswered) {
      questionHTML = question.question.replace('______', '<span class="unanswered-blank" style="background-color: #FECACA;">______</span>');
    }

    return `
            <p class="text-lg text-slate-600">Scegli l'opzione corretta per completare la frase.</p>
            <div class="p-4 bg-slate-100 rounded-lg text-xl text-center font-semibold text-slate-800">${questionHTML}</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                ${question.options.map((opt, i) => {
    const buttonAnswer = String.fromCharCode(65 + i);
    return `<button class="${getButtonClasses(buttonAnswer)}" data-answer="${buttonAnswer}" ${disabled}>${opt}</button>`;
  }).join('')}
            </div>
        `;
  }

  /**
     * Generates the HTML for a fill-in-the-blank question.
     */
  renderFillInTheBlankQuestion(question, answerState) {
    const hasAnswered = answerState && answerState.userAnswer !== null;
    const isCorrect = answerState && answerState.isCorrect;
    const userAnswer = answerState ? (answerState.userAnswer || '') : '';

    let inputClasses = 'font-normal text-base border-b-2 focus:border-indigo-500 outline-none w-1/2 p-1 text-center';
    if (hasAnswered) {
      inputClasses += isCorrect ? ' input-correct' : ' input-incorrect';
    } else {
      inputClasses += ' border-slate-300 bg-slate-100';
    }

    const disabled = hasAnswered ? 'disabled' : '';
    const inputValue = `value="${userAnswer.replace(/"/g, '&quot;')}"`;
    const promptHTML = question.prompt ? `<p class="text-slate-600"><strong>Frase di partenza:</strong> "${question.prompt}"</p>` : '';
    const inputElement = `<input type="text" id="fill-in-blank-input" class="${inputClasses}" ${inputValue} ${disabled}>`;
    const questionText = question.question.includes('______')
      ? question.question.replace('______', inputElement)
      : `${question.question} ${inputElement}`;

    const buttonHTML = hasAnswered
      ? ''
      : '<button id="check-answer-btn" class="fase-btn border-2 font-bold py-2 px-8 rounded-lg transition-colors">Controlla</button>';

    return `
            <p class="text-lg text-slate-600">Riscrivi o completa la frase.</p>
            <div class="p-4 bg-slate-100 rounded-lg space-y-2">
                ${promptHTML}
                <p class="text-xl font-semibold text-slate-800">${questionText}</p>
            </div>
            <div class="flex justify-center space-x-4 pt-4">
                ${buttonHTML}
            </div>
        `;
  }

  /**
     * Creates the feedback area for an answered question.
     */
  createFeedbackArea(isCorrect, explanation) {
    const feedbackEl = document.createElement('div');
    feedbackEl.className = `feedback-container mt-4 p-4 border-l-4 rounded-r-lg ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`;
    const markCorrectBtn = !isCorrect ? '<button class="mark-correct-btn text-xs bg-yellow-400 hover:bg-yellow-500 text-yellow-800 font-bold py-1 px-2 rounded-lg ml-4">Segna come Corretta</button>' : '';
    feedbackEl.innerHTML = explanation + markCorrectBtn;
    return feedbackEl;
  }

  /**
     * Creates the notes area for the current question.
     */
  createNotesArea(blockIndex, questionIndex, answerState) {
    const notesArea = document.createElement('div');
    notesArea.className = 'mt-4 p-4 rounded-lg border border-slate-300 bg-slate-50';
    const noteId = `question-notes-${blockIndex}-${questionIndex}`;
    notesArea.innerHTML = `
            <label for="${noteId}" class="block text-sm font-medium text-slate-600">Note per la domanda:</label>
            <textarea id="${noteId}" class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white" rows="3"></textarea>
        `;
    const textarea = notesArea.querySelector('textarea');
    textarea.value = answerState.note || '';
    return notesArea;
  }

  /**
     * Creates the notes area for the current block.
     */
  createBlockNotesArea(blockIndex) {
    const blockNotesEl = document.createElement('div');
    blockNotesEl.className = 'mt-6 p-4 rounded-lg border border-slate-300 bg-slate-50';
    blockNotesEl.innerHTML = `
            <label for="block-notes" class="block text-sm font-medium text-slate-600">Note per questa fase:</label>
            <textarea id="block-notes" class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white" rows="4"></textarea>
        `;
    const textarea = blockNotesEl.querySelector('textarea');
    textarea.value = this.activeTab.exerciseState.blockNotes[blockIndex] || '';
    return blockNotesEl;
  }

  /**
     * Creates the navigation controls (previous/next).
     */
  createNavigation() {
    const el = document.createElement('div');
    el.id = 'navigation-controls';
    el.className = 'flex justify-center items-center gap-4 pt-4 mt-4 border-t border-slate-200';
    el.innerHTML = `
            <button id="prev-btn" class="bg-slate-500 text-white font-bold py-2 px-6 rounded-lg">Precedente</button>
            <button id="next-btn" class="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">Prossimo</button>
        `;
    return el;
  }

  /**
     * Attaches event listeners for navigation.
     */
  addNavigationListeners(questionEl) {
    const state = this.activeTab.exerciseState;
    const blockIndex = state.currentBlockIndex;
    const questionIndex = state.currentQuestionIndexes[blockIndex];
    const totalQuestionsInBlock = this.pageData.blocks[blockIndex].exercises.length;

    const prevBtn = questionEl.querySelector('#prev-btn');
    const nextBtn = questionEl.querySelector('#next-btn');
    const firstQuestionBtn = this.containerElement.querySelector('#first-question-btn');

    if (prevBtn) {
      prevBtn.disabled = questionIndex <= 0;
      prevBtn.classList.toggle('opacity-50', questionIndex <= 0);
      prevBtn.onclick = () => {
        if (questionIndex > 0) {
          state.answers[blockIndex][questionIndex].submitted = true;
          state.currentQuestionIndexes[blockIndex]--;
          this.render();
          this.autoSave(this.activeTab);
        }
      };
    }

    if (nextBtn) {
      nextBtn.textContent = questionIndex >= totalQuestionsInBlock - 1 ? 'Fine Blocco' : 'Prossimo';
      nextBtn.onclick = () => {
        if (questionIndex < totalQuestionsInBlock) {
          state.answers[blockIndex][questionIndex].submitted = true;
          state.currentQuestionIndexes[blockIndex]++;
          this.render();
          this.autoSave(this.activeTab);
        }
      };
    }

    if (firstQuestionBtn) {
      firstQuestionBtn.disabled = questionIndex === 0;
      firstQuestionBtn.classList.toggle('opacity-50', questionIndex === 0);
      firstQuestionBtn.onclick = () => {
        state.currentQuestionIndexes[blockIndex] = 0;
        this.render();
        this.autoSave(this.activeTab);
      };
    }

    const jumpInput = this.containerElement.querySelector('#jump-to-input');
    const jumpBtn = this.containerElement.querySelector('#jump-to-btn');

    if (jumpInput && jumpBtn) {
      jumpBtn.onclick = () => {
        const questionNum = parseInt(jumpInput.value);
        if (!isNaN(questionNum) && questionNum >= 1 && questionNum <= totalQuestionsInBlock) {
          state.currentQuestionIndexes[blockIndex] = questionNum - 1;
          this.render();
          this.autoSave(this.activeTab);
        }
      };
      jumpInput.onkeydown = (e) => { if (e.key === 'Enter') jumpBtn.click(); };
    }
  }

  /**
     * Attaches event listeners for answering questions, saving notes, and marking answers.
     */
  addAnswerListeners(questionElement) {
    const state = this.activeTab.exerciseState;
    const blockIndex = state.currentBlockIndex;
    const questionIndex = state.currentQuestionIndexes[blockIndex];
    const totalQuestionsInBlock = this.pageData.blocks[blockIndex].exercises.length;

    if (questionIndex >= totalQuestionsInBlock) return;

    const question = this.pageData.blocks[blockIndex].exercises[questionIndex];
    const answerState = state.answers[blockIndex][questionIndex];

    if (answerState.userAnswer !== null) {
      const markCorrectBtn = questionElement.querySelector('.mark-correct-btn');
      if (markCorrectBtn) {
        markCorrectBtn.onclick = () => {
          state.answers[blockIndex][questionIndex].isCorrect = true;
          this.autoSave(this.activeTab);
          this.render();
        };
      }
    } else {
      switch (question.type) {
        case 'true-false':
        case 'multiple-choice':
          questionElement.querySelectorAll('.fase-btn').forEach((btn) => {
            btn.onclick = (e) => {
              const userAnswer = e.target.dataset.answer;
              let correctAnswer = question.answer;

              if (typeof correctAnswer === 'boolean') {
                correctAnswer = correctAnswer ? 'A' : 'B';
              } else if (question.type === 'multiple-choice' && !/^[A-D]$/.test(correctAnswer)) {
                const correctIndex = question.options.indexOf(correctAnswer);
                if (correctIndex !== -1) {
                  correctAnswer = String.fromCharCode(65 + correctIndex);
                }
              }

              state.answers[blockIndex][questionIndex].userAnswer = userAnswer;
              state.answers[blockIndex][questionIndex].isCorrect = userAnswer === correctAnswer;
              this.autoSave(this.activeTab);
              this.render();
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
              state.answers[blockIndex][questionIndex].userAnswer = userAnswer;
              state.answers[blockIndex][questionIndex].isCorrect = userAnswer.toLowerCase().replace(/[.,]/g, '') === correctAnswer.toLowerCase().replace(/[.,]/g, '');
              this.autoSave(this.activeTab);
              this.render();
            };
            checkBtn.onclick = handleCheck;
            inputEl.onkeydown = (e) => { if (e.key === 'Enter') handleCheck(); };
          }
          break;
      }
    }

    const notesTextarea = questionElement.querySelector(`#question-notes-${blockIndex}-${questionIndex}`);
    if (notesTextarea) {
      notesTextarea.onkeyup = () => {
        state.answers[blockIndex][questionIndex].note = notesTextarea.value;
        this.autoSave(this.activeTab);
      };
    }

    const blockNotesTextarea = questionElement.querySelector('#block-notes');
    if (blockNotesTextarea) {
      blockNotesTextarea.onkeyup = () => {
        state.blockNotes[blockIndex] = blockNotesTextarea.value;
        this.autoSave(this.activeTab);
      };
    }
  }
}
