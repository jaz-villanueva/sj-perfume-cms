// Edge Function entry point. The logic is in handler.ts.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handle } from './handler.ts'

// The secret key bypasses row-level security, so it is used only here, never in the browser.
// Newer projects provide SUPABASE_SECRET_KEYS (a JSON map); older ones SUPABASE_SERVICE_ROLE_KEY.
function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>
      const key = parsed.default ?? Object.values(parsed)[0]
      if (key) return key
    } catch {
      // fall through to the single-key variables
    }
  }
  return Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve((req) => handle(req, admin))
