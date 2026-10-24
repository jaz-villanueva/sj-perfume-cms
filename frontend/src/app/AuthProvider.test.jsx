import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { AuthProvider } from './AuthProvider.jsx'
import SalesPage from '../features/sales/SalesPage.jsx'

// A stand-in for the Supabase client with just the calls the AuthProvider makes.
function fakeClient({ session = null, profile = null, signInError = null } = {}) {
  let listener = null
  const client = {
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: (callback) => {
        listener = callback
        return { data: { subscription: { unsubscribe() {} } } }
      },
      signInWithPassword: async () => {
        if (signInError) return { error: { message: signInError } }
        session = { user: { id: 'user-1' } }
        listener?.('SIGNED_IN', session)
        return { error: null }
      },
      signOut: async () => {
        session = null
        listener?.('SIGNED_OUT', null)
        return { error: null }
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }) }),
  }
  return client
}

function renderApp(client, path = '/products') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider client={client}>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('sign-in (database mode)', () => {
  it('shows the sign-in form until the user signs in', async () => {
    renderApp(fakeClient())
    expect(await screen.findByRole('form', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('explains a wrong password', async () => {
    renderApp(fakeClient({ signInError: 'Invalid login credentials' }))
    const form = await screen.findByRole('form', { name: 'Sign in' })
    fireEvent.change(within(form).getByLabelText('E-mail'), { target: { value: 'staff@example.com' } })
    fireEvent.change(within(form).getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Wrong e-mail or password.')).toBeInTheDocument()
  })

  it('opens the app after signing in and shows who is signed in', async () => {
    renderApp(fakeClient({ profile: { full_name: 'Test Staff', role: 'staff', is_active: true } }))
    const form = await screen.findByRole('form', { name: 'Sign in' })
    fireEvent.change(within(form).getByLabelText('E-mail'), { target: { value: 'staff@example.com' } })
    fireEvent.change(within(form).getByLabelText('Password'), { target: { value: 'right' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('blocks a deactivated account', async () => {
    renderApp(fakeClient({ session: { user: { id: 'user-2' } }, profile: { full_name: 'Old', role: 'staff', is_active: false } }))
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument()
  })

  it('hides the Void button from Staff', async () => {
    render(
      <AuthProvider client={fakeClient({ session: { user: { id: 'user-1' } }, profile: { full_name: 'S', role: 'staff', is_active: true } })}>
        <SalesPage />
      </AuthProvider>,
    )
    await screen.findByText('S-2026-000001')
    expect(screen.queryByRole('button', { name: /^Void / })).not.toBeInTheDocument()
  })
})
