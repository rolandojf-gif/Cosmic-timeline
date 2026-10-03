import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2022',
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
