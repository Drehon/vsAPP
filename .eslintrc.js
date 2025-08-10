module.exports = {
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
  ],
  plugins: ['jest'],
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
  },
  ignorePatterns: ['src/lib/**'],
  rules: {
    // Add any specific rule overrides here
  },
  globals: {
    MAIN_WINDOW_WEBPACK_ENTRY: 'readonly',
    MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: 'readonly',
  },
};
