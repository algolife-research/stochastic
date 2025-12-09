import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'src-tauri'],
  },
  resolve: {
    alias: {
      '@audio': resolve(__dirname, 'src/audio'),
      '@canvas': resolve(__dirname, 'src/canvas'),
      '@core': resolve(__dirname, 'src/core'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@viz': resolve(__dirname, 'src/viz'),
      '@io': resolve(__dirname, 'src/io'),
      '@data': resolve(__dirname, 'src/data'),
    },
  },
});
