import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Tauri expects a fixed port, fail if port is not available
  server: {
    port: 1420,
    strictPort: true,
  },
  
  // Build for Tauri
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari15',
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  
  // Prevent vite from obscuring rust errors
  clearScreen: false,
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@data': path.resolve(__dirname, './src/data'),
      '@graph': path.resolve(__dirname, './src/graph'),
      '@audio': path.resolve(__dirname, './src/audio'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@canvas': path.resolve(__dirname, './src/canvas'),
      '@viz': path.resolve(__dirname, './src/viz'),
    },
  },
});
