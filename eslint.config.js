import js from '@eslint/js';
import globals from 'globals';
import css from '@eslint/css';
import html from '@html-eslint/eslint-plugin';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '.installer-cache/**',
      'artifacts/**',
      '.validation-results/**',
    ],
  },
  // JavaScript rules
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  // Node.js CLI & tooling scripts
  {
    files: ['scripts/**/*.js', 'vite.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  // CSS rules
  {
    files: ['**/*.css'],
    plugins: {
      css,
    },
    language: 'css/css',
    rules: {
      ...css.configs.recommended.rules,
      'css/no-invalid-properties': ['error', { allowUnknownVariables: true }],
      'css/use-baseline': ['error', { available: 'newly' }],
    },
  },
  // HTML rules
  {
    files: ['**/*.html'],
    ...html.configs['flat/recommended'],
    rules: {
      ...html.configs['flat/recommended'].rules,
      '@html-eslint/require-closing-tags': ['error', { selfClosing: 'always' }],
      // Defer purely stylistic formatting rules to Prettier
      '@html-eslint/indent': 'off',
      '@html-eslint/element-newline': 'off',
      '@html-eslint/attrs-newline': 'off',
      '@html-eslint/quotes': 'off',
      '@html-eslint/no-extra-spacing-tags': 'off',
    },
  },
];
