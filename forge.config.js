// This line loads the .env file and makes the GITHUB_TOKEN available to the process.
require('dotenv').config();

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: [
      './lessons',
      './exercises',
      './app-update.yml'
    ]
  },
  rebuildConfig: {},
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          nodeIntegration: true,
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: path.join(__dirname, 'src/preload.js'),
                name: 'main_window_preload',
              },
            },
          ],
        },
      },
    },
  ],
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // THE FIX IS HERE: The remoteReleases line has been removed.
        // This prevents the installer from checking GitHub for updates during installation.
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Drehon', // Your GitHub username
          name: 'vsAPP'   // Your GitHub repository name
        },
        prerelease: false,
        draft: true,
      }
    }
  ],
  hooks: {
    postMake: async (forgeConfig, makeResults) => {
      console.log('Post-make hook: Triggered.');
      
      // Find the path to the generated .exe installer from the make results.
      const squirrelWindowsResult = makeResults.find(
        (result) => result.artifacts.some((artifact) => artifact.endsWith('.exe'))
      );

      if (!squirrelWindowsResult) {
          console.warn('Post-make hook: Could not find squirrel.windows build artifacts. Skipping YAML generation.');
          return makeResults;
      }
      
      const exePath = squirrelWindowsResult.artifacts.find((artifact) => artifact.endsWith('.exe'));

      // Run the script to generate the latest.yml file, passing the installer path as an argument.
      try {
        console.log(`Post-make hook: Generating latest.yml for installer at ${exePath}`);
        const scriptPath = path.join(__dirname, 'scripts', 'generate-update-yaml.js');
        // Pass the installer path as a command line argument to the script.
        execSync(`node "${scriptPath}" "${exePath}"`, { stdio: 'inherit' });
      } catch (err) {
        console.error('Post-make hook: Failed to generate latest.yml.');
        throw err;
      }

      // Find the path to the newly generated latest.yml file.
      const outputDir = path.dirname(exePath);
      const yamlPath = path.join(outputDir, 'latest.yml');

      if (fs.existsSync(yamlPath)) {
        console.log(`Post-make hook: Found ${yamlPath}.`);
        // Add the latest.yml to the list of artifacts to be published.
        squirrelWindowsResult.artifacts.push(yamlPath);
        console.log('Post-make hook: Added latest.yml to artifacts for publishing.');
      } else {
        console.error(`Post-make hook: ERROR - Could not find latest.yml at ${yamlPath} after generation.`);
      }
      
      // Return the modified results to the publish command.
      return makeResults;
    }
  }
};
