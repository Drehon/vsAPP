const fs = require('fs');
const path = require('path');

const patchNotesPath = path.join(__dirname, '..', 'patchnotes.json');
const templatePath = path.join(__dirname, '..', 'others', 'patch-notes-template.html');
const outputPath = path.join(__dirname, '..', 'others', 'patch-notes.html');

try {
  const patchNotesData = JSON.parse(fs.readFileSync(patchNotesPath, 'utf8'));
  const template = fs.readFileSync(templatePath, 'utf8');

  const patchNotesHtml = patchNotesData.map((note) => {
    const date = new Date(note.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const body = note.body.replace(/\r\n/g, '<br>');
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

  fs.writeFileSync(outputPath, outputHtml);

  console.log('Successfully updated patch-notes.html');
} catch (error) {
  console.error('Error updating patch-notes.html:', error);
  process.exit(1);
}
