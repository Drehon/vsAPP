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

        console.log("DiagnosticTestHandler instance created for tab:", this.activeTab.id);
    }
}
