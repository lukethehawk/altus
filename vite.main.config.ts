import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  define: {
    // Only set when building a local update test; release builds get "".
    ALTUS_TEST_UPDATE_FEED: JSON.stringify(
      process.env.ALTUS_TEST_UPDATE_FEED ?? ''
    ),
  },
  resolve: {
    // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
});
