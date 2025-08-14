import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginJest from 'eslint-plugin-jest';
import pluginImport from 'eslint-plugin-import';

export default [
  // 1. Global ignores
  {
    ignores: [
      '**/node_modules/',
      '**/.webpack/',
      'src/lib/**',
      '.venv/',
    ],
  },

  // 2. Main configuration for all JS files
  pluginJs.configs.recommended,

  // 3. Custom rules and globals for all JS files
  {
    files: ['**/*.js'],
    plugins: {
      import: pluginImport,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        MAIN_WINDOW_WEBPACK_ENTRY: 'readonly',
        MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: 'readonly',
        api: 'readonly',
        Chart: 'readonly',
        ChartDataLabels: 'readonly',
      },
    },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'global-require': 'off',
      'no-undef': 'off',
      'no-use-before-define': 'off',
      'no-restricted-syntax': 'off',
      'no-await-in-loop': 'off',
      'class-methods-use-this': 'off',
      'no-redeclare': 'off',
      // Stricter rules enabled
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-extra-semi': 'error',
      'quotes': ['warn', 'single'],
      'semi': ['warn', 'always'],
      'indent': ['warn', 2],
      'no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
  },

  // 4. Jest configuration
  {
    files: ['tests/**/*.js'],
    ...pluginJest.configs['flat/recommended'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },

  // 5. Overrides for script files
  {
    files: [
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
    languageOptions: {
      sourceType: 'script',
    },
  },
];
