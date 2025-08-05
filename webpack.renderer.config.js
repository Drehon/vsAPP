const rules = require('./webpack.rules');
const CopyPlugin = require('copy-webpack-plugin');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/lib', to: 'lib' },
      ],
    }),
  ],
  // REQUIRED FOR THIS TEMPLATE: Provide Node.js globals.
  node: {
    __dirname: true,
    __filename: false,
  },
};
