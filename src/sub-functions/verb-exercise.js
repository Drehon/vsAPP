export function initializeVerbsExercise(paneElement, tab, autoSaveExerciseState) {
    const exerciseDataEl = paneElement.querySelector('#exercise-data');
    if (!exerciseDataEl) return;

    const jsonText = exerciseDataEl.textContent.replace(/\s*\/\/.*$/gm, '');
    const { testData } = JSON.parse(jsonText);
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
            loadAnswers();
            addAnswerListeners();
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
                // Null check for submit-block-btn
                const submitBlockBtn = paneElement.querySelector('#submit-block-btn');
                if (submitBlockBtn) {
                    submitBlockBtn.addEventListener('click', handleBlockSubmit);
                }
            }
            
            if (testState[currentBlock].completed) {
                 const buttonContainer = document.createElement('div');
                 buttonContainer.className = 'mt-6 flex flex-col md:flex-row justify-center items-center gap-4';
                 buttonContainer.innerHTML = `
                <button type="button" id="reverse-submit-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 shadow-md">Reverse</button>
                 `;
                 submissionArea.appendChild(buttonContainer);
                 
                 const reverseSubmitBtn = paneElement.querySelector('#reverse-submit-btn');
                 if (reverseSubmitBtn) {
                     reverseSubmitBtn.addEventListener('click', reverseSubmit);
                 }
            }
        }

        function reverseSubmit() {
            testState[currentBlock].completed = false;
            autoSaveExerciseState(tab);
            
            paneElement.querySelectorAll(`form input, form select, form textarea`).forEach(el => {
                el.disabled = false;
            });
    
            paneElement.querySelectorAll('.feedback-container').forEach(el => el.remove());
            paneElement.querySelectorAll('.correct-answer').forEach(el => el.classList.remove('correct-answer'));
            paneElement.querySelectorAll('.incorrect-answer').forEach(el => el.classList.remove('incorrect-answer'));
            paneElement.querySelectorAll('.correct').forEach(el => el.classList.remove('correct'));
            paneElement.querySelectorAll('.incorrect-selected').forEach(el => el.classList.remove('incorrect-selected'));
            paneElement.querySelectorAll('.explain-btn').forEach(el => el.remove());
            paneElement.querySelectorAll('.explanation-content').forEach(el => el.remove());
    
            renderSubmissionArea();
        }

        function handleBlockSubmit() {
            const userAnswers = {};
            const blockQuestions = testData.filter(q => q.block === currentBlock);
            
            blockQuestions.forEach(q => {
                if (q.type === 'paragraph_error_id') {
                    q.parts.forEach((part, index) => {
                        const inputEl = paneElement.querySelector(`[name="q${q.displayNum}_part${index}"]`);
                        if(inputEl) userAnswers[`q${q.displayNum}_part${index}`] = inputEl.value.trim();
                    });
                } else {
                    const inputEl = paneElement.querySelector(`[name="q${q.displayNum}"]`);
                    if(inputEl) userAnswers[`q${q.displayNum}`] = inputEl.value.trim();
                }
            });

            testState[currentBlock].completed = true;
            testState[currentBlock].answers = userAnswers;
            autoSaveExerciseState(tab);
            
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
                    autoSaveExerciseState(tab);
                });
            });
            paneElement.querySelectorAll('.notes-toggle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const content = e.target.nextElementSibling;
                    if (content) { // Null check for content
                        content.classList.toggle('hidden');
                        e.target.textContent = content.classList.contains('hidden') ? 'Show Notes' : 'Hide Notes';
                    }
                });
            });
        }

        function addAnswerListeners() {
            paneElement.querySelectorAll('input[name^="q"], select[name^="q"], textarea[name^="q"]').forEach(input => {
                input.addEventListener('input', (e) => {
                    const questionId = e.target.name;
                    if (!testState[currentBlock].answers) {
                        testState[currentBlock].answers = {};
                    }
                    testState[currentBlock].answers[questionId] = e.target.value;
                    autoSaveExerciseState(tab);
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

        function loadAnswers() {
            const savedAnswers = testState[currentBlock].answers;
            if (!savedAnswers) return;

            for (const questionId in savedAnswers) {
                const inputEl = paneElement.querySelector(`[name="${questionId}"]`);
                if (inputEl) {
                    inputEl.value = savedAnswers[questionId];
                }
            }
        }
        
        function loadProgress() {
            if (loadFileInput) { // Null check for loadFileInput
                loadFileInput.click();
            }
        }

        if (loadFileInput) { // Null check for loadFileInput before adding event listener
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

                if (q.type === 'paragraph_error_id') {
                    q.parts.forEach((part, index) => {
                        const partIdName = `q${q.displayNum}_part${index}`;
                        const userAnswer = userAnswers[partIdName] || '';
                        const isCorrect = userAnswer.toLowerCase() === part.answer.toLowerCase();
                        const inputEl = paneElement.querySelector(`[name="${partIdName}"]`);
                        if (inputEl) {
                            inputEl.value = userAnswer; // Display user's answer
                            inputEl.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
                            
                            if (!isCorrect) {
                                const feedbackContainer = document.createElement('div');
                                feedbackContainer.className = 'feedback-container mt-1 ml-32 pl-4 flex items-center gap-4';
                                
                                const correctAnswerEl = document.createElement('div');
                                correctAnswerEl.className = 'correct-answer-text text-sm text-green-600 font-semibold';
                                correctAnswerEl.textContent = `Correct: ${part.answer}`;
                                feedbackContainer.appendChild(correctAnswerEl);

                                inputEl.parentElement.appendChild(feedbackContainer);
                            }
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
                        inputEl.value = userAnswer.toUpperCase(); // Set selected value for MC

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
                        isCorrect = userAnswer.toLowerCase() === q.answer.toLowerCase(); // Ensure case-insensitive comparison
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
                        
                        feedbackContainer.appendChild(correctAnswerEl);
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
                if (btn) { // Null check for explain-btn
                    btn.addEventListener('click', (e) => {
                        const content = e.target.parentElement.querySelector('.explanation-content');
                        if (content) { // Null check for content
                            content.classList.toggle('hidden');
                            e.target.textContent = content.classList.contains('hidden') ? 'Explain' : 'Hide';
                        }
                    });
                }
            });

        }
        
        function showDiagnostics() {
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

            const ctx = paneElement.querySelector(`#${canvasId}`);
            if (!ctx) return; // Null check for canvas context

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

        const backToReviewBtn = paneElement.querySelector('#back-to-review-btn');
        if (backToReviewBtn) { // Null check for back-to-review-btn
            backToReviewBtn.addEventListener('click', () => {
                diagnosticsView.classList.add('hidden');
                testContainer.classList.remove('hidden');
                const introView = paneElement.querySelector('#intro-view');
                if (introView) { // Null check for intro-view
                    introView.classList.remove('hidden');
                }
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
            tab.addEventListener('click', () => {
                if(!tab.disabled) {
                    switchDiagTab(tab.dataset.tab);
                }
            });
        });

        // Save/Load functionality
    const saveBtn = document.getElementById(`save-btn-${tab.id}`);
    const loadBtn = document.getElementById(`load-btn-${tab.id}`);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    paneElement.appendChild(fileInput); // Add it to the DOM to be clickable

    if (saveBtn) {
        saveBtn.onclick = async () => {
            const dataStr = JSON.stringify(tab.exerciseState, null, 2);
            const defaultFilename = `${tab.title}-progress.json`;
            const result = await window.api.showSaveDialogAndSaveFile({ defaultFilename: defaultFilename, data: dataStr });
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

    fileInput.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = e.target.result;
          if (!fileContent || fileContent.trim() === '') {
            console.error("Error loading JSON: File is empty.");
            // Optionally, show an error to the user in the UI
            return;
          }

          const newState = JSON.parse(fileContent);
          
          // More robust validation
          const isValidState = newState && 
                               typeof newState === 'object' &&
                               newState['1'] && newState['2'] && newState['3'] &&
                               'completed' in newState['1'] && 'answers' in newState['1'] &&
                               'completed' in newState['2'] && 'answers' in newState['2'] &&
                               'completed' in newState['3'] && 'answers' in newState['3'];
                               
          if (isValidState) {
            tab.exerciseState = newState;
            testState = newState; // Update the local reference
            autoSaveExerciseState(tab); // Auto-save the newly loaded state to the default path
            
            // Determine which block to show after loading
            let blockToRender = 1;
            for (let i = 1; i <= 3; i++) {
                if (!testState[i].completed) {
                    blockToRender = i;
                    break;
                }
                if (i === 3) blockToRender = 3; // If all are complete, show the last one
            }
            switchTab(blockToRender); // Re-render the UI
            
            console.log(`Manually loaded progress for ${tab.title}`);
          } else { 
            throw new Error("Invalid test progress file structure."); 
          }
        } catch (error) {
          console.error("Error loading JSON:", error);
          // Optionally, show an error to the user in the UI
        }
      };
      reader.readAsText(file);
      fileInput.value = ''; // Reset for next load
    };
        renderQuestions(currentBlock);
  }
