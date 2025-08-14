const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src', 'home-template.html'),
          to: path.resolve(__dirname, '.webpack/main', 'home-template.html'),
        },
        // ADDED: Ensure the settings template is also copied to the build output.
        {
          from: path.resolve(__dirname, 'src', 'settings-template.html'),
          to: path.resolve(__dirname, '.webpack/main', 'settings-template.html'),
        },
      ],
    }),
  ],
};
