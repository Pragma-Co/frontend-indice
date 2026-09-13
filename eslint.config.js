// Configuracao do ESLint (flat config).
//   npm run lint         lista os problemas
//   npm run lint:fix     corrige o que da para corrigir sozinho

import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    files: ['src/**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
  },

  {
    files: ['*.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },

  {
    files: ['src/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  eslintConfigPrettier,
]
