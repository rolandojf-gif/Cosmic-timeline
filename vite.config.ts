import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2022',
    // three.js is loaded as its own chunk after the panel (~150 kB gzip); the
    // budget that matters is the plan's 200 kB gzip in total, not 500 kB minified.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      // Keep `@license` comments (third-party data notices) in the bundle.
      output: { comments: { legal: true } },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
