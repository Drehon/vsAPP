const CopyPlugin = require('copy-webpack-plugin');
const rules = require('./webpack.rules');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }, { loader: 'postcss-loader' }],
});

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/lib', to: 'main_window/lib' },
      ],
    }),
  ],

  devServer: {
    host: 'localhost',
  },

  // REQUIRED FOR THIS TEMPLATE: Provide Node.js globals.
  node: {
    __dirname: true,
    __filename: false,
  },
};
