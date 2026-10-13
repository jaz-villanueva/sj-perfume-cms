import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app from /<repo>/, so the deploy workflow sets BASE_PATH; everywhere else it is /.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    // Forked workers time out on some Windows machines (slow process start); threads work everywhere.
    pool: 'threads',
  },
})
