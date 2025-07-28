const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: [
      './lessons',
      './exercises'
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
                // This name is required to correctly bundle the preload script.
                name: 'main_window_preload',
              },
            },
          ],
        },
      },
    },
    // Add the FusesPlugin here if it's not already present and you want to use it
    // {
    //   name: '@electron-forge/plugin-fuses',
    //   version: FuseVersion.V1,
    //   config: {
    //     [FuseV1Options.RunAsNode]: false,
    //     [FuseV1Options.EnableCookieEncryption]: true,
    //     [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    //     [FuseV1Options.EnableNodeCliInspectArguments]: false,
    //     [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    //     [FuseV1Options.OnlyLoadAppFromAsar]: true,
    //   },
    // },
  ],
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // Crucial for electron-updater to find latest.yml on GitHub
        // This tells maker-squirrel where to look for updates
        // It should match your publisher-github repository
        remoteReleases: 'https://github.com/Drehon/vsAPP',
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
  // Add the publishers configuration here
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Drehon', // Your GitHub username
          name: 'vsAPP'   // Your GitHub repository name
        },
        prerelease: false, // Set to true if this is a pre-release
        draft: true,      // Set to true if you want to create a draft release
        // It's highly recommended to use an environment variable for your token:
        // token: process.env.GITHUB_TOKEN
      }
    }
  ],
  hooks: {
    postMake: async (forgeConfig, makeResults) => {
      const { execSync } = require('child_process');
      const scriptPath = path.join(__dirname, 'scripts', 'publisher-helper.js');
      
      console.log(`Executing publisher-helper script at: ${scriptPath}`);
      try {
        execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
      } catch (error) {
        console.error('Error executing publisher-helper.js:', error);
        process.exit(1);
      }
    }
  }
};
