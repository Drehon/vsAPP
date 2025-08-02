const path = require('path');
const fs = require('fs').promises;

const updateAndGeneratePatchNotes = async (app, releaseInfo) => {
  console.log('[PatchNotes] Starting update and generation process.');
  const userDataPath = app.getPath('userData');
  const appPath = app.getAppPath();
  
  const userPatchNotesPath = path.join(userDataPath, 'patchnotes.json');
  const bundledPatchNotesPath = path.join(appPath, 'patchnotes.json');
  const templatePath = path.join(appPath, 'others', 'patch-notes-template.html');

  try {
      let patchNotes = [];
      try {
          const data = await fs.readFile(userPatchNotesPath, 'utf8');
          patchNotes = JSON.parse(data);
      } catch (error) {
          if (error.code === 'ENOENT') {
              console.log('[PatchNotes] No user patch notes found. Copying from bundle.');
              const bundledData = await fs.readFile(bundledPatchNotesPath, 'utf8');
              await fs.writeFile(userPatchNotesPath, bundledData);
              patchNotes = JSON.parse(bundledData);
          } else {
              throw error;
          }
      }

      if (releaseInfo) {
          const newTagName = `v${releaseInfo.version}`;
          const alreadyExists = patchNotes.some(note => note.tagName === newTagName);

          if (!alreadyExists) {
              console.log(`[PatchNotes] Adding new version ${newTagName}.`);
              const newNote = {
                  body: releaseInfo.notes || 'No release notes provided.',
                  name: releaseInfo.releaseName || `Version ${releaseInfo.version}`,
                  publishedAt: releaseInfo.releaseDate,
                  tagName: newTagName,
                  version: releaseInfo.version,
              };
              patchNotes.unshift(newNote);
              await fs.writeFile(userPatchNotesPath, JSON.stringify(patchNotes, null, 2));
              console.log('[PatchNotes] Successfully updated user patchnotes.json');
          }
      }

      const userOutputPath = path.join(userDataPath, 'patch-notes.html');
      const template = await fs.readFile(templatePath, 'utf8');
      const patchNotesHtml = patchNotes.map(note => {
          const date = new Date(note.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
          const body = note.body ? note.body.replace(/\r\n/g, '<br>') : '';
          return `
              <div class="bg-white rounded-lg shadow-lg overflow-hidden p-6">
                  <h2 class="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4">${note.name} - ${date}</h2>
                  <div class="prose max-w-none mt-4">
                      ${body}
                  </div>
              </div>
          `;
      }).join('');
      const outputHtml = template.replace('<!-- PATCH_NOTES_CONTENT -->', patchNotesHtml);
      await fs.writeFile(userOutputPath, outputHtml);
      console.log('[PatchNotes] Successfully generated user patch-notes.html');
  } catch (error) {
      console.error('[PatchNotes] Failed to update and generate patch notes:', error);
  }
};

module.exports = { updateAndGeneratePatchNotes };
