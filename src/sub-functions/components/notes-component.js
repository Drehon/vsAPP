/**
 * Initializes all notes components within a given container.
 * This component is designed to be state-agnostic. It receives initial state
 * and uses a callback to report any changes. It does not interact with
 * localStorage or global state directly.
 *
 * @param {HTMLElement} container - The parent element to search for notes components.
 * @param {object} notesState - An object where keys are note IDs and values are the note content.
 * @param {function} onUpdate - A callback function invoked when a note is updated. It receives (noteId, newContent).
 */
export function initializeNotes(container, notesState = {}, onUpdate = () => {}) {
  const notesComponents = container.querySelectorAll('.notes-component');

  notesComponents.forEach(component => {
    const noteId = component.dataset.noteId;
    const toggleBtn = component.querySelector('.notes-toggle-btn');
    const content = component.querySelector('.notes-content');
    const textarea = component.querySelector('textarea');

    if (!noteId || !toggleBtn || !content || !textarea) {
      console.warn('Skipping invalid notes component:', component);
      return;
    }

    // 1. Load initial state
    if (notesState && notesState[noteId]) {
      textarea.value = notesState[noteId];
      // If there is content, show the notes by default
      content.classList.remove('hidden');
      toggleBtn.textContent = 'Hide Notes';
    } else {
      // Default state if no saved note
      content.classList.add('hidden');
      toggleBtn.textContent = 'Show Notes';
    }

    // 2. Add listener for toggling visibility
    toggleBtn.addEventListener('click', () => {
      const isHidden = content.classList.toggle('hidden');
      toggleBtn.textContent = isHidden ? 'Show Notes' : 'Hide Notes';
    });

    // 3. Add listener for content updates
    textarea.addEventListener('keyup', (e) => {
      onUpdate(noteId, e.target.value);
    });
  });
}

/*
  <!-- Standard HTML Structure for a Note Component -->
  <div class="notes-component" data-note-id="some-unique-id">
      <button type="button" class="notes-toggle-btn">Show Notes</button>
      <div class="notes-content hidden">
          <textarea placeholder="Notes..."></textarea>
      </div>
  </div>
*/
