/**
 * @file diagnostic-test-handler.js
 *
 * Handles the initialization and logic for the full-scale diagnostic tests.
 * This handler is responsible for rendering all test blocks, managing state,
 * and providing detailed feedback and scoring. It uses a class-based approach
 * to ensure each diagnostic test tab has an isolated instance.
 */

export class DiagnosticTestHandler {
    /**
     * Initializes the diagnostic test.
     * @param {HTMLElement} container - The root element of the exercise content.
     * @param {object} tab - The active tab object from the renderer.
     * @param {function} saveFunc - The function to call to auto-save the exercise state.
     */
    constructor(container, tab, saveFunc) {
        console.log("Initializing DiagnosticTestHandler instance...");
        this.containerElement = container;
        this.activeTab = tab;
        this.autoSave = saveFunc;
        this.pageData = null;

        const pageDataElement = this.containerElement.querySelector('#page-data');
        if (!pageDataElement) {
            console.error("Could not find #page-data element. Cannot initialize diagnostic test.");
            return;
        }

        try {
            this.pageData = JSON.parse(pageDataElement.textContent);
            console.log("Diagnostic test data loaded:", this.pageData);

            if (!this.pageData.blocks) {
                console.error("No 'blocks' array found in page data.");
                return;
            }

            this.initializeState();
            this.render();

        } catch (error) {
            console.error("Failed to parse page data JSON or initialize diagnostic test.", error);
        }

        console.log("DiagnosticTestHandler instance created for tab:", this.activeTab.id);
    }

    /**
     * Initializes or re-initializes the exercise state on the tab object.
     * This structure is simpler than the standard exercise handler, focusing on
     * storing answers and tracking submitted blocks.
     */
    initializeState() {
        if (this.activeTab.exerciseState && this.activeTab.exerciseState.version === 'diagnostic-1.0') {
            console.log("Using existing diagnostic test state:", this.activeTab.exerciseState);
            // Future logic to handle state restoration can go here.
        } else {
            // Create a fresh state object for the diagnostic test.
            this.activeTab.exerciseState = {
                version: 'diagnostic-1.0',
                // A boolean array to track which blocks have been submitted and graded.
                submittedBlocks: Array(this.pageData.blocks.length).fill(false),
                // A nested array to store answers for each question in each block.
                answers: this.pageData.blocks.map(block =>
                    block.exercises.map(() => ({
                        userAnswer: null, // User's raw answer
                        isCorrect: null,  // Null until graded
                        notes: ''         // User's private notes
                    }))
                )
            };
            console.log("Initialized new diagnostic test state:", this.activeTab.exerciseState);
        }
    }

    /**
     * Main rendering function that orchestrates the UI update.
     */
    render() {
        console.log("Render triggered for Diagnostic Test.");
        if (!this.containerElement) return;

        // Destroy the old chart instance before clearing the DOM to prevent memory leaks.
        if (this.activeTab.diagnosticsChart) {
            console.log("Destroying old chart instance.");
            this.activeTab.diagnosticsChart.destroy();
            this.activeTab.diagnosticsChart = null;
        }

        const contentBody = this.containerElement.querySelector('#content-body');
        if (!contentBody) {
            console.error("Fatal: #content-body not found. Cannot render diagnostic test.");
            return;
        }
        contentBody.innerHTML = ''; // Clear existing content

        // Render diagnostics header if at least one block has been submitted
        const hasSubmittedBlocks = this.activeTab.exerciseState.submittedBlocks.some(s => s);
        if (hasSubmittedBlocks) {
            this.renderDiagnostics(contentBody);
        }

        this.renderTest(contentBody);
    }

    /**
     * Renders the diagnostics header with scores and the chart canvas.
     * @param {HTMLElement} parentElement - The element to render the diagnostics into.
     */
    renderDiagnostics(parentElement) {
        const scores = this.calculateScores();
        
        const diagnosticsContainer = document.createElement('div');
        diagnosticsContainer.id = 'diagnostic-header';
        diagnosticsContainer.className = 'p-4 md:p-6 mb-8 bg-slate-900/50 rounded-lg shadow-xl border border-slate-700';

        let headerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8">
                <!-- Overall Score -->
                <div class="text-center flex-shrink-0">
                    <h2 class="text-base font-bold text-slate-300 uppercase tracking-wider">Overall Score</h2>
                    <p class="text-4xl md:text-5xl font-bold text-white mt-1">${scores.overallPercentage}%</p>
                    <p class="text-sm text-slate-400 mt-1">${scores.totalCorrect} / ${scores.totalQuestions} Correct</p>
                </div>
                <!-- Chart Container -->
                <div class="relative w-full h-32 md:h-40">
                    <canvas id="diagnostics-chart"></canvas>
                </div>
            </div>
        `;

        // Add a completion message if the test is finished.
        if (this.activeTab.exerciseState.isComplete) {
            headerHTML += `
                <div class="mt-4 pt-4 border-t border-slate-700 text-center">
                    <h3 class="text-lg font-bold text-green-400">Test Complete</h3>
                    <p class="text-slate-300">You can now review your answers below.</p>
                </div>
            `;
        }
        
        diagnosticsContainer.innerHTML = headerHTML;
        parentElement.appendChild(diagnosticsContainer);

        // Now render the chart into the newly created canvas.
        this.renderOrUpdateChart(scores);
    }

    /**
     * Renders or updates the diagnostics chart using Chart.js.
     * This method is called after the canvas element has been rendered to the DOM.
     * @param {object} scores - The scores object from calculateScores.
     */
    renderOrUpdateChart(scores) {
        const ctx = this.containerElement.querySelector('#diagnostics-chart');
        if (!ctx) {
            console.error("Could not find canvas element for diagnostics chart.");
            return;
        }

        const categoryData = scores.categoryScores;
        const labels = Object.keys(categoryData);
        const data = labels.map(label => {
            const { correct, total } = categoryData[label];
            return total > 0 ? Math.round((correct / total) * 100) : 0;
        });

        const chartData = {
            labels: labels,
            datasets: [{
                label: '% Correct',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.6)', // bg-indigo-500 with opacity
                borderColor: 'rgba(99, 102, 241, 1)',     // border-indigo-500
                borderWidth: 1,
                borderRadius: 4,
            }]
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Create a horizontal bar chart
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#9ca3af' /* slate-400 */, font: { weight: 'bold' } },
                    grid: { color: '#374151' /* slate-700 */ }
                },
                y: {
                    ticks: { color: '#d1d5db' /* slate-300 */, font: { size: 14 } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#111827', // slate-900, for high contrast
                    anchor: 'end',
                    align: 'end',
                    offset: 8,
                    font: {
                        weight: 'bold',
                        size: 14,
                    },
                    formatter: (value) => {
                        // Only show a label if the value is greater than 0
                        return value > 0 ? value + '%' : null;
                    }
                },
                tooltip: {
                    backgroundColor: '#1f2937', // slate-800
                    titleFont: { size: 16 },
                    bodyFont: { size: 14 },
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.x !== null) { label += context.parsed.x + '%'; }
                            return label;
                        },
                        afterLabel: function(context) {
                            const category = context.label;
                            const { correct, total } = categoryData[category];
                            return `(${correct} of ${total} correct)`;
                        }
                    }
                }
            }
        };
        
        console.log("Creating new diagnostics chart.");
        this.activeTab.diagnosticsChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: chartOptions
        });
    }

    /**
     * Calculates overall and per-category scores based on the current state.
     * @returns {object} An object containing score information.
     */
    calculateScores() {
        const state = this.activeTab.exerciseState;
        let totalQuestions = 0;
        let totalCorrect = 0;
        const categoryScores = {}; // e.g., { 'Verb Tenses': { correct: 5, total: 10 }, ... }

        this.pageData.blocks.forEach((block, blockIndex) => {
            // Only include submitted blocks in the calculation
            if (!state.submittedBlocks[blockIndex]) {
                return;
            }

            block.exercises.forEach((question, questionIndex) => {
                totalQuestions++;
                const answerState = state.answers[blockIndex][questionIndex];
                const category = question.category;

                if (!categoryScores[category]) {
                    categoryScores[category] = { correct: 0, total: 0 };
                }
                categoryScores[category].total++;

                let isCorrect = false;
                if (question.type === 'paragraph_input') {
                    // For paragraph input, consider it correct only if all blanks are correct.
                    if (answerState.isCorrect && typeof answerState.isCorrect === 'object') {
                        const blanks = Object.values(answerState.isCorrect);
                        // Ensure there's at least one blank and all are true
                        isCorrect = blanks.length > 0 && blanks.every(c => c === true);
                    }
                } else {
                    isCorrect = answerState.isCorrect === true;
                }

                if (isCorrect) {
                    totalCorrect++;
                    categoryScores[category].correct++;
                }
            });
        });

        const overallPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        return {
            totalQuestions,
            totalCorrect,
            overallPercentage,
            categoryScores
        };
    }

    /**
     * Renders the full structure of the diagnostic test.
     * @param {HTMLElement} parentElement - The element to render the test into.
     */
    renderTest(parentElement) {
        const testContainer = document.createElement('div');
        testContainer.className = 'diagnostic-test-container p-4 md:p-6 space-y-8';
        
        const isComplete = this.activeTab.exerciseState.isComplete;
        if (isComplete) {
            testContainer.classList.add('diagnostic-test-complete');
        }

        this.pageData.blocks.forEach((block, blockIndex) => {
            const blockContainer = document.createElement('div');
            blockContainer.className = 'p-6 bg-white rounded-lg shadow-lg';
            // This data attribute is crucial for event listeners to find the correct block.
            blockContainer.dataset.blockIndex = blockIndex;

            let blockHTML = `<h2 class="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4 mb-4">${block.name}</h2>`;

            // Render the block preamble if it exists.
            if (block.blockPreamble) {
                blockHTML += `<div class="prose max-w-none text-slate-700 mb-6">${block.blockPreamble}</div>`;
            }
            blockContainer.innerHTML = blockHTML;

            const questionsWrapper = document.createElement('div');
            questionsWrapper.className = 'space-y-6';
            
            block.exercises.forEach((exercise, exerciseIndex) => {
                const questionElement = this.renderQuestion(exercise, blockIndex, exerciseIndex);
                questionsWrapper.appendChild(questionElement);
            });

            blockContainer.appendChild(questionsWrapper);

            const blockSubmitted = this.activeTab.exerciseState.submittedBlocks[blockIndex];

            // Only show the submit button if the block isn't submitted and the test isn't complete.
            if (!blockSubmitted && !isComplete) {
                const submissionArea = document.createElement('div');
                submissionArea.className = 'mt-8 text-center';
                const submitButton = document.createElement('button');
                submitButton.className = 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors';
                submitButton.textContent = `Submit Block ${String.fromCharCode(65 + blockIndex)}`;
                submitButton.dataset.blockIndex = blockIndex;
                submissionArea.appendChild(submitButton);
                blockContainer.appendChild(submissionArea);
            }

            testContainer.appendChild(blockContainer);
        });

        parentElement.appendChild(testContainer);

        this.addEventListeners();
    }

    /**
     * Adds all necessary event listeners for the diagnostic test.
     * This includes listeners for user input and block submission.
     */
    addEventListeners() {
        const blockContainers = this.containerElement.querySelectorAll('.p-6[data-block-index]');

        blockContainers.forEach(blockContainer => {
            const blockIndex = parseInt(blockContainer.dataset.blockIndex, 10);
            const isSubmitted = this.activeTab.exerciseState.submittedBlocks[blockIndex];

            if (isSubmitted) return; // Don't add listeners to submitted blocks

            // Listeners for user input, updating state on the fly
            blockContainer.querySelectorAll('.question-container').forEach((questionContainer, questionIndex) => {
                const questionState = this.activeTab.exerciseState.answers[blockIndex][questionIndex];

                // Multiple Choice Buttons
                questionContainer.querySelectorAll('button[data-question-type="mc"]').forEach(button => {
                    button.addEventListener('click', () => {
                        questionState.userAnswer = button.dataset.answer;
                        this.autoSave(this.activeTab);
                        this.render(); // Re-render to show selection
                    });
                });

                // Textareas for answers
                questionContainer.querySelectorAll('textarea[data-question-type]').forEach(textarea => {
                    textarea.addEventListener('input', () => {
                        questionState.userAnswer = textarea.value;
                        this.autoSave(this.activeTab);
                    });
                });

                // Textarea for notes
                const notesTextarea = questionContainer.querySelector(`textarea[data-notes-for="${blockIndex}-${questionIndex}"]`);
                if (notesTextarea) {
                    notesTextarea.addEventListener('input', () => {
                        questionState.notes = notesTextarea.value;
                        this.autoSave(this.activeTab);
                    });
                }

                // Paragraph input fields
                questionContainer.querySelectorAll('input[data-blank-id]').forEach(input => {
                    input.addEventListener('input', () => {
                        if (!questionState.userAnswer || typeof questionState.userAnswer !== 'object') {
                            questionState.userAnswer = {};
                        }
                        questionState.userAnswer[input.dataset.blankId] = input.value;
                        this.autoSave(this.activeTab);
                    });
                });
            });

            // Listener for the Submit Block button
            const submitButton = blockContainer.querySelector(`button[data-block-index]`);
            if (submitButton) {
                submitButton.addEventListener('click', () => {
                    this.checkAnswers(blockIndex);
                });
            }
        });
    }

    /**
     * Checks the answers for a given block, updates the state, and triggers a re-render.
     * @param {number} blockIndex - The index of the block to check.
     */
    checkAnswers(blockIndex) {
        console.log(`Checking answers for block ${blockIndex}`);
        const blockData = this.pageData.blocks[blockIndex];
        
        blockData.exercises.forEach((question, questionIndex) => {
            const answerState = this.activeTab.exerciseState.answers[blockIndex][questionIndex];
            const userAnswer = answerState.userAnswer;

            if (userAnswer === null || userAnswer === undefined) {
                answerState.isCorrect = false;
                return; // Skip if no answer was provided
            }

            switch (question.type) {
                case 'mc': {
                    answerState.isCorrect = userAnswer === question.answer;
                    break;
                }
                case 'input_correction':
                case 'input_rewrite': {
                    // Simple case-insensitive and punctuation-insensitive comparison
                    answerState.isCorrect = userAnswer.trim().toLowerCase().replace(/[.,]/g, '') === question.answer.toLowerCase().replace(/[.,]/g, '');
                    break;
                }
                case 'paragraph_input': {
                    const isCorrect = {};
                    let allCorrect = true;
                    Object.keys(question.answer).forEach(blankId => {
                        const userBlankAnswer = (userAnswer[blankId] || '').trim().toLowerCase();
                        const correctBlankAnswer = question.answer[blankId].toLowerCase();
                        const correct = userBlankAnswer === correctBlankAnswer;
                        isCorrect[blankId] = correct;
                        if (!correct) {
                            allCorrect = false;
                        }
                    });
                    answerState.isCorrect = isCorrect;
                    // You might want an overall correctness flag, but for now this per-blank feedback is good.
                    break;
                }
                case 'paragraph_error_correction': {
                    const isCorrect = {};
                    question.blanks.forEach((blank, index) => {
                        const blankId = `blank_${index}`;
                        const userBlankAnswer = (userAnswer && userAnswer[blankId] || '').trim().toLowerCase();
                        const correctBlankAnswer = blank.answer.toLowerCase();
                        isCorrect[blankId] = userBlankAnswer === correctBlankAnswer;
                    });
                    answerState.isCorrect = isCorrect;
                    break;
                }
            }
        });

        // Mark block as submitted
        this.activeTab.exerciseState.submittedBlocks[blockIndex] = true;

        // Check if all blocks are now submitted to enter "review mode"
        const allBlocksSubmitted = this.activeTab.exerciseState.submittedBlocks.every(s => s);
        if (allBlocksSubmitted) {
            console.log("All blocks submitted. Finalizing test into review mode.");
            this.activeTab.exerciseState.isComplete = true;
        }

        // Save the updated state
        this.autoSave(this.activeTab);

        // Re-render to show feedback and updated state
        this.render();
    }

    /**
     * Renders a single question based on its type.
     * @param {object} question - The question data object.
     * @param {number} blockIndex - The index of the current block.
     * @param {number} questionIndex - The index of the question within the block.
     * @returns {HTMLElement} The element for the rendered question.
     */
    renderQuestion(question, blockIndex, questionIndex) {
        const questionWrapper = document.createElement('div');
        questionWrapper.className = 'question-container border-t border-slate-200 pt-6';

        const questionHeader = document.createElement('div');
        questionHeader.className = 'flex justify-between items-center mb-2';
        questionHeader.innerHTML = `
            <span class="text-sm font-bold text-indigo-600">Question ${question.displayNum}</span>
            <span class="text-sm text-slate-500 font-mono">${question.category}</span>
        `;
        questionWrapper.appendChild(questionHeader);

        const questionContent = document.createElement('div');
        questionContent.className = 'space-y-4';

        let questionHTML = '';
        const answerState = this.activeTab.exerciseState.answers[blockIndex][questionIndex];
        const blockSubmitted = this.activeTab.exerciseState.submittedBlocks[blockIndex];

        switch (question.type) {
            case 'mc':
                questionHTML = this.renderMultipleChoiceQuestion(question, answerState, blockSubmitted);
                break;
            case 'input_correction':
                questionHTML = this.renderInputCorrectionQuestion(question, answerState, blockSubmitted);
                break;
            case 'input_rewrite':
                questionHTML = this.renderInputRewriteQuestion(question, answerState, blockSubmitted);
                break;
            case 'paragraph_input':
                questionHTML = this.renderParagraphInputQuestion(question, answerState, blockSubmitted);
                break;
            case 'paragraph_error_correction':
                questionHTML = this.renderParagraphErrorCorrectionQuestion(question, answerState, blockSubmitted);
                break;
            default:
                questionHTML = `<p class="text-red-500">Error: Unknown question type "${question.type}"</p>`;
        }
        
        questionContent.innerHTML = questionHTML;
        questionWrapper.appendChild(questionContent);

        // Add collapsible notes area
        const notesDetails = document.createElement('details');
        notesDetails.className = 'mt-4';
        
        const notesSummary = document.createElement('summary');
        notesSummary.className = 'text-sm font-normal text-slate-500 hover:text-slate-700 cursor-pointer';
        notesSummary.textContent = 'My Notes';
        notesDetails.appendChild(notesSummary);

        const notesTextarea = document.createElement('textarea');
        notesTextarea.className = 'mt-2 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-slate-50';
        notesTextarea.rows = 3;
        notesTextarea.placeholder = 'Jot down your thoughts or reasoning here...';
        notesTextarea.dataset.notesFor = `${blockIndex}-${questionIndex}`;
        notesTextarea.value = answerState.notes || '';
        notesDetails.appendChild(notesTextarea);

        questionWrapper.appendChild(notesDetails);
        
        return questionWrapper;
    }

    /**
     * Generates the HTML for a multiple-choice question.
     * Adapted from ExerciseHandler.
     */
    renderMultipleChoiceQuestion(question, answerState, blockSubmitted) {
        const isComplete = this.activeTab.exerciseState.isComplete;
        const disabled = (blockSubmitted || isComplete) ? 'disabled' : '';

        const getButtonClasses = (buttonAnswer) => {
            let classes = 'fase-btn border-2 font-bold py-3 px-6 rounded-lg transition-colors text-left';
            
            if (blockSubmitted) {
                const isCorrect = answerState.isCorrect;
                const userAnswer = answerState.userAnswer;
                const correctAnswer = question.answer;

                if (buttonAnswer === userAnswer) {
                    classes += isCorrect ? ' btn-correct' : ' btn-incorrect';
                } else if (buttonAnswer === correctAnswer && !isCorrect) {
                    classes += ' feedback-correct-outline';
                }
            } else if (answerState.userAnswer === buttonAnswer) {
                // Add a class to show selection before submission
                classes += ' bg-slate-200 border-slate-400';
            }

            return classes;
        };

        return `
            <p class="text-lg text-slate-700">${question.question}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                ${question.choices.map((opt, i) => {
                    const buttonAnswer = String.fromCharCode(65 + i);
                    return `<button class="${getButtonClasses(buttonAnswer)}" data-answer="${buttonAnswer}" data-question-type="mc" ${disabled}>
                                <span class="font-bold mr-2">${buttonAnswer}.</span>${opt}
                            </button>`;
                }).join('')}
            </div>
        `;
    }

    /**
     * Generates the HTML for an input correction question.
     */
    renderInputCorrectionQuestion(question, answerState, blockSubmitted) {
        const isComplete = this.activeTab.exerciseState.isComplete;
        const disabled = (blockSubmitted || isComplete) ? 'disabled' : '';
        const userAnswer = answerState.userAnswer || '';

        let inputClasses = 'mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-lg p-2';
        if (blockSubmitted) {
            inputClasses += answerState.isCorrect ? ' input-correct' : ' input-incorrect';
        }

        return `
            <p class="text-lg text-slate-700">The following sentence may contain one or more errors. Find them and type the corrected sentence below.</p>
            <div class="p-4 bg-slate-100 rounded-lg text-xl text-center font-semibold text-slate-800">${question.question}</div>
            <div class="mt-4">
                <textarea class="${inputClasses}" data-question-type="input_correction" rows="3" ${disabled}>${userAnswer}</textarea>
            </div>
        `;
    }

    /**
     * Generates the HTML for a sentence rewrite question.
     */
    renderInputRewriteQuestion(question, answerState, blockSubmitted) {
        const isComplete = this.activeTab.exerciseState.isComplete;
        const disabled = (blockSubmitted || isComplete) ? 'disabled' : '';
        const userAnswer = answerState.userAnswer || '';

        let inputClasses = 'mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-lg p-2';
        if (blockSubmitted) {
            inputClasses += answerState.isCorrect ? ' input-correct' : ' input-incorrect';
        }

        return `
            <p class="text-lg text-slate-700">Rewrite the sentence according to the instructions.</p>
            <div class="p-4 bg-slate-100 rounded-lg space-y-2">
                <p class="text-xl font-semibold text-slate-800">${question.question}</p>
            </div>
            <div class="mt-4">
                <textarea class="${inputClasses}" data-question-type="input_rewrite" rows="3" ${disabled}>${userAnswer}</textarea>
            </div>
        `;
    }

    /**
     * Generates the HTML for a paragraph input question.
     */
    renderParagraphInputQuestion(question, answerState, blockSubmitted) {
        const isComplete = this.activeTab.exerciseState.isComplete;
        const disabled = (blockSubmitted || isComplete) ? 'disabled' : '';

        // Replace placeholders like {1}, {2} with input fields
        const questionHTML = question.question.replace(/\{(\d+)\}/g, (match, number) => {
            const userAnswer = (answerState.userAnswer && answerState.userAnswer[number]) || '';
            let inputClasses = 'inline-input w-32 mx-1 text-center border-b-2 border-slate-300 focus:border-indigo-500 outline-none';
            
            if (blockSubmitted) {
                // answerState.isCorrect is an object for this question type
                const isCorrect = answerState.isCorrect && answerState.isCorrect[number];
                inputClasses += isCorrect ? ' input-correct' : ' input-incorrect';
            }

            return `<input type="text" data-blank-id="${number}" class="${inputClasses}" value="${userAnswer}" ${disabled}>`;
        });

        return `
            <p class="text-lg text-slate-700">${question.sectionExplanation}</p>
            <div class="word-bank flex flex-wrap gap-2 p-2 bg-indigo-50 rounded-md my-4">
                ${question.wordBank.correct.concat(question.wordBank.intruders).map(word => 
                    `<span class="bg-white border border-slate-300 rounded px-2 py-1 text-sm font-medium">${word}</span>`
                ).join('')}
            </div>
            <div class="p-4 bg-white rounded-lg leading-relaxed" data-question-type="paragraph_input">${questionHTML}</div>
        `;
    }

    /**
     * Generates the HTML for a paragraph error correction question.
     * This type finds bolded text in the question and replaces it with an input field.
     */
    renderParagraphErrorCorrectionQuestion(question, answerState, blockSubmitted) {
        const isComplete = this.activeTab.exerciseState.isComplete;
        const disabled = (blockSubmitted || isComplete) ? 'disabled' : '';
        let questionHTML = question.question;

        question.blanks.forEach((blank, index) => {
            const blankId = `blank_${index}`;
            const userAnswer = (answerState.userAnswer && answerState.userAnswer[blankId]) || '';
            let inputClasses = 'inline-input w-32 mx-1 text-center border-b-2 border-slate-300 focus:border-indigo-500 outline-none';

            if (blockSubmitted) {
                // answerState.isCorrect is an object for this question type
                const isCorrect = answerState.isCorrect && answerState.isCorrect[blankId];
                inputClasses += isCorrect ? ' input-correct' : ' input-incorrect';
            }

            const inputHTML = `<input type="text" data-blank-id="${blankId}" class="${inputClasses}" value="${userAnswer}" ${disabled}>`;
            // Use a regex to replace all occurrences of the bolded label
            const searchString = new RegExp(`<b>${blank.label}</b>`, 'g');
            questionHTML = questionHTML.replace(searchString, inputHTML);
        });

        return `
            <p class="text-lg text-slate-700">${question.sectionExplanation || ''}</p>
            <div class="p-4 bg-white rounded-lg leading-relaxed" data-question-type="paragraph_error_correction">${questionHTML}</div>
        `;
    }
}
