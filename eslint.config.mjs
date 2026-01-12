import nextPlugin from '@next/eslint-plugin-next';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const nextCoreWebVitals = nextPlugin.configs['core-web-vitals'];

export default [
  {
    ignores: ['**/.next/**', '**/node_modules/**', '**/out/**', '**/coverage/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    ...nextCoreWebVitals,
    plugins: {
      ...(nextCoreWebVitals.plugins ?? {}),
      'react-hooks': reactHooksPlugin,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
    },
  },
];








