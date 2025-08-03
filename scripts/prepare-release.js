const fs = require('fs').promises;
const path = require('path');

const main = async () => {
  try {
    console.log('Running pre-release script to update patch notes...');

    // Define paths relative to the project root
    const rootDir = path.join(__dirname, '..');
    const packageJsonPath = path.join(rootDir, 'package.json');
    const patchNotesPath = path.join(rootDir, 'patchnotes.json');

    // Read package.json to get the current version
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;
    const newTagName = `v${currentVersion}`;
    console.log(`Current app version is: ${currentVersion}`);

    // Read patchnotes.json
    const patchNotes = JSON.parse(await fs.readFile(patchNotesPath, 'utf8'));

    // Check if a note for the current version already exists
    const noteExists = patchNotes.some(note => note.tagName === newTagName);

    if (noteExists) {
      console.log(`A patch note entry for version ${newTagName} already exists. No changes needed.`);
      return; // Exit script
    }

    // If no note exists, create a new placeholder entry
    console.log(`No entry found for ${newTagName}. Creating a new placeholder patch note.`);
    const newNote = {
      body: 'Release notes are being prepared for this version.',
      name: `Version ${currentVersion}`,
      publishedAt: new Date().toISOString(),
      tagName: newTagName,
      version: currentVersion,
    };

    // Add the new note to the beginning of the array
    const updatedPatchNotes = [newNote, ...patchNotes];

    // Write the updated file
    await fs.writeFile(patchNotesPath, JSON.stringify(updatedPatchNotes, null, 2));
    console.log(`Successfully added placeholder for ${newTagName} to patchnotes.json.`);

  } catch (error) {
    console.error('Error during pre-release script execution:', error);
    process.exit(1); // Exit with an error code
  }
};

main();
