import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Data-fetching inside useEffect is standard React; the rule
      // flags setState calls that are part of the async fetch chain.
      'react-hooks/set-state-in-effect': 'off',
      // Context files export both Provider component and useX hook — this is standard.
      'react-refresh/only-export-components': ['warn', { allowExportNames: ['useAuth', 'useCookieConsent', 'useToast'] }],
    },
  },
])
