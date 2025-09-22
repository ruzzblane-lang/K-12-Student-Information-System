module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    'no-console': 'off', // Allow console statements in development
    'no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_' 
    }]
  },
  overrides: [
    {
      files: ['**/public/sw*.js', '**/public/service-worker.js'],
      env: {
        serviceworker: true,
        browser: true
      },
      globals: {
        self: 'readonly',
        caches: 'readonly',
        indexedDB: 'readonly',
        fetch: 'readonly'
      },
      rules: {
        'no-console': 'off', // Service workers need console for debugging
        'no-unused-vars': 'warn', // Warn instead of error for unused vars in SW
        'array-callback-return': 'off' // Allow array map without return in some cases
      }
    }
  ],
  env: {
    browser: true,
    node: true
  }
};