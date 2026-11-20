
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',

    // Tests use sample data even when .env.local points to Supabase.
    // This prevents automated tests from accessing the live database.
    env: {
      VITE_USE_SAMPLE_DATA: 'true',
    },

    // Threads avoid slow forked-worker startup on some Windows machines.
    pool: 'threads',
  },
})
