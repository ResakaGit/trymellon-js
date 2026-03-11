// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.{js,ts}',
      '.github/**',
      'scripts/**',
      'e2e/**',
    ],
  },
  // P2-B: forbid innerHTML/outerHTML in UI layer to prevent DOM-based XSS (02-auditoria-seguridad)
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='innerHTML']",
          message:
            'P2-B: innerHTML is forbidden in src/ui. Use createElement + textContent to prevent XSS.',
        },
        {
          selector: "MemberExpression[property.name='outerHTML']",
          message:
            'P2-B: outerHTML is forbidden in src/ui. Use createElement + textContent to prevent XSS.',
        },
      ],
    },
  }
);
