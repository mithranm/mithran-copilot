const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background.js',
    sidepanel: './src/sidepanel.js',
    'sidepanel-logic': './src/sidepanel-logic.js',
    settings: './src/settings.js'  // Add entry point for settings.js
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/manifest.json", to: "manifest.json" },
        { from: "src/sidepanel.html", to: "sidepanel.html" },
        { from: "src/settings.html", to: "settings.html" },  // Add this line to copy settings.html
      ],
    }),
  ],
  resolve: {
    fallback: {
      "crypto": false
    }
  },
  devtool: 'source-map'  // This will help with debugging
};