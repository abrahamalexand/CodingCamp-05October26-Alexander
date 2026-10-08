import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in a jsdom environment so browser globals are available
    environment: 'jsdom',
    include: ['js/**/*.test.js'],
  },
});
