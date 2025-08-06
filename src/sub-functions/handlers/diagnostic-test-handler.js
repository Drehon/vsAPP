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
            // Explicitly register the datalabels plugin.
            // This is a more robust approach than relying on automatic registration from the script tag.
            Chart.register(ChartDataLabels);
            
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
        if (this.activeTab.exerciseState && this.activeTab.exerciseState.version === 'diagnostic-1.2') {
            console.log("Using existing diagnostic test state:", this.activeTab.exerciseState);
        } else {
            // Create a fresh state object for the diagnostic test.
            this.activeTab.exerciseState = {
                version: 'diagnostic-1.2', // Version update: Teacher notes and new layout
                currentBlockIndex: 0, // Start at "Block A"
                submittedBlocks: Array(this.pageData.blocks.length).fill(false),
                answers: this.pageData.blocks.map(block =>
                    block.exercises.map(() => ({
                        userAnswer: null,
                        isCorrect: null,
                        notes: '',
                        submittedUnanswered: false
                    }))
                ),
                teacherNotes: '' // New field for teacher's overall notes
            };
            console.log("Initialized new diagnostic test state:", this.activeTab.exerciseState);
        }
    }

    /**
     * Main rendering function that orchestrates the UI update.
     */
    render() {
        console.log("Render triggered for Diagnostic Test. Current state:", this.activeTab.exerciseState);
        if (!this.containerElement) return;

        // Destroy old chart instance to prevent memory leaks
        if (this.activeTab.diagnosticsChart) {
            this.activeTab.diagnosticsChart.destroy();
            this.activeTab.diagnosticsChart = null;
        }

        const contentBody = this.containerElement.querySelector('#content-body');
        if (!contentBody) {
            console.error("Fatal: #content-body not found. Cannot render.");
            return;
        }
        contentBody.innerHTML = ''; // Clear existing content

        // Render the global control buttons (Submit, Revert, Reset)
        this.renderGlobalControls(contentBody);

        // Render diagnostics header (score/chart) which is now part of the Diagnostics tab.
        // The check for submitted blocks will happen inside renderDiagnosticsTab.
        
        // Render the tab buttons for navigation.
        const blockTabsEl = this.createBlockTabs();
        contentBody.appendChild(blockTabsEl);

        const exerciseContainer = document.createElement('div');
        exerciseContainer.id = 'diagnostic-exercise-container';
        contentBody.appendChild(exerciseContainer);

        // Render content based on the active tab.
        const activeIndex = this.activeTab.exerciseState.currentBlockIndex;
        if (activeIndex >= 0 && activeIndex < this.pageData.blocks.length) {
            // Render the questions for the selected block.
            this.renderTest(exerciseContainer);
        } else {
            // Render the central diagnostics/control panel.
            this.renderDiagnosticsTab(exerciseContainer);
        }

        // Add listeners for the newly rendered content.
        this.addEventListeners();
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
                <div class="text-center flex-shrink-0" style="background-color: #1e293b; color: #f1f5f9; border-radius: 8px; padding: 10px;">
                    <h2 class="text-base font-bold uppercase tracking-wider" style="color: #f1f5f9;">Overall Score</h2>
                    <p class="text-4xl md:text-5xl font-bold mt-1">${scores.overallPercentage}%</p>
                    <p class="text-sm mt-1">${scores.totalCorrect} / ${scores.totalQuestions} Correct</p>
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
                    <p class="text-slate-300" style="color: #1e293b;">You can now review your answers below.</p>
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
                backgroundColor: '#4F46E5', // solid indigo-600
                borderColor: '#4F46E5',     // solid indigo-600
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
                    ticks: { color: '#1e293b', font: { weight: 'bold' } },
                    grid: { color: '#374151' /* slate-700 */ }
                },
                y: {
                    ticks: { color: '#1e293b', font: { size: 14 } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    // --- Start of Issue 7 Fix ---
                    // Style the labels as "pills" to guarantee contrast.
                    backgroundColor: '#2d3748', // A very dark grey
                    borderColor: '#4a5568',     // A slightly lighter grey for border
                    borderWidth: 1,
                    borderRadius: 6,           // Makes it pill-shaped
                    color: '#FFFFFF',          // White text
                    padding: {
                        top: 4,
                        bottom: 4,
                        left: 8,
                        right: 8
                    },
                    // --- End of Issue 7 Fix ---
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
     * Renders the structure of the currently active test block.
     * @param {HTMLElement} parentElement - The element to render the test into.
     */
    renderTest(parentElement) {
        const state = this.activeTab.exerciseState;
        const blockIndex = state.currentBlockIndex;
        const block = this.pageData.blocks[blockIndex];

        const blockContainer = document.createElement('div');
        blockContainer.className = 'p-6 bg-white rounded-lg shadow-lg border border-t-0 rounded-t-none border-slate-300';
        blockContainer.dataset.blockIndex = blockIndex;

        let blockHTML = `<h2 class="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4 mb-4">${block.name}</h2>`;
        if (block.blockPreamble) {
            blockHTML += `<div class="prose max-w-none text-slate-700 mb-6">${block.blockPreamble}</div>`;
        }
        blockContainer.innerHTML = blockHTML;

        const questionsWrapper = document.createElement('div');
        questionsWrapper.className = 'space-y-6';

        let currentSection = null;

        block.exercises.forEach((exercise, exerciseIndex) => {
            // Check if this is a new section
            if (exercise.section !== currentSection) {
                currentSection = exercise.section;

                // Add a separator, but not before the very first section
                if (exerciseIndex > 0) {
                    const separator = document.createElement('hr');
                    separator.className = 'my-8 border-slate-300';
                    questionsWrapper.appendChild(separator);
                }

                const sectionHeader = document.createElement('div');
                sectionHeader.className = 'mt-6'; // Add some top margin to the new section
                let sectionHTML = `<h3 class="text-xl font-semibold text-slate-700 mb-2">${currentSection}</h3>`;
                if (exercise.sectionExplanation) {
                    sectionHTML += `<p class="text-sm text-slate-600 mb-4">${exercise.sectionExplanation}</p>`;
                }
                sectionHeader.innerHTML = sectionHTML;
                questionsWrapper.appendChild(sectionHeader);
            }

            const questionElement = this.renderQuestion(exercise, blockIndex, exerciseIndex);
            questionsWrapper.appendChild(questionElement);
        });

        blockContainer.appendChild(questionsWrapper);

        const blockSubmitted = state.submittedBlocks[blockIndex];
        if (!blockSubmitted && !state.isComplete) {
            const submissionArea = document.createElement('div');
            submissionArea.className = 'mt-8 text-center';
            const submitButton = document.createElement('button');
            submitButton.className = 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors';
            submitButton.textContent = `Submit Block ${String.fromCharCode(65 + blockIndex)}`;
            submitButton.dataset.blockIndex = blockIndex;
            submissionArea.appendChild(submitButton);
            blockContainer.appendChild(submissionArea);
        }

        parentElement.appendChild(blockContainer);
    }

    /**
     * Adds all necessary event listeners for the diagnostic test.
     */
    addEventListeners() {
        // Listeners for the global control panel (Submit, Revert, Reset)
        this.addGlobalControlsListeners();

        // Listeners for block tabs
        this.addBlockTabListeners();
        
        const state = this.activeTab.exerciseState;
        const activeIndex = state.currentBlockIndex;

        if (activeIndex >= 0 && activeIndex < this.pageData.blocks.length) {
            // Add listeners for the active question block
            this.addQuestionBlockListeners(activeIndex);
        } else {
            // Add listeners for the diagnostics tab content (e.g., notes)
            this.addDiagnosticsTabListeners();
        }
    }

    /**
     * Adds listeners for user input and submission within a single question block.
     * @param {number} blockIndex The index of the block to add listeners for.
     */
    addQuestionBlockListeners(blockIndex) {
        // Use a more specific selector ('div') to avoid selecting the global control buttons,
        // which also have the `data-block-index` attribute.
        const blockContainer = this.containerElement.querySelector(`div[data-block-index='${blockIndex}']`);
        if (!blockContainer) return;

        const isSubmitted = this.activeTab.exerciseState.submittedBlocks[blockIndex];
        if (isSubmitted) return;

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

            answerState.submittedUnanswered = false; // Reset before check

            if (userAnswer === null || userAnswer === undefined) {
                answerState.isCorrect = false;
                if (question.type === 'mc') {
                    answerState.submittedUnanswered = true;
                }
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
     * Creates the tabbed interface for switching between exercise blocks and the diagnostics panel.
     * @returns {HTMLElement} The element containing the block tabs.
     */
    createBlockTabs() {
        const blockTabsContainer = document.createElement('div');
        blockTabsContainer.className = 'flex border-b border-slate-300 bg-white/30 rounded-t-lg';

        const tabs = ['Block A', 'Block B', 'Block C', 'Diagnostics'];
        tabs.forEach((name, index) => {
            const isActive = index === this.activeTab.exerciseState.currentBlockIndex;
            const button = document.createElement('button');
            // The last tab is the diagnostics panel, which gets a special index.
            button.dataset.blockIndex = index;
            button.textContent = name;
            button.className = `py-2 px-4 text-sm font-bold transition-colors ${
                isActive 
                ? 'border-b-2 border-indigo-500 text-indigo-600' 
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`;
            if (name === 'Diagnostics') {
                button.classList.add('ml-auto', 'mr-2'); // Push to the right
            }
            blockTabsContainer.appendChild(button);
        });

        return blockTabsContainer;
    }

    /**
     * Adds event listeners to the block tabs.
     */
    addBlockTabListeners() {
        this.containerElement.querySelectorAll('.flex.border-b button').forEach(button => {
            button.onclick = (e) => {
                const blockIndex = parseInt(e.target.dataset.blockIndex, 10);
                if (this.activeTab.exerciseState.currentBlockIndex !== blockIndex) {
                    this.activeTab.exerciseState.currentBlockIndex = blockIndex;
                    this.autoSave(this.activeTab);
                    this.render();
                }
            };
        });
    }

    /**
     * Renders the content of the "Diagnostics" tab, which contains controls for managing blocks.
     * @param {HTMLElement} parentElement - The element to render the content into.
     */
    /**
     * Renders the global control panel with Submit, Revert, and Reset buttons.
     * This is now separate from any tab and appears at the top of the page.
     * @param {HTMLElement} parentElement - The element to render the controls into.
     */
    renderGlobalControls(parentElement) {
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'diagnostic-global-controls';
        controlsContainer.className = 'p-4 bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-lg border border-slate-700 mb-4';

        const buttonGroups = [
            { title: 'Submit', action: 'submit', style: 'bg-indigo-600 text-white hover:bg-indigo-700', bgStyle: 'bg-indigo-900/30', titleClass: 'bg-blue-500 text-white px-2 py-1 rounded-md' },
            { title: 'Revert', action: 'unsubmit', style: 'text-white', bgStyle: 'bg-orange-900/30', titleClass: 'text-white px-2 py-1 rounded-md' },
            { title: 'Azzera', action: 'reset', style: 'bg-red-500 text-white hover:bg-red-600', bgStyle: 'bg-red-900/30', titleClass: 'bg-red-500 text-white px-2 py-1 rounded-md' }
        ];

        let content = '<div class="flex justify-center items-center gap-x-6 gap-y-4 flex-wrap">';

        buttonGroups.forEach(group => {
            content += `<div class="flex items-center gap-4 p-3 rounded-lg ${group.bgStyle}">`; // Increased gap and padding
            
            let titleExtraStyle = (group.title === 'Revert') ? 'style="background-color: #F97316;"' : '';
            content += `<span class="text-sm font-bold ${group.titleClass}" ${titleExtraStyle}>${group.title}:</span>`;
            
            const buttonsHTML = this.pageData.blocks.map((block, index) => {
                const blockLetter = String.fromCharCode(65 + index);
                const isSubmitted = this.activeTab.exerciseState.submittedBlocks[index];
                
                let disabled = '';
                if (group.action === 'submit' && isSubmitted) disabled = 'disabled';
                if (group.action === 'unsubmit' && !isSubmitted) disabled = 'disabled';

                let buttonExtraStyle = (group.title === 'Revert') ? 'style="background-color: #F97316;"' : '';

                return `
                    <button 
                        class="text-xs font-bold py-1 px-3 rounded-md transition-colors ${group.style}"
                        data-action="${group.action}" 
                        data-block-index="${index}" 
                        ${disabled}
                        ${buttonExtraStyle}>
                        Block ${blockLetter}
                    </button>
                `;
            }).join('');

            content += `<div class="flex items-center gap-2">${buttonsHTML}</div>`;
            content += '</div>';
        });

        content += '</div>';
        controlsContainer.innerHTML = content;
        parentElement.appendChild(controlsContainer);
    }

    /**
     * Renders the content of the "Diagnostics" tab, which now includes the chart,
     * explanation text, and a teacher notes area.
     * @param {HTMLElement} parentElement - The element to render the content into.
     */
    renderDiagnosticsTab(parentElement) {
        const container = document.createElement('div');
        container.className = 'p-6 bg-white rounded-lg shadow-lg border border-t-0 rounded-t-none border-slate-300 text-slate-800';
        
        let content = '';

        // Render diagnostics chart/scores only if at least one block is submitted.
        if (this.activeTab.exerciseState.submittedBlocks.some(s => s)) {
            // This will create the container and canvas for the chart.
            // We'll call the chart rendering function after appending the HTML.
            content += '<div id="diagnostics-chart-container"></div>';
        } else {
            content += `
                <div class="text-center p-8 bg-slate-50 rounded-lg">
                    <h2 class="text-xl font-bold text-slate-700">No Data Yet</h2>
                    <p class="text-slate-500 mt-2">Submit at least one block to see the performance analysis chart.</p>
                </div>
            `;
        }

        // Add explanation area
        content += `
            <div class="mt-8">
                <h3 class="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">Evaluation Areas</h3>
                <p class="text-slate-600">
                    This section will provide a detailed breakdown of the different grammatical and lexical areas evaluated in this diagnostic test. 
                    The chart above provides a visual summary of performance in each key category.
                </p>
                <!-- NOTE: This text is a placeholder. For a full implementation, this content could be loaded from the pageData object. -->
            </div>
        `;

        // Add Teacher Notes area
        content += `
            <div class="mt-8">
                <h3 class="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">Teacher's Notes</h3>
                <textarea id="teacher-notes-area" class="w-full h-48 p-3 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter overall feedback or notes for the student here...">${this.activeTab.exerciseState.teacherNotes || ''}</textarea>
            </div>
        `;

        container.innerHTML = content;
        parentElement.appendChild(container);

        // If the chart container exists, render the chart inside it.
        const chartContainer = container.querySelector('#diagnostics-chart-container');
        if (chartContainer) {
            this.renderDiagnostics(chartContainer); // Re-using the original chart rendering logic
        }
    }
    
    /**
     * Adds event listeners for the global controls and the "Diagnostics" tab content.
     */
    addGlobalControlsListeners() {
        const controls = this.containerElement.querySelector('#diagnostic-global-controls');
        if (!controls) return;

        controls.querySelectorAll('button[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const blockIndex = parseInt(e.currentTarget.dataset.blockIndex, 10);
                
                // Prevent default button behavior that might cause reloads
                e.preventDefault();

                if (action === 'submit') {
                    this.checkAnswers(blockIndex);
                } else if (action === 'unsubmit') {
                    this.unsubmitBlock(blockIndex);
                } else if (action === 'reset') {
                    this.resetBlock(blockIndex);
                }
            });
        });
    }

    addDiagnosticsTabListeners() {
        const notesArea = this.containerElement.querySelector('#teacher-notes-area');
        if (notesArea) {
            notesArea.addEventListener('input', () => {
                this.activeTab.exerciseState.teacherNotes = notesArea.value;
                this.autoSave(this.activeTab);
            });
        }
    }

    /**
     * Reverts a block to its un-submitted state.
     * @param {number} blockIndex - The index of the block to un-submit.
     */
    unsubmitBlock(blockIndex) {
        console.log(`Un-submitting block ${blockIndex}`);
        this.activeTab.exerciseState.submittedBlocks[blockIndex] = false;
        this.activeTab.exerciseState.isComplete = false; // The test is no longer complete
        this.autoSave(this.activeTab);
        this.render();
    }

    /**
     * Resets all answers for a specific block.
     * @param {number} blockIndex - The index of the block to reset.
     */
    resetBlock(blockIndex) {
        console.log(`Resetting block ${blockIndex}`);
        const block = this.pageData.blocks[blockIndex];
        // Reset answers for this block
        this.activeTab.exerciseState.answers[blockIndex] = block.exercises.map(() => ({
            userAnswer: null,
            isCorrect: null,
            notes: ''
        }));
        // Un-submit the block as well
        this.unsubmitBlock(blockIndex);
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
        const answerState = this.activeTab.exerciseState.answers[blockIndex][questionIndex];

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
            } else {
                classes += ' bg-white border-slate-300 hover:bg-slate-100';
            }

            return classes;
        };

        let questionHTML = question.question;
        if (blockSubmitted && answerState.submittedUnanswered) {
            // This will wrap the question text in a span that can be styled.
            questionHTML = `<span class="unanswered-question-text">${question.question}</span>`;
        }

        return `
            <p class="text-lg text-slate-700">${questionHTML}</p>
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
