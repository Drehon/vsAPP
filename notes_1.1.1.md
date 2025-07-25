### **Objective:**
Refactor the exercise pages to correctly handle and persist user-entered notes within the new tabbed architecture. This update will bring the application to version 1.1.1.

### **Problem Analysis:**
The current exercise files (`L1 - congiuntivoES.html`, etc.) contain self-contained logic that manages their own state, including notes. In a multi-tab SPA, this state is lost whenever a user switches tabs or views because the content is re-rendered. The notes functionality fails because the state is not being centrally managed.

---

### **Phase 0: Version Update**

1. **Update Version:**
   - In `package.json`, change `"version"` to `"1.1.1"`.

---

### **Phase 1: Centralize Exercise State & Logic**

The core of this fix is to move the exercise logic out of the individual HTML files and into the main `renderer.js` script.

* **File to Edit:** `src/renderer.js`
* **Actions:**
    1.  **Enhance Tab State:** Modify the tab state object to include a dedicated property for exercise progress.
        ```javascript
        {
          id: '...',
          // ... other properties
          exerciseState: null // Will hold { questions: [], answers: [], currentQuestion: 0 }
        }
        ```
    2.  **Create Generic Exercise Functions:** Add new functions to `renderer.js` that can manage any exercise.
        - `initializeExerciseState(tabId, exerciseData)`: Creates the `exerciseState` object for a tab.
        - `renderExerciseUI(tabId)`: Renders the current question, options, and notes for a given tab.
        - `handleExerciseAnswer(tabId, answer)`: Processes a user's answer, updates the state, and re-renders the exercise UI.
        - `saveNote(tabId, noteText)`: Updates the note for the current question in the tab's `exerciseState`.

---

### **Phase 2: Refactor Exercise HTML Files**

The exercise HTML files will be stripped of their logic, becoming simple templates for content and data.

* **Files to Edit:** All files in the `exercises` directory (e.g., `L1 - congiuntivoES.html`).
* **Actions:**
    1.  **Remove All Logic:** Delete the entire `<script>` block that contains the exercise functionality (`document.addEventListener`, `renderFase1`, `saveState`, etc.).
    2.  **Isolate Data:** Leave only the `exercises` data object inside a single `<script>` tag. Give this script a unique ID for easy selection.
        ```html
        <!-- In L1 - congiuntivoES.html -->
        <script id="exercise-data" type="application/json">
          {
            "fase1": [
              { "question": "...", "answer": false, "explanation": "..." },
              ...
            ],
            "fase2": [...],
            "fase3": [...]
          }
        </script>
        ```
    3.  **Standardize HTML Structure:** Ensure the HTML structure for displaying questions, options, and feedback has consistent IDs (e.g., `<div id="question-container">`, `<div id="options-container">`) so the generic functions in `renderer.js` can target them.

---

### **Phase 3: Update `renderer.js` Loading Logic**

Modify the function that loads content to handle the new exercise structure.

* **File to Edit:** `src/renderer.js`
* **Action:** Update the `loadContent...` function.
    - When loading an exercise file:
        1.  Fetch the HTML content as before.
        2.  Parse the HTML to find the `<script id="exercise-data">` element.
        3.  Extract and `JSON.parse` the content of that script tag.
        4.  Call `initializeExerciseState(activeTabId, parsedData)` to store the exercise data in the central state.
        5.  Inject the HTML *structure* into the tab's content pane.
        6.  Call `renderExerciseUI(activeTabId)` to display the first question and attach the new, centralized event listeners.

This refactoring ensures that all user input, including notes, is stored in the central `tabs` state array, making it persistent as long as the tab is open.
