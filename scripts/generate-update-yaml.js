const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');

// This script now receives the absolute path to the installer as a command-line argument.
const installerPath = process.argv[2];

if (!installerPath || !fs.existsSync(installerPath)) {
  console.error(`Error: Installer file path not provided or file does not exist. Path: "${installerPath}"`);
  process.exit(1);
}

// Extract the filename from the provided path.
const installerFileName = path.basename(installerPath);
// Get the output directory from the installer path.
const outputDir = path.dirname(installerPath);

// Read package.json to get the version.
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const appVersion = packageJson.version;
console.log(`Detected app version: v${appVersion}`);

// Calculate the SHA512 checksum of the setup file.
const fileBuffer = fs.readFileSync(installerPath);
const sha512 = crypto.createHash('sha512').update(fileBuffer).digest('hex');
console.log(`SHA512 checksum for ${installerFileName}: ${sha512}`);

// Create the YAML content.
const yamlContent = {
  version: appVersion,
  files: [
    {
      url: installerFileName,
      sha512: sha512,
      size: fs.statSync(installerPath).size,
    },
  ],
  path: installerFileName,
  sha512: sha512,
  releaseDate: new Date().toISOString(),
};

// Convert the JavaScript object to a YAML string.
const yamlStr = yaml.dump(yamlContent);

// Write the YAML string to latest.yml in the same directory as the installer.
const yamlPath = path.join(outputDir, 'latest.yml');
fs.writeFileSync(yamlPath, yamlStr);

console.log(`Successfully generated latest.yml at: ${yamlPath}`);
