export function initializeGrammarExercise(paneElement, tab, saveExerciseState) {
    const exerciseDataEl = paneElement.querySelector('#exercise-data');
    if (!exerciseDataEl) return;

    let rawText = exerciseDataEl.textContent;

    // Step 1: Remove comments first. This is crucial to prevent comments from interfering with other replacements.
    let cleanedText = rawText.replace(/\s*\/\/.*$/gm, '');

    // Step 2: Normalize all non-standard whitespace and control characters to a single space.
    // This is a more aggressive approach to catch any invisible characters (like non-breaking spaces \u00A0)
    // that might be causing issues and are not standard JSON whitespace.
    cleanedText = cleanedText.replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

    // Step 3: Ensure literal backslashes are properly escaped.
    // This regex matches a backslash that is NOT followed by a valid JSON escape character (", \, /, b, f, n, r, t, u).
    // This prevents double-escaping already valid escape sequences while fixing unescaped backslashes.
    cleanedText = cleanedText.replace(/\\(?![/"bfnrtu])/g, '\\\\');

    // Step 4: Escape newlines and carriage returns.
    // These are necessary for JSON string values that span multiple lines.
    cleanedText = cleanedText.replace(/\n/g, '\\n');
    cleanedText = cleanedText.replace(/\r/g, '\\r');
    
    // Attempt to parse JSON.
    let testData;
    try {
        testData = JSON.parse(cleanedText).testData;
    } catch (e) {
        console.error("Failed to parse exercise data JSON:", e);
        // Display a user-friendly error message in the pane
        paneElement.innerHTML = `<div class="p-6 text-red-700 bg-red-100 rounded-lg">
                                    <h2 class="font-bold text-lg">Error Loading Exercise</h2>
                                    <p>There was an error loading the exercise data. Please check the exercise file for valid JSON format.</p>
                                    <p>Details: ${e.message}</p>
                                </div>`;
        return; // Stop further execution if JSON parsing fails
    }

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
    const tabs = paneElement.querySelectorAll('.tab-btn');
    const diagTabs = paneElement.querySelectorAll('.diag-tab-btn');
    const loadFileInput = paneElement.querySelector('#load-file-input');

    const renderQuestions = (block) => {
        if (!questionsContainer) {
            console.error("questionsContainer element not found.");
            return; // Exit if the container is missing
        }
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
        if (!submissionArea) {
            console.error("submissionArea element not found.");
            return;
        }
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
            // Null check for submit-block-btn before adding event listener
            const submitBlockBtn = paneElement.querySelector('#submit-block-btn');
            if (submitBlockBtn) {
                submitBlockBtn.addEventListener('click', handleBlockSubmit);
            }
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
             
             // Null checks for these buttons
             const viewDiagnosticsBtn = paneElement.querySelector('#view-diagnostics-btn');
             if (viewDiagnosticsBtn) {
                 viewDiagnosticsBtn.addEventListener('click', showDiagnostics);
             }

             const retakeTestBtn = paneElement.querySelector('#retake-test-btn');
             if (retakeTestBtn) {
                 retakeTestBtn.addEventListener('click', () => {
                    // Using a custom modal for confirmation instead of alert/confirm
                    // This still uses `confirm` which is problematic in an iframe.
                    // A custom modal UI should be implemented here.
                    if(confirm('Are you sure you want to retake the entire test? All your progress and notes will be lost.')) {
                        localStorage.clear();
                        window.location.reload();
                    }
                });
             }
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
            if (btn) { // Null check for the button
                btn.addEventListener('click', (e) => {
                    const content = e.target.nextElementSibling;
                    if (content) { // Null check for content
                        content.classList.toggle('hidden');
                        e.target.textContent = content.classList.contains('hidden') ? 'Show Notes' : 'Hide Notes';
                    }
                });
            }
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
    
    function loadProgress() {
        if (loadFileInput) {
            loadFileInput.click();
        }
    }

    if (loadFileInput) {
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
                    // Replaced alert with console.log as alerts are not allowed
                    console.log('Progress loaded successfully!');

                } catch (error) {
                    // Replaced alert with console.error as alerts are not allowed
                    console.error('Error loading progress: Invalid JSON file or data structure.', error);
                }
            };
            reader.readAsText(file);
        });
    }

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
                                if (e.target.parentElement) e.target.parentElement.remove(); // Null check
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
                            if (e.target.parentElement) e.target.parentElement.remove(); // Null check
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
            if (btn) { // Null check for the button
                btn.addEventListener('click', (e) => {
                    const content = e.target.closest('.question-block').querySelector('.explanation-content');
                    if (content) { // Null check for content
                        content.classList.toggle('hidden');
                        e.target.textContent = content.classList.contains('hidden') ? 'Explain' : 'Hide';
                    }
                });
            }
        });
    }
    
    function showDiagnostics() {
        if (!testContainer || !diagnosticsView) {
            console.error("Diagnostic view elements not found.");
            return;
        }
        testContainer.classList.add('hidden');
        // Null check for intro-view
        const introView = paneElement.querySelector('#intro-view');
        if (introView) {
            introView.classList.add('hidden');
        }
        diagnosticsView.classList.remove('hidden');
        
        const allCompleted = testState[1].completed && testState[2].completed && testState[3].completed;
        
        // Null checks for diagnostic tabs
        const diagTabBlockA = paneElement.querySelector('#diag-tab-block-a');
        if (diagTabBlockA) diagTabBlockA.disabled = !testState[1].completed;
        
        const diagTabBlockB = paneElement.querySelector('#diag-tab-block-b');
        if (diagTabBlockB) diagTabBlockB.disabled = !testState[2].completed;
        
        const diagTabBlockC = paneElement.querySelector('#diag-tab-block-c');
        if (diagTabBlockC) diagTabBlockC.disabled = !testState[3].completed;
        
        const diagTabOverall = paneElement.querySelector('#diag-tab-overall');
        if (diagTabOverall) diagTabOverall.disabled = !allCompleted;

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

        const ctx = paneElement.querySelector(`#${canvasId}`);
        if (!ctx) { // Null check for canvas element
            console.warn(`Canvas element with ID '${canvasId}' not found.`);
            return;
        }

        const context2D = ctx.getContext('2d');
        if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
        
        chartInstances[canvasId] = new Chart(context2D, {
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

    const backToReviewBtn = paneElement.querySelector('#back-to-review-btn');
    if (backToReviewBtn) { // Null check for back-to-review-btn
        backToReviewBtn.addEventListener('click', () => {
            if (diagnosticsView) diagnosticsView.classList.add('hidden'); // Null check
            if (testContainer) testContainer.classList.remove('hidden'); // Null check
            const introView = paneElement.querySelector('#intro-view');
            if (introView) { // Null check for intro-view
                introView.classList.remove('hidden');
            }
            renderQuestions(currentBlock); 
        });
    }

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

    // Initial render
    switchTab(currentBlock);
}
