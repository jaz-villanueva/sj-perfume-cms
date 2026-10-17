import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadWith(env) {
  vi.resetModules()
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)
  return import('./supabase.js')
}

const configured = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
}

describe('supabase client switch', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses sample data by default, even when Supabase is configured', async () => {
    const { supabase, useSampleData } = await loadWith({ ...configured, VITE_USE_SAMPLE_DATA: undefined })
    expect(useSampleData).toBe(true)
    expect(supabase).toBeNull()
  })

  it('creates a client when sample data is switched off and Supabase is configured', async () => {
    const { supabase, useSampleData } = await loadWith({ ...configured, VITE_USE_SAMPLE_DATA: 'false' })
    expect(useSampleData).toBe(false)
    expect(supabase).not.toBeNull()
  })

  it('stays null when sample data is off but Supabase is not configured', async () => {
    const { supabase } = await loadWith({ VITE_USE_SAMPLE_DATA: 'false', VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' })
    expect(supabase).toBeNull()
  })
})
