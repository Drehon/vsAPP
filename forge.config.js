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
      // THE FIX IS HERE: Added the new content directories
      './lessonsAN',
      './others',
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
      
      const squirrelWindowsResult = makeResults.find(
        (result) => result.artifacts.some((artifact) => artifact.endsWith('.exe'))
      );

      if (!squirrelWindowsResult) {
          console.warn('Post-make hook: Could not find squirrel.windows build artifacts. Skipping YAML generation.');
          return;
      }
      
      const exePath = squirrelWindowsResult.artifacts.find((artifact) => artifact.endsWith('.exe'));

      // *** ADDED LOG HERE ***
      console.log('Post-make hook: Identified EXE path:', exePath);

      try {
        console.log(`Post-make hook: Generating latest.yml for installer at ${exePath}`);
        const scriptPath = path.join(__dirname, 'scripts', 'generate-update-yaml.js');
        execSync(`node "${scriptPath}" "${exePath}"`, { stdio: 'inherit' });
      } catch (err) {
        console.error('Post-make hook: Failed to generate latest.yml.');
        throw err;
      }

      const outputDir = path.dirname(exePath);
      const yamlPath = path.join(outputDir, 'latest.yml');

      if (fs.existsSync(yamlPath)) {
        console.log(`Post-make hook: Found ${yamlPath}.`);
        squirrelWindowsResult.artifacts.push(yamlPath);
        console.log('Post-make hook: Added latest.yml to artifacts for publishing.');
      } else {
        console.error(`Post-make hook: ERROR - Could not find latest.yml at ${yamlPath} after generation.`);
        throw new Error('latest.yml not found after generation');
      }
    }
  }
};
