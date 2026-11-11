import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthContext, SAMPLE_AUTH } from '../../app/auth.js'
import UsersPage from './UsersPage.jsx'
import { resetSampleUsers } from './usersApi.js'

beforeEach(() => {
  resetSampleUsers()
})

const asStaff = (ui) => (
  <AuthContext.Provider value={{ ...SAMPLE_AUTH, isSample: true, role: 'staff', fullName: 'Liza Tan', signIn: async () => {}, signOut: async () => {} }}>
    {ui}
  </AuthContext.Provider>
)

const row = (name) => screen.getByRole('cell', { name }).closest('tr')

describe('User accounts page', () => {
  it('lists every account with its status', async () => {
    render(<UsersPage />)
    expect(await screen.findByText('Liza Tan')).toBeInTheDocument()
    expect(within(row('Paolo Reyes')).getByText('Deactivated')).toBeInTheDocument()
    expect(within(row('Liza Tan')).getByText('Active')).toBeInTheDocument()
  })

  it('adds a Staff account with a temporary password', async () => {
    render(<UsersPage />)
    await screen.findByText('Liza Tan')
    fireEvent.click(screen.getByRole('button', { name: 'Add staff account' }))
    const form = screen.getByRole('form', { name: 'Add staff account' })
    fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Ria Santos' } })
    fireEvent.change(within(form).getByLabelText('E-mail (used to sign in)'), { target: { value: 'ria@example.com' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Suggest' }))
    expect(within(form).getByLabelText('Temporary password').value).toHaveLength(12)
    fireEvent.click(within(form).getByRole('button', { name: 'Add account' }))
    expect(await screen.findByText(/Added Ria Santos\./)).toBeInTheDocument()
    expect(within(row('Ria Santos')).getByText('Staff')).toBeInTheDocument()
  })

  it('refuses a short password and a duplicate e-mail', async () => {
    render(<UsersPage />)
    await screen.findByText('Liza Tan')
    fireEvent.click(screen.getByRole('button', { name: 'Add staff account' }))
    const form = screen.getByRole('form', { name: 'Add staff account' })
    fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Copy' } })
    fireEvent.change(within(form).getByLabelText('E-mail (used to sign in)'), { target: { value: 'LIZA.TAN@example.com' } })
    fireEvent.change(within(form).getByLabelText('Temporary password'), { target: { value: 'abc' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Add account' }))
    expect(await within(form).findByText('Another account already uses this e-mail address.')).toBeInTheDocument()
    expect(within(form).getByText('Use at least 8 characters.')).toBeInTheDocument()
  })

  it('deactivates only after confirmation, and can reactivate', async () => {
    render(<UsersPage />)
    await screen.findByText('Liza Tan')
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Liza Tan' }))
    expect(within(row('Liza Tan')).getByText('Active')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    expect(await screen.findByText('Liza Tan was deactivated.')).toBeInTheDocument()
    expect(within(row('Liza Tan')).getByText('Deactivated')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate Liza Tan' }))
    expect(await screen.findByText('Liza Tan can sign in again.')).toBeInTheDocument()
  })

  it('deletes an account but keeps it listed for history', async () => {
    render(<UsersPage />)
    await screen.findByText('Mark Dela Cruz')
    fireEvent.click(screen.getByRole('button', { name: 'Delete Mark Dela Cruz' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
    expect(await screen.findByText("Mark Dela Cruz's account was deleted.")).toBeInTheDocument()
    expect(within(row('Mark Dela Cruz')).getByText('Deleted')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Mark Dela Cruz' })).not.toBeInTheDocument()
  })

  it('offers no actions on the Owner account', async () => {
    render(<UsersPage />)
    await screen.findByText('Liza Tan')
    expect(within(row('Shop Owner (sample)')).queryAllByRole('button')).toHaveLength(0)
  })

  it('checks a password change before sending it', async () => {
    render(<UsersPage />)
    await screen.findByText('Liza Tan')
    const form = screen.getByRole('form', { name: 'Change my password' })
    fireEvent.change(within(form).getByLabelText('Current password'), { target: { value: 'old-password' } })
    fireEvent.change(within(form).getByLabelText('New password'), { target: { value: 'new-password-1' } })
    fireEvent.change(within(form).getByLabelText('New password again'), { target: { value: 'new-password-2' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Change password' }))
    expect(await within(form).findByText('The two new passwords don’t match.')).toBeInTheDocument()
  })

  it('shows Staff only their own account', async () => {
    render(asStaff(<UsersPage />))
    expect(await screen.findByRole('heading', { name: 'My account' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add staff account' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
