import { handleInteractiveExercise } from './handlers/exercise-handler.js';

// Placeholder handlers for different content modules.
// These will be replaced with actual implementations in later phases.

// The handlers now accept the tab and save function for state management.
function handleStaticLesson(paneElement, tab, saveExerciseState) {
  console.log('Hydrating a static lesson.', paneElement);
  // Future logic for static lessons (e.g., initializing notes component) will go here.
}

function handleDiagnosticTest(paneElement, tab, saveExerciseState) {
  console.log('Hydrating a diagnostic test.', paneElement);
  // Future logic for complex diagnostic tests will go here.
}

// Map module names to their handler functions.
const moduleHandlers = {
  'static-lesson': handleStaticLesson,
  'interactive-exercise': handleInteractiveExercise,
  'diagnostic-test': handleDiagnosticTest,
};

/**
 * Hydrates the content of a given pane element by inspecting its
 * data-module attribute and delegating to the appropriate handler.
 *
 * @param {HTMLElement} paneElement - The content pane containing the new content.
 * @param {object} tab - The tab object from the main renderer.
 * @param {Function} saveExerciseState - The debounced save function from the renderer.
 */
function hydrateContent(paneElement, tab, saveExerciseState) {
  // The element with the module information is expected to be the direct child of the pane.
  const contentRoot = paneElement.firstElementChild;

  if (!contentRoot || !contentRoot.hasAttribute('data-module')) {
    console.warn('Content loaded without a "data-module" attribute on its root element. No hydration will occur.', paneElement);
    return;
  }

  const moduleName = contentRoot.dataset.module;
  const handler = moduleHandlers[moduleName];

  if (handler) {
    console.log(`Found module "${moduleName}", delegating to handler.`);
    // Pass the pane, tab, and save function to the designated handler.
    handler(paneElement, tab, saveExerciseState);
  } else {
    console.warn(`No handler found for module: "${moduleName}".`);
  }
}

export {
  hydrateContent
};
