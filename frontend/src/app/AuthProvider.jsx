// Sign-in state for the whole app (FR-1, FR-2).
//
// Database mode: the user signs in with e-mail and password (Supabase Auth); their role
// ('owner' or 'staff') comes from public.profiles. The database enforces every permission on
// its own; the role here only decides what the screens show.
//
// Sample-data mode: there is no sign-in and the app behaves as the Owner, as before.
import { useEffect, useState } from 'react'
import { supabase as defaultClient } from '../lib/supabase.js'
import { AuthContext, SAMPLE_AUTH } from './auth.js'

export function AuthProvider({ client = defaultClient, children }) {
  const [state, setState] = useState(
    client ? { status: 'loading', isSample: false, user: null, role: null, fullName: '', error: '' } : SAMPLE_AUTH,
  )

  useEffect(() => {
    if (!client) return undefined
    let active = true

    async function apply(session) {
      if (!session) {
        if (active) setState((s) => ({ ...s, status: 'signed-out', user: null, role: null, fullName: '' }))
        return
      }
      const { data, error } = await client
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!active) return
      if (error || !data || !data.is_active) {
        setState({ status: 'no-access', isSample: false, user: session.user, role: null, fullName: '', error: error?.message ?? '' })
        return
      }
      setState({ status: 'signed-in', isSample: false, user: session.user, role: data.role, fullName: data.full_name, error: '' })
    }

    client.auth.getSession().then(({ data }) => apply(data.session))
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      // Token refreshes keep the same user; only reload the profile when the user changes.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Supabase recommends not awaiting other Supabase calls inside this callback.
        setTimeout(() => apply(session), 0)
      }
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [client])

  async function signIn(email, password) {
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      throw new Error(error.message === 'Invalid login credentials' ? 'Wrong e-mail or password.' : error.message)
    }
  }

  async function signOut() {
    if (client) await client.auth.signOut()
  }

  return <AuthContext.Provider value={{ ...state, signIn, signOut }}>{children}</AuthContext.Provider>
}
