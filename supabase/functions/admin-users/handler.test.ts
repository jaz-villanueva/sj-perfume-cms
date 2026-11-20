// Tests for the admin-users function, with a fake Supabase client (no network).
// Run from the repository root:  node --test supabase/functions/admin-users/handler.test.ts
// (Node 22.18+ runs TypeScript directly; on older Node 22 add --experimental-strip-types.)
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { handle } from './handler.ts'

const OWNER = '00000000-0000-4000-8000-0000000000a1'
const STAFF = '00000000-0000-4000-8000-0000000000b2'
const NEW_ID = '00000000-0000-4000-8000-0000000000c3'

function fakeAdmin({ callerId = OWNER, authError = null as any, rpcError = null as any } = {}) {
  const calls: string[] = []
  const profiles: Record<string, any> = {
    [OWNER]: { id: OWNER, full_name: 'Owner', email: 'owner@example.com', role: 'owner', is_active: true, deleted_at: null },
    [STAFF]: { id: STAFF, full_name: 'Staff', email: 'staff@example.com', role: 'staff', is_active: true, deleted_at: null },
  }
  const admin = {
    calls,
    profiles,
    auth: {
      async getUser(jwt: string) {
        calls.push(`getUser ${jwt}`)
        return jwt === 'good-token' ? { data: { user: { id: callerId } }, error: null } : { data: { user: null }, error: { message: 'bad jwt' } }
      },
      admin: {
        async createUser(attrs: any) {
          calls.push(`createUser ${JSON.stringify(attrs)}`)
          if (authError) return { data: { user: null }, error: authError }
          profiles[NEW_ID] = { id: NEW_ID, full_name: attrs.user_metadata.full_name, email: attrs.email, role: 'staff', is_active: true, deleted_at: null }
          return { data: { user: { id: NEW_ID } }, error: null }
        },
        async updateUserById(id: string, attrs: any) {
          calls.push(`updateUserById ${id} ${JSON.stringify(attrs)}`)
          return { data: null, error: authError }
        },
        async deleteUser(id: string, soft?: boolean) {
          calls.push(`deleteUser ${id} soft=${soft}`)
          return { data: null, error: authError }
        },
      },
    },
    from(table: string) {
      const query = {
        id: '',
        select() { return query },
        eq(_col: string, value: string) { query.id = value; return query },
        async maybeSingle() { return { data: table === 'profiles' ? profiles[query.id] ?? null : null, error: null } },
      }
      return query
    },
    async rpc(fn: string, args: any) {
      calls.push(`rpc ${fn} ${args.p_action}${args.p_full_name ? ' ' + args.p_full_name : ''}`)
      if (rpcError) return { data: null, error: rpcError }
      const p = profiles[args.p_user_id]
      if (args.p_action === 'deactivate' || args.p_action === 'delete') p.is_active = false
      if (args.p_action === 'reactivate') p.is_active = true
      if (args.p_action === 'update') Object.assign(p, { full_name: args.p_full_name, email: args.p_email })
      return { data: { ...p }, error: null }
    },
  }
  return admin
}

function post(body: unknown, token = 'good-token') {
  return new Request('https://example.test/functions/v1/admin-users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function call(admin: any, body: unknown, token?: string) {
  const res = await handle(post(body, token), admin)
  return { status: res.status, body: await res.json() }
}

describe('admin-users', () => {
  it('answers the browser preflight request', async () => {
    const res = await handle(new Request('https://example.test', { method: 'OPTIONS' }), fakeAdmin() as any)
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*')
  })

  it('refuses a request without a valid sign-in', async () => {
    const res = await call(fakeAdmin(), { action: 'deactivate', userId: STAFF }, 'bad-token')
    assert.equal(res.status, 401)
  })

  it('refuses Staff', async () => {
    const admin = fakeAdmin({ callerId: STAFF })
    const res = await call(admin, { action: 'deactivate', userId: OWNER })
    assert.equal(res.status, 403)
    assert.equal(res.body.error, 'Only the Owner can manage accounts.')
    assert.ok(!admin.calls.some((c) => c.startsWith('updateUserById') || c.startsWith('rpc')))
  })

  it('creates a Staff account with no e-mail sent and the Owner recorded as creator', async () => {
    const admin = fakeAdmin()
    const res = await call(admin, { action: 'create', fullName: ' Liza Tan ', email: 'Liza@Example.com', password: 'temporary-1' })
    assert.equal(res.status, 200)
    assert.equal(res.body.account.email, 'liza@example.com')
    const created = JSON.parse(admin.calls.find((c) => c.startsWith('createUser'))!.slice('createUser '.length))
    assert.equal(created.email_confirm, true)
    assert.equal(created.user_metadata.full_name, 'Liza Tan')
    assert.equal(created.app_metadata.created_by, OWNER)
  })

  it('checks the password before contacting Supabase Auth', async () => {
    const admin = fakeAdmin()
    const res = await call(admin, { action: 'create', fullName: 'Liza', email: 'liza@example.com', password: 'short' })
    assert.equal(res.status, 400)
    assert.equal(res.body.error, 'Use a password of at least 8 characters.')
    assert.ok(!admin.calls.some((c) => c.startsWith('createUser')))
  })

  it('explains a duplicate e-mail address', async () => {
    const admin = fakeAdmin({ authError: { message: 'A user with this email address has already been registered', status: 422, code: 'email_exists' } })
    const res = await call(admin, { action: 'create', fullName: 'Liza', email: 'staff@example.com', password: 'temporary-1' })
    assert.equal(res.status, 409)
    assert.equal(res.body.error, 'Another account already uses this e-mail address.')
  })

  it('deactivates in the database first, then bans the sign-in', async () => {
    const admin = fakeAdmin()
    const res = await call(admin, { action: 'deactivate', userId: STAFF })
    assert.equal(res.status, 200)
    assert.equal(res.body.account.is_active, false)
    assert.deepEqual(admin.calls.slice(-2), [
      'rpc admin_apply_account_change deactivate',
      `updateUserById ${STAFF} {"ban_duration":"876000h"}`,
    ])
  })

  it('reactivates by lifting the ban, then restoring access', async () => {
    const admin = fakeAdmin()
    await call(admin, { action: 'reactivate', userId: STAFF })
    assert.deepEqual(admin.calls.slice(-2), [
      `updateUserById ${STAFF} {"ban_duration":"none"}`,
      'rpc admin_apply_account_change reactivate',
    ])
  })

  it('deletes softly, keeping the account row for history', async () => {
    const admin = fakeAdmin()
    const res = await call(admin, { action: 'delete', userId: STAFF })
    assert.equal(res.status, 200)
    assert.deepEqual(admin.calls.slice(-2), ['rpc admin_apply_account_change delete', `deleteUser ${STAFF} soft=true`])
  })

  it('never touches the Owner account', async () => {
    const admin = fakeAdmin()
    const res = await call(admin, { action: 'delete', userId: OWNER })
    assert.equal(res.status, 403)
    assert.ok(!admin.calls.some((c) => c.startsWith('deleteUser') || c.startsWith('rpc')))
  })

  it('changes the sign-in e-mail only when it changed', async () => {
    const admin = fakeAdmin()
    await call(admin, { action: 'update', userId: STAFF, fullName: 'Staff Two', email: 'staff@example.com' })
    assert.ok(!admin.calls.some((c) => c.startsWith('updateUserById')))
    await call(admin, { action: 'update', userId: STAFF, fullName: 'Staff Two', email: 'new@example.com' })
    assert.deepEqual(admin.calls.slice(-2), [
      `updateUserById ${STAFF} {"email":"new@example.com","email_confirm":true}`,
      'rpc admin_apply_account_change update Staff Two',
    ])
  })

  it('resets a password without passing it to the database', async () => {
    const admin = fakeAdmin()
    const res = await call(admin, { action: 'reset_password', userId: STAFF, password: 'new-temp-pass' })
    assert.equal(res.status, 200)
    assert.deepEqual(admin.calls.slice(-2), [
      `updateUserById ${STAFF} {"password":"new-temp-pass"}`,
      'rpc admin_apply_account_change password_reset',
    ])
  })

  it('shows the database hint when the database refuses', async () => {
    const admin = fakeAdmin({ rpcError: { code: 'P0001', message: 'account deleted', hint: 'This account was deleted and can no longer be changed.' } })
    const res = await call(admin, { action: 'deactivate', userId: STAFF })
    assert.equal(res.status, 400)
    assert.equal(res.body.error, 'This account was deleted and can no longer be changed.')
  })

  it('rejects an unknown action', async () => {
    const res = await call(fakeAdmin(), { action: 'promote', userId: STAFF })
    assert.equal(res.status, 400)
  })
})
