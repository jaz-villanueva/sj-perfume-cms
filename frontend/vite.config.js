import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    // Tests always use the built-in sample data, even when .env.local points at Supabase,
    // so they never read or write the real database.
    env: { VITE_USE_SAMPLE_DATA: 'true' },
    // Forked workers time out on some Windows machines (slow process start); threads work everywhere.
    pool: 'threads',
  },
})
