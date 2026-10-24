import { useState } from 'react'
import logo from '../assets/sj-logo.webp'
import { useAuth } from './auth.js'

// Shown instead of the app until the user signs in (FR-1). Accounts are created by the
// Owner; there is no sign-up and no password-reset e-mail.
export default function LoginPage() {
  const { status, signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'loading') {
    return <p className="login-loading">Loading…</p>
  }

  if (status === 'no-access') {
    return (
      <main className="login-page">
        <section className="login-card">
          <h1>No access</h1>
          <p>This account is not active in SJ Perfume Trading’s system. Ask the owner to activate it.</p>
          <button type="button" onClick={signOut}>Sign out</button>
        </section>
      </main>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit} aria-label="Sign in">
        <img src={logo} alt="" className="login-logo" width="96" height="96" />
        <h1>Sign in</h1>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p role="alert" className="login-error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="login-help">Forgot your password? Ask the owner to set a new one.</p>
      </form>
    </main>
  )
}
