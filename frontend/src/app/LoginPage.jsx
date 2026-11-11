
import { useState } from 'react'
import { Link } from 'react-router'
import logo from '../assets/sj-logo.webp'
import { useAuth } from './auth.js'

// CMS authentication for Owner and Staff.
// Guests may browse the public Catalog without signing in.
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
          <img
            src={logo}
            alt="SJ Perfume Trading"
            className="login-logo"
            width="96"
            height="96"
          />

          <h1>No access</h1>

          <p>
            This account is not active in SJ Perfume Trading's
            system. Ask the owner to activate it.
          </p>

          <button type="button" onClick={signOut}>
            Sign out
          </button>

          <div className="login-guest-section">
            <p>Want to explore our fragrances?</p>

            <Link to="/catalog" className="login-guest-button">
              Browse as Guest
            </Link>
          </div>
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
      <div className="login-card">
        <img
          src={logo}
          alt="SJ Perfume Trading"
          className="login-logo"
          width="96"
          height="96"
        />

        <h1>Welcome Back</h1>

        <p className="login-intro">
          Sign in to access the SJ Perfume Trading
          Management System.
        </p>

        <form onSubmit={handleSubmit} aria-label="Sign in">
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p role="alert" className="login-error">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="login-help">
            Forgot your password? Ask the owner to set a new one.
          </p>
        </form>

        <div className="login-guest-section">
          <p>Just looking for your next favorite fragrance?</p>

          <Link to="/catalog" className="login-guest-button">
            Browse as Guest
          </Link>

          <p className="login-guest-note">
            No account required. Explore our fragrance collection,
            prices, and availability.
          </p>
        </div>
      </div>
    </main>
  )
}
