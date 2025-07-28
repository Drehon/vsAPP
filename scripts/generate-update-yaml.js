const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- Configuration ---
// Ensure these paths and names match your project
const appName = 'tutoring-app'; // As defined in package.json "name"
const outputBaseDir = path.join(__dirname, '..', 'out', 'make', 'squirrel.windows', 'x64');
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// --- Script Logic ---
async function generateUpdateYaml() {
  try {
    // 1. Read version from package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const appVersion = packageJson.version;
    console.log(`Detected app version: v${appVersion}`);

    // 2. Construct expected installer file name
    // Electron Forge's maker-squirrel typically names the installer like this:
    // [app-name]-[version] Setup.exe
    const installerFileName = `${appName}-${appVersion} Setup.exe`;
    const installerPath = path.join(outputBaseDir, installerFileName);

    // Ensure the installer file exists before proceeding
    if (!fs.existsSync(installerPath)) {
      console.error(`Error: Installer file not found at ${installerPath}`);
      console.error('Please ensure "npm run make" has completed successfully and generated the installer.');
      process.exit(1);
    }

    // 3. Calculate SHA512 checksum of the installer
    const fileBuffer = fs.readFileSync(installerPath);
    const sha512 = crypto.createHash('sha512').update(fileBuffer).digest('hex');
    console.log(`SHA512 checksum for ${installerFileName}: ${sha512}`);

    // 4. Generate YAML content
    const yamlContent = `version: ${appVersion}
files:
  - url: ${installerFileName}
    sha512: ${sha512}
releaseDate: "${new Date().toISOString()}"
`;

    // 5. Write the latest.yml file
    const yamlFilePath = path.join(outputBaseDir, 'latest.yml');
    fs.writeFileSync(yamlFilePath, yamlContent, 'utf8');
    console.log(`Successfully generated latest.yml at: ${yamlFilePath}`);

  } catch (error) {
    console.error('An error occurred during YAML generation:', error.message);
    process.exit(1);
  }
}

generateUpdateYaml();
