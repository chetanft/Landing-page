import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDivElement: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        Event: 'readonly',
        MutationObserver: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        crypto: 'readonly',
        HTMLImageElement: 'readonly',
        CustomEvent: 'readonly',
        getComputedStyle: 'readonly',
        React: 'readonly',
        Node: 'readonly',
        AbortSignal: 'readonly',
        DOMException: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Promise: 'readonly',
        Error: 'readonly',
        JSON: 'readonly',
        Array: 'readonly',
        Object: 'readonly',
        String: 'readonly',
        Number: 'readonly',
        Boolean: 'readonly',
        Date: 'readonly',
        Math: 'readonly',
        RegExp: 'readonly',
        Intl: 'readonly',
        NodeJS: 'readonly',
        process: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      // TypeScript rules - errors for code quality
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'off',

      // React rules - errors for hook violations
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // Architecture constraints - errors for file size limits
      'max-lines': ['error', {
        max: 400,
        skipBlankLines: true,
        skipComments: true
      }],

      // General quality rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Use TypeScript's version
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  // Architecture constraint: No hooks inside data/ folder
  {
    files: ['src/**/data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['react'],
            importNames: ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'useReducer'],
            message: 'React hooks are not allowed in data/ layer. Move hook logic to hooks/ folder.'
          }
        ]
      }]
    }
  },
  // Architecture constraint: Features cannot import from sibling feature internals
  {
    files: ['src/modules/summary-dashboard/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['../../../**/auth/*', '!../../../**/auth/index', '!../../../**/auth'],
            message: 'Import from auth module index, not internal files.'
          }
        ]
      }]
    }
  },
  // Data registry files - exempt from line limit (static config)
  {
    files: ['src/**/data/metricsRegistry.ts'],
    rules: {
      'max-lines': 'off'
    }
  },
  // Auth API service - cohesive auth logic, allow slightly higher limit
  {
    files: ['src/**/auth/authApiService.ts'],
    rules: {
      'max-lines': ['error', { max: 450, skipBlankLines: true, skipComments: true }]
    }
  },
  // Data, auth, hooks - allow console for DEV debugging (guarded by import.meta.env.DEV)
  {
    files: ['src/**/data/**/*.ts', 'src/**/auth/**/*.ts', 'src/**/auth/**/*.tsx', 'src/**/hooks/**/*.ts'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'log', 'group', 'groupEnd'] }]
    }
  },
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.config.js',
      '*.config.ts',
      'scripts/**',
      'docs/**'
    ]
  }
]
