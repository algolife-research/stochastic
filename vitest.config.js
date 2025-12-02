import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use happy-dom for DOM APIs (faster than jsdom, ESM compatible)
    environment: 'happy-dom',
    
    // Test file patterns
    include: ['tests/unit/**/*.test.js'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['js/**/*.js'],
      exclude: ['js/examples.js'],
    },
    
    // Setup files
    setupFiles: ['./tests/setup.js'],
    
    // Global timeout
    testTimeout: 10000,
  },
});
