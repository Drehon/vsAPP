// This line loads the .env file and makes the GITHUB_TOKEN available to the process.
require('dotenv').config();

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: [
      './pages/lessons',
      './pages/exercises',
      './pages/lessonsAN',
      './pages/others',
      './app-update.yml',
      './patchnotes.json',
    ],
  },
  rebuildConfig: {},
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './settings/webpack.main.config.js',
        renderer: {
          config: './settings/webpack.renderer.config.js',
          nodeIntegration: true,
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: path.join(__dirname, '../src/preload.js'),
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
      platforms: ['darwin', 'linux'],
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Drehon', // Your GitHub username
          name: 'vsAPP', // Your GitHub repository name
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
  hooks: {
    postMake: async (forgeConfig, makeResults) => {
      const squirrelWindowsResult = makeResults.find(
        (result) => result.artifacts.some((artifact) => artifact.endsWith('.exe')),
      );

      if (!squirrelWindowsResult) {
        return;
      }

      const exePath = squirrelWindowsResult.artifacts.find((artifact) => artifact.endsWith('.exe'));
      const scriptPath = path.join(__dirname, '../scripts', 'generate-update-yaml.js');
      execSync(`node "${scriptPath}" "${exePath}"`, { stdio: 'inherit' });

      const outputDir = path.dirname(exePath);
      const yamlPath = path.join(outputDir, 'latest.yml');

      if (fs.existsSync(yamlPath)) {
        squirrelWindowsResult.artifacts.push(yamlPath);
      } else {
        throw new Error('latest.yml not found after generation');
      }
    },
  },
};
