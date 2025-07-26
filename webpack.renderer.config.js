const rules = require('./webpack.rules');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

rules.push({
  test: /\.css$/,
  use: [
    { loader: MiniCssExtractPlugin.loader },
    { loader: 'css-loader' },
    { loader: 'postcss-loader' }
  ],
});

module.exports = {
  module: {
    rules,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'style.css', // Output CSS into a separate file
    }),
  ],
  // REQUIRED FOR THIS TEMPLATE: Provide Node.js globals.
  node: {
    __dirname: true,
    __filename: false,
  },
};
