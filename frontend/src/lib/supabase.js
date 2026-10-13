import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Null until frontend/.env.local is filled in, so the app shell still runs without a Supabase project.
export const supabase = url && publishableKey ? createClient(url, publishableKey) : null
