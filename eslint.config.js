import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'build/**',
      'dist/**',
      'node_modules/**',
      '*.tsbuildinfo',
      'coverage/**',
      'public/**',
      '.vite/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // React 18 + new JSX-Transform: import React nicht zwingend.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // Pragmatik: viele Bibliotheks-Adapter / Chevrotain-CST nutzen any
      // bewusst — als Warning markieren statt blocken.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Stale-Closure-Detector: P0-Bugs in useEffect/useMemo/useCallback.
      'react-hooks/exhaustive-deps': 'warn',
      // React-Compiler-Rules aus eslint-plugin-react-hooks@7 — informativ,
      // nicht blockierend bis aktiv adressiert (siehe Plan P3.x / Hygiene).
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/immutability': 'warn',
      'react/display-name': 'warn',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
);
