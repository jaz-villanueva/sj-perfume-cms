
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',

    // Force sample-data mode for automated tests.
    // This prevents tests from accessing live Supabase.
    env: {
      VITE_USE_SAMPLE_DATA: 'true',
    },

    // Use threads to avoid slow worker startup on Windows.
    pool: 'threads',
  },
})
