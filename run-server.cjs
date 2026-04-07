// 1. Polyfill AsyncLocalStorage on globalThis before Next.js loads its require-hook,
//    so Next.js uses real async storage instead of FakeAsyncLocalStorage.
const { AsyncLocalStorage } = require('node:async_hooks');
globalThis.AsyncLocalStorage = AsyncLocalStorage;

// 2. Resolve @/ path aliases (compiled dist/src/*) for the CJS runtime.
const path = require('path');
const { register } = require('tsconfig-paths');
register({
    baseUrl: path.join(__dirname, 'dist'),
    paths: { '@/*': ['src/*'] },
});

// 3. Start the compiled server.
require('./dist/server');
