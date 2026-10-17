import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Screens use their built-in sample data until the database tables exist. Set
// VITE_USE_SAMPLE_DATA=false (frontend/.env.local, or the Cloudflare build variables) to use Supabase,
// or flip this default once the foundation migration is merged.
export const useSampleData = import.meta.env.VITE_USE_SAMPLE_DATA !== 'false'

// Null in sample-data mode or until frontend/.env.local is filled in, so the app still runs without a database.
export const supabase = !useSampleData && url && publishableKey ? createClient(url, publishableKey) : null
