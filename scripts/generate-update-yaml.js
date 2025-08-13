const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');

// This script now receives the absolute path to the installer as a command-line argument.
const installerPath = process.argv[2];

if (!installerPath || !fs.existsSync(installerPath)) {
  process.exit(1);
}

// Extract the filename from the provided path.
let installerFileName = path.basename(installerPath);

// IMPORTANT FIX: Replace spaces with dots to match GitHub's filename transformation
// This ensures the filename in latest.yml matches the actual file on GitHub.
installerFileName = installerFileName.replace(/ /g, '.');

// Get the output directory from the installer path.
const outputDir = path.dirname(installerPath);

// Read package.json to get the version.
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const appVersion = packageJson.version;

// Calculate the SHA512 checksum of the setup file.
const fileBuffer = fs.readFileSync(installerPath);
const sha512 = crypto.createHash('sha512').update(fileBuffer).digest('base64');

// Define owner and repo for GitHub URL construction
const owner = 'Drehon'; // Replace with your GitHub username
const repo = 'vsAPP-public'; // Replace with your GitHub repository name

// Create the YAML content.
const yamlContent = {
  version: appVersion,
  files: [
    {
      url: installerFileName, // Use the transformed filename
      sha512,
      size: fs.statSync(installerPath).size,
    },
  ],
  path: installerFileName, // Use the transformed filename
  sha512,
  releaseDate: new Date().toISOString(),
  // electron-updater specific properties
  provider: 'github',
  url: `https://github.com/${owner}/${repo}/releases/latest`, // Base URL for GitHub releases
  disableWebInstaller: true, // Set to true as you are providing a full installer
  updaterCacheDirName: 'vsAPP-updater', // Resolve updaterCacheDirName warning
};

// Convert the JavaScript object to a YAML string.
const yamlStr = yaml.dump(yamlContent);

// Write the YAML string to latest.yml in the same directory as the installer.
const yamlPath = path.join(outputDir, 'latest.yml');
fs.writeFileSync(yamlPath, yamlStr);
