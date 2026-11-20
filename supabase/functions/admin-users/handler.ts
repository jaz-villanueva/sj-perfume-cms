// admin-users: the Owner manages Staff accounts (FR-3, FR-16, NFR-7).
//
// Runs with the service-role (secret) key, so it can change Supabase Auth users; that key never
// reaches the browser. Every request must come from a signed-in, active Owner. The profile side
// of each change goes through public.admin_apply_account_change, which checks the rules again and
// records the Owner as the actor in the audit trail.
//
// Request:  POST { action, ... } with the caller's access token (supabase.functions.invoke does this)
//   create          { fullName, email, password }
//   update          { userId, fullName, email }
//   reset_password  { userId, password }
//   deactivate      { userId }
//   reactivate      { userId }
//   delete          { userId }   soft delete: the account can't sign in again, its history stays
// Response: 200 { account } or 4xx/5xx { error } with a message the screen can show.
//
// This file has no Deno-only code so it can be tested with Node (handler.test.ts).

// The parts of the supabase-js client this function uses.
export interface AdminClient {
  auth: {
    getUser(jwt: string): Promise<{ data: { user: { id: string } | null }; error: unknown }>
    admin: {
      createUser(attrs: Record<string, unknown>): Promise<{ data: { user: { id: string } | null }; error: AuthError | null }>
      updateUserById(id: string, attrs: Record<string, unknown>): Promise<{ data: unknown; error: AuthError | null }>
      deleteUser(id: string, shouldSoftDelete?: boolean): Promise<{ data: unknown; error: AuthError | null }>
    }
  }
  from(table: string): any
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: any; error: DbError | null }>
}

interface AuthError {
  message: string
  status?: number
  code?: string
}

interface DbError {
  message: string
  code?: string
  hint?: string
}

interface Profile {
  id: string
  full_name: string
  email: string | null
  role: string
  is_active: boolean
  deleted_at: string | null
  created_at?: string
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region, x-retry-count, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Long enough to stop a deactivated account from ever refreshing its session (about 100 years).
const BAN_FOREVER = '876000h'
const PROFILE_COLUMNS = 'id, full_name, email, role, is_active, deleted_at, created_at'

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export function validateName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > 100) throw new HttpError(400, 'Enter a name of 1 to 100 characters.')
  return name
}

export function validateEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!EMAIL.test(email)) throw new HttpError(400, 'Enter a valid e-mail address.')
  return email
}

export function validatePassword(value: unknown): string {
  const password = typeof value === 'string' ? value : ''
  if (password.length < 8) throw new HttpError(400, 'Use a password of at least 8 characters.')
  if (password.length > 72) throw new HttpError(400, 'Use a password of at most 72 characters.')
  return password
}

function validateUserId(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new HttpError(400, 'Choose an account.')
  return value
}

// Supabase Auth errors, in words the Owner can act on.
function authFailure(error: AuthError): HttpError {
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  if (text.includes('email_exists') || text.includes('already been registered') || text.includes('already registered')) {
    return new HttpError(409, 'Another account already uses this e-mail address.')
  }
  if (text.includes('weak_password') || text.includes('password')) {
    return new HttpError(400, error.message || 'Choose a stronger password.')
  }
  return new HttpError(502, `Supabase Auth refused the change: ${error.message}`)
}

// Database errors use the codes in docs/api-contracts.md.
function dbFailure(error: DbError): HttpError {
  const message = error.hint || error.message
  if (error.code === '42501') return new HttpError(403, message)
  if (error.code === 'P0002') return new HttpError(404, message)
  if (error.code === 'P0001') return new HttpError(400, message)
  return new HttpError(500, message)
}

async function loadProfile(admin: AdminClient, id: string): Promise<Profile | null> {
  const { data, error } = await admin.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw dbFailure(error)
  return data
}

// The account an action targets: it must exist and be a Staff account.
async function loadStaff(admin: AdminClient, id: string, { allowDeleted = false } = {}): Promise<Profile> {
  const target = await loadProfile(admin, id)
  if (!target) throw new HttpError(404, 'Account not found.')
  if (target.role !== 'staff') throw new HttpError(403, 'Only Staff accounts can be managed here.')
  if (target.deleted_at && !allowDeleted) throw new HttpError(400, 'This account was deleted and can no longer be changed.')
  return target
}

async function applyProfileChange(
  admin: AdminClient, actorId: string, userId: string, action: string, fullName?: string, email?: string,
): Promise<Profile> {
  const { data, error } = await admin.rpc('admin_apply_account_change', {
    p_actor: actorId,
    p_user_id: userId,
    p_action: action,
    p_full_name: fullName ?? null,
    p_email: email ?? null,
  })
  if (error) throw dbFailure(error)
  return data as Profile
}

async function updateAuthUser(admin: AdminClient, userId: string, attrs: Record<string, unknown>) {
  const { error } = await admin.auth.admin.updateUserById(userId, attrs)
  if (error) throw authFailure(error)
}

async function runAction(admin: AdminClient, actorId: string, body: Record<string, unknown>): Promise<Profile> {
  switch (body.action) {
    case 'create': {
      const fullName = validateName(body.fullName)
      const email = validateEmail(body.email)
      const password = validatePassword(body.password)
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // no e-mail is ever sent (architecture decision 4)
        user_metadata: { full_name: fullName },
        app_metadata: { created_by: actorId }, // names the Owner in the audit trail
      })
      if (error || !data.user) throw authFailure(error ?? { message: 'No account was returned.' })
      const created = await loadProfile(admin, data.user.id)
      if (!created) throw new HttpError(500, 'The account was created but its profile is missing.')
      return created
    }

    case 'update': {
      const userId = validateUserId(body.userId)
      const fullName = validateName(body.fullName)
      const email = validateEmail(body.email)
      const target = await loadStaff(admin, userId)
      if (email !== (target.email ?? '').toLowerCase()) {
        await updateAuthUser(admin, userId, { email, email_confirm: true })
      }
      return applyProfileChange(admin, actorId, userId, 'update', fullName, email)
    }

    case 'reset_password': {
      const userId = validateUserId(body.userId)
      const password = validatePassword(body.password)
      await loadStaff(admin, userId)
      await updateAuthUser(admin, userId, { password })
      return applyProfileChange(admin, actorId, userId, 'password_reset')
    }

    case 'deactivate': {
      // Profile first: the database stops this account's access on its next request.
      // The ban then stops it from refreshing its session.
      const userId = validateUserId(body.userId)
      await loadStaff(admin, userId)
      const account = await applyProfileChange(admin, actorId, userId, 'deactivate')
      await updateAuthUser(admin, userId, { ban_duration: BAN_FOREVER })
      return account
    }

    case 'reactivate': {
      const userId = validateUserId(body.userId)
      await loadStaff(admin, userId)
      await updateAuthUser(admin, userId, { ban_duration: 'none' })
      return applyProfileChange(admin, actorId, userId, 'reactivate')
    }

    case 'delete': {
      // Soft delete in Supabase Auth: the user can never sign in again, but the row stays, so
      // past sales and audit entries keep pointing at a named account (FR-16).
      const userId = validateUserId(body.userId)
      await loadStaff(admin, userId, { allowDeleted: true })
      const account = await applyProfileChange(admin, actorId, userId, 'delete')
      const { error } = await admin.auth.admin.deleteUser(userId, true)
      if (error && error.status !== 404) throw authFailure(error)
      return account
    }

    default:
      throw new HttpError(400, 'Unknown action.')
  }
}

export async function handle(req: Request, admin: AdminClient): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' })

  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (!token) throw new HttpError(401, 'Please sign in again.')
    const { data: caller, error: callerError } = await admin.auth.getUser(token)
    if (callerError || !caller?.user) throw new HttpError(401, 'Please sign in again.')

    const actor = await loadProfile(admin, caller.user.id)
    if (!actor || actor.role !== 'owner' || !actor.is_active || actor.deleted_at) {
      throw new HttpError(403, 'Only the Owner can manage accounts.')
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      throw new HttpError(400, 'Send the request as JSON.')
    }
    if (!body || typeof body !== 'object') throw new HttpError(400, 'Send the request as JSON.')

    const account = await runAction(admin, actor.id, body)
    return json(200, { account })
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message })
    console.error('admin-users failed', err instanceof Error ? err.message : err)
    return json(500, { error: 'Something went wrong. Try again.' })
  }
}
