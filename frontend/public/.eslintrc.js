module.exports = {
  env: {
    serviceworker: true,
    browser: true,
    worker: true
  },
  globals: {
    self: 'readonly',
    caches: 'readonly',
    indexedDB: 'readonly',
    fetch: 'readonly',
    importScripts: 'readonly'
  },
  rules: {
    'no-console': 'off', // Service workers need console for debugging
    'no-unused-vars': 'warn', // Warn instead of error for unused vars in SW
    'array-callback-return': 'off' // Allow array map without return in some cases
  }
};
