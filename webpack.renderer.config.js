const rules = require('./webpack.rules');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  // Explicitly tell Webpack not to handle Node.js globals.
  // This is the key to resolving the '__dirname is not defined' error
  // when nodeIntegration is disabled.
  node: {
    __dirname: false,
    __filename: false,
  },
};
