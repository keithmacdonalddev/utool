module.exports = {
  root: true,
  extends: ['react-app', 'react-app/jest', '@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // React Hooks Safety Rules
    'react-hooks/exhaustive-deps': [
      'error',
      {
        additionalHooks: 'useSafeEffect|useStableCallback|useSafeDebounce',
      },
    ],

    // Hook Safety Rules (Custom)
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',

    // Prevent common infinite loop patterns
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'CallExpression[callee.name="useCallback"] Property[key.name="state"]',
        message:
          'Avoid using state directly in useCallback dependencies. Use useStateRef instead.',
      },
      {
        selector:
          'CallExpression[callee.name="useEffect"] Property[key.name="state"]',
        message:
          'Consider if state needs to be in useEffect dependencies. Use useStateRef if state access is needed without dependency.',
      },
    ],

    // Warn about potential performance issues
    'react/jsx-no-constructed-context-values': 'warn',
    'react/jsx-no-target-blank': 'warn',

    // TypeScript specific
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',

    // Import organization
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        // TypeScript files can use any
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['src/**/*.test.{js,jsx,ts,tsx}', 'src/**/*.spec.{js,jsx,ts,tsx}'],
      env: {
        jest: true,
      },
      rules: {
        // Test files can be more relaxed
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['src/hooks/**/*.{js,jsx,ts,tsx}'],
      rules: {
        // Hooks require extra safety
        'react-hooks/exhaustive-deps': [
          'error',
          {
            additionalHooks:
              'useSafeEffect|useStableCallback|useSafeDebounce|useDataFetching',
          },
        ],
        // Require documentation for custom hooks
        'require-jsdoc': [
          'warn',
          {
            require: {
              FunctionDeclaration: true,
              MethodDefinition: true,
              ClassDeclaration: false,
              ArrowFunctionExpression: true,
              FunctionExpression: true,
            },
          },
        ],
      },
    },
  ],
};
