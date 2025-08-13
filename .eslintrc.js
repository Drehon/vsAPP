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
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'global-require': 'off',
  },
  globals: {
    MAIN_WINDOW_WEBPACK_ENTRY: 'readonly',
    MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: 'readonly',
  },
};
