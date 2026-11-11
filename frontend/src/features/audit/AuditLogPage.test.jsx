import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthContext, SAMPLE_AUTH } from '../../app/auth.js'
import AuditLogPage from './AuditLogPage.jsx'

const rows = () => screen.getAllByRole('row').slice(1)

describe('Audit log page', () => {
  it('lists entries newest first with who did what', async () => {
    render(<AuditLogPage />)
    expect(await screen.findByText('Exported data')).toBeInTheDocument()
    expect(rows()[0]).toHaveTextContent('Shop Owner (sample) (Owner)')
    expect(screen.getByText('Retail price: ₱1,150.00 → ₱1,200.00')).toBeInTheDocument()
    expect(screen.getByText('Sale S-2026-000003')).toBeInTheDocument()
  })

  it('filters by area and action', async () => {
    render(<AuditLogPage />)
    await screen.findByText('Exported data')
    fireEvent.change(screen.getByLabelText('Area'), { target: { value: 'sales' } })
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'removed' } })
    expect(await screen.findByText('Voided')).toBeInTheDocument()
    expect(rows()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText('Exported data')).toBeInTheDocument()
  })

  it('never shows customer personal details', async () => {
    render(<AuditLogPage />)
    await screen.findByText('Exported data')
    expect(screen.getByText('Name: [personal data]')).toBeInTheDocument()
  })

  it('is closed to Staff', () => {
    render(
      <AuthContext.Provider value={{ ...SAMPLE_AUTH, role: 'staff', signIn: async () => {}, signOut: async () => {} }}>
        <AuditLogPage />
      </AuthContext.Provider>,
    )
    expect(screen.getByText('Only the Owner can view the audit log.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
