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
  overrides: [
    {
      files: [
        '.eslintrc.js',
        'forge.config.js',
        'jest.config.js',
        'tailwind.config.js',
        'webpack.main.config.js',
        'webpack.renderer.config.js',
        'webpack.rules.js',
        'src/main.js',
        'src/preload.js',
        'src/sub-functions/utils.js',
        'scripts/**/*.js',
      ],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
};
