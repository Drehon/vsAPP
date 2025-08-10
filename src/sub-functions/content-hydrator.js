import { ExerciseHandler } from './handlers/exercise-handler';
import { DiagnosticTestHandler } from './handlers/diagnostic-test-handler';

// Placeholder handlers for different content modules.
// These will be replaced with actual implementations in later phases.

function handleStaticLesson(paneElement, _tab, _saveState) {
  console.log('Hydrating a static lesson.', paneElement);
  // Future logic for static lessons (e.g., initializing notes component) will go here.
}

/**
 * A wrapper function to handle the instantiation of the ExerciseHandler class.
 * This creates a new instance and attaches it to the tab object.
 */
function handleInteractiveExerciseWrapper(paneElement, tab, saveState) {
  // Each interactive exercise tab gets its own isolated handler instance.
  // The instance is stored on the tab object itself for later access.
  tab.exerciseInstance = new ExerciseHandler(paneElement, tab, saveState);
}

/**
 * A wrapper function to handle the instantiation of the DiagnosticTestHandler class.
 * This creates a new instance and attaches it to the tab object.
 */
function handleDiagnosticTest(paneElement, tab, saveState) {
  // Each diagnostic test tab gets its own isolated handler instance.
  tab.exerciseInstance = new DiagnosticTestHandler(paneElement, tab, saveState);
}

// Map module names to their handler functions.
const moduleHandlers = {
  'static-lesson': handleStaticLesson,
  'interactive-exercise': handleInteractiveExerciseWrapper,
  'diagnostic-test': handleDiagnosticTest,
};

/**
 * Hydrates the content of a given pane element by inspecting its
 * data-module attribute and delegating to the appropriate handler.
 *
 * @param {HTMLElement} contentWrapper - The wrapper element containing the new content.
 * @param {object} tab - The active tab object from the renderer.
 * @param {function} saveState - The function to call to auto-save the exercise state.
 */
function hydrateContent(contentWrapper, tab, saveState) {
  // The element with the module information is expected to be the direct child of the wrapper.
  const contentRoot = contentWrapper.firstElementChild;

  if (!contentRoot || !contentRoot.hasAttribute('data-module')) {
    console.warn('Content loaded without a "data-module" attribute on its root element. No hydration will occur.', contentWrapper);
    return;
  }

  const moduleName = contentRoot.dataset.module;
  const handler = moduleHandlers[moduleName];

  if (handler) {
    console.log(`Found module "${moduleName}", delegating to handler.`);
    // Pass the wrapper, tab, and save function to the appropriate handler.
    handler(contentWrapper, tab, saveState);
  } else {
    console.warn(`No handler found for module: "${moduleName}".`);
  }
}

export {
  hydrateContent,
};
