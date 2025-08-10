const path = require('path');
const fs = require('fs').promises;

/**
 * Generates the patch-notes.html file from a given set of patch notes data.
 * This function is purely for rendering; it does not fetch or decide on the data source.
 * @param {object} app - The Electron app instance.
 * @param {Array<object>} patchNotesData - The array of patch note objects to render.
 */
const generatePatchHTML = async (app, patchNotesData) => {
  // console.log('[PatchNotes] Generating patch-notes.html from provided data.');
  const userDataPath = app.getPath('userData');

  // The HTML template is always loaded from the application's bundled resources.
  const basePath = app.isPackaged ? process.resourcesPath : app.getAppPath();
  const templatePath = path.join(basePath, 'others', 'patch-notes-template.html');
  const userOutputPath = path.join(userDataPath, 'patch-notes.html');

  const template = await fs.readFile(templatePath, 'utf8');

  // Generate the HTML for each patch note entry.
  const patchNotesHtml = patchNotesData.map((note) => {
    // Provide a fallback for the date if `publishedAt` is missing.
    const dateStr = note.publishedAt ? new Date(note.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }) : 'N/A';
    const body = note.body ? note.body.replace(/\r\n/g, '<br>') : 'No details provided.';
    const name = note.name || note.tagName || 'Unnamed Update';

    return `
        <div class="bg-white rounded-lg shadow-lg overflow-hidden p-6">
            <h2 class="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4">${name} - ${dateStr}</h2>
            <div class="prose max-w-none mt-4">
                ${body}
            </div>
        </div>
      `;
  }).join('');

  const outputHtml = template.replace('<!-- PATCH_NOTES_CONTENT -->', patchNotesHtml);
  await fs.writeFile(userOutputPath, outputHtml);
  // console.log('[PatchNotes] Successfully generated and saved patch-notes.html to '
  //   + `${userOutputPath}`);
};

module.exports = { generatePatchHTML };
