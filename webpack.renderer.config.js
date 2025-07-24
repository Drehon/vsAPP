const rules = require('./webpack.rules');

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  externals: {
    // In order to work with electron-forge, we need to tell webpack not to bundle node modules
    // so that we can use them in the renderer process.
    // See: https://webpack.js.org/configuration/externals/
    //
    // In this case, we are telling webpack to not bundle the 'fs' and 'path' modules.
    // We can add more modules here if we need them.
    ...require('webpack-node-externals')(),
  },
};
