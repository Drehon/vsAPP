// Placeholder handlers for different content modules.
// These will be replaced with actual implementations in later phases.

function handleStaticLesson(paneElement) {
  console.log('Hydrating a static lesson.', paneElement);
  // Future logic for static lessons (e.g., initializing notes component) will go here.
}

function handleInteractiveExercise(paneElement) {
  console.log('Hydrating an interactive exercise.', paneElement);
  // Future logic for standard exercises will go here.
}

function handleDiagnosticTest(paneElement) {
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
 */
function hydrateContent(paneElement) {
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
    handler(paneElement);
  } else {
    console.warn(`No handler found for module: "${moduleName}".`);
  }
}

export {
  hydrateContent
};
