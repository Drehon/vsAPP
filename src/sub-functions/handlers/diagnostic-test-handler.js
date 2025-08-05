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

            // this.initializeState(); // To be implemented in a future step
            this.render();

        } catch (error) {
            console.error("Failed to parse page data JSON or initialize diagnostic test.", error);
        }

        console.log("DiagnosticTestHandler instance created for tab:", this.activeTab.id);
    }

    /**
     * Main rendering function that orchestrates the UI update.
     */
    render() {
        console.log("Render triggered for Diagnostic Test.");
        if (!this.containerElement) return;

        const contentBody = this.containerElement.querySelector('#content-body');
        if (!contentBody) {
            console.error("Fatal: #content-body not found. Cannot render diagnostic test.");
            return;
        }
        contentBody.innerHTML = ''; // Clear existing content

        this.renderTest(contentBody);
    }

    /**
     * Renders the full structure of the diagnostic test.
     * @param {HTMLElement} parentElement - The element to render the test into.
     */
    renderTest(parentElement) {
        const testContainer = document.createElement('div');
        testContainer.className = 'diagnostic-test-container p-4 md:p-6 space-y-8';
        
        this.pageData.blocks.forEach((block, blockIndex) => {
            const blockContainer = document.createElement('div');
            blockContainer.className = 'p-6 bg-white rounded-lg shadow-lg';
            blockContainer.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4 mb-4">${block.name}</h2>`;

            const questionsWrapper = document.createElement('div');
            questionsWrapper.className = 'space-y-6';
            
            block.exercises.forEach((exercise, exerciseIndex) => {
                const questionElement = this.renderQuestion(exercise, blockIndex, exerciseIndex);
                questionsWrapper.appendChild(questionElement);
            });

            blockContainer.appendChild(questionsWrapper);

            const submissionArea = document.createElement('div');
            submissionArea.className = 'mt-8 text-center';
            const submitButton = document.createElement('button');
            submitButton.className = 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors';
            submitButton.textContent = `Submit Block ${String.fromCharCode(65 + blockIndex)}`;
            submitButton.dataset.blockIndex = blockIndex;
            submissionArea.appendChild(submitButton);
            blockContainer.appendChild(submissionArea);

            testContainer.appendChild(blockContainer);
        });

        parentElement.appendChild(testContainer);
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
        // For now, we pass a dummy answerState. This will be replaced in a future step.
        const answerState = { userAnswer: null, isCorrect: null }; 

        switch (question.type) {
            case 'mc':
                questionHTML = this.renderMultipleChoiceQuestion(question, answerState);
                break;
            case 'input_correction':
                questionHTML = this.renderInputCorrectionQuestion(question, answerState);
                break;
            case 'input_rewrite':
                questionHTML = this.renderInputRewriteQuestion(question, answerState);
                break;
            case 'paragraph_input':
                questionHTML = this.renderParagraphInputQuestion(question, answerState);
                break;
            default:
                questionHTML = `<p class="text-red-500">Error: Unknown question type "${question.type}"</p>`;
        }
        
        questionContent.innerHTML = questionHTML;
        questionWrapper.appendChild(questionContent);
        
        return questionWrapper;
    }

    /**
     * Generates the HTML for a multiple-choice question.
     * Adapted from ExerciseHandler.
     */
    renderMultipleChoiceQuestion(question, answerState) {
        const hasAnswered = false; // To be implemented later
        const disabled = hasAnswered ? 'disabled' : '';

        return `
            <p class="text-lg text-slate-700">${question.question}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                ${question.choices.map((opt, i) => {
                    const buttonAnswer = String.fromCharCode(65 + i);
                    return `<button class="fase-btn border-2 font-bold py-3 px-6 rounded-lg transition-colors text-left" data-answer="${buttonAnswer}" ${disabled}>
                                <span class="font-bold mr-2">${buttonAnswer}.</span>${opt}
                            </button>`;
                }).join('')}
            </div>
        `;
    }

    /**
     * Generates the HTML for an input correction question.
     */
    renderInputCorrectionQuestion(question, answerState) {
        const hasAnswered = false; // To be implemented later
        const disabled = hasAnswered ? 'disabled' : '';

        return `
            <p class="text-lg text-slate-700">The following sentence may contain one or more errors. Find them and type the corrected sentence below.</p>
            <div class="p-4 bg-slate-100 rounded-lg text-xl text-center font-semibold text-slate-800">${question.question}</div>
            <div class="mt-4">
                <textarea class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-lg p-2" rows="3" ${disabled}></textarea>
            </div>
        `;
    }

    /**
     * Generates the HTML for a sentence rewrite question.
     */
    renderInputRewriteQuestion(question, answerState) {
        const hasAnswered = false; // To be implemented later
        const disabled = hasAnswered ? 'disabled' : '';

        return `
            <p class="text-lg text-slate-700">Rewrite the sentence according to the instructions.</p>
            <div class="p-4 bg-slate-100 rounded-lg space-y-2">
                <p class="text-xl font-semibold text-slate-800">${question.question}</p>
            </div>
            <div class="mt-4">
                <textarea class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-lg p-2" rows="3" ${disabled}></textarea>
            </div>
        `;
    }

    /**
     * Generates the HTML for a paragraph input question.
     */
    renderParagraphInputQuestion(question, answerState) {
        const hasAnswered = false; // To be implemented later
        const disabled = hasAnswered ? 'disabled' : '';

        // Replace placeholders like {1}, {2} with input fields
        const questionHTML = question.question.replace(/\{(\d+)\}/g, (match, number) => {
            return `<input type="text" data-blank-id="${number}" class="inline-input w-32 mx-1 text-center border-b-2 border-slate-300 focus:border-indigo-500 outline-none" ${disabled}>`;
        });

        return `
            <p class="text-lg text-slate-700">${question.sectionExplanation}</p>
            <div class="word-bank flex flex-wrap gap-2 p-2 bg-indigo-50 rounded-md my-4">
                ${question.wordBank.correct.concat(question.wordBank.intruders).map(word => 
                    `<span class="bg-white border border-slate-300 rounded px-2 py-1 text-sm font-medium">${word}</span>`
                ).join('')}
            </div>
            <div class="p-4 bg-white rounded-lg leading-relaxed">${questionHTML}</div>
        `;
    }
}
