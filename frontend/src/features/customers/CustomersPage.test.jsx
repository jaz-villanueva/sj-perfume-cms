import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, SAMPLE_AUTH } from '../../app/auth.js'
import { resetSampleSales } from '../sales/salesApi.js'
import CustomersPage from './CustomersPage.jsx'
import { resetSampleCustomers } from './customersApi.js'

beforeEach(() => {
  resetSampleCustomers()
  resetSampleSales()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const asStaff = (ui) => (
  <AuthContext.Provider value={{ ...SAMPLE_AUTH, isSample: false, role: 'staff', fullName: 'Staff', signIn: async () => {}, signOut: async () => {} }}>
    {ui}
  </AuthContext.Provider>
)

const rows = () => screen.getAllByRole('row').slice(1)

describe('Customers page', () => {
  it('lists the customers', async () => {
    render(<CustomersPage />)
    expect(await screen.findByText('Ana Reyes')).toBeInTheDocument()
    expect(screen.getByText('0917 123 4567')).toBeInTheDocument()
  })

  it('filters by name or mobile number', async () => {
    render(<CustomersPage />)
    await screen.findByText('Ana Reyes')
    fireEvent.change(screen.getByLabelText('Search by name or mobile number'), { target: { value: '0918' } })
    expect(rows()).toHaveLength(1)
    expect(screen.getByText('Carlo Mendoza')).toBeInTheDocument()
  })

  it('will not save a customer without privacy consent', async () => {
    render(<CustomersPage />)
    await screen.findByText('Ana Reyes')
    fireEvent.click(screen.getByRole('button', { name: 'Add customer' }))
    const form = screen.getByRole('form', { name: 'Add customer' })
    fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Faye Lim' } })
    fireEvent.change(within(form).getByLabelText('Mobile number'), { target: { value: '0999 123 4567' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Save customer' }))
    expect(await within(form).findByText(/must agree to the privacy notice/)).toBeInTheDocument()
    expect(screen.queryByText('Faye Lim')).not.toBeInTheDocument()
  })

  it('saves a new customer once consent is given', async () => {
    render(<CustomersPage />)
    await screen.findByText('Ana Reyes')
    fireEvent.click(screen.getByRole('button', { name: 'Add customer' }))
    const form = screen.getByRole('form', { name: 'Add customer' })
    fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Faye Lim' } })
    fireEvent.change(within(form).getByLabelText('Mobile number'), { target: { value: '+63 999 123 4567' } })
    fireEvent.click(within(form).getByLabelText('The customer agreed to the privacy notice'))
    fireEvent.click(within(form).getByRole('button', { name: 'Save customer' }))
    expect(await screen.findByText('Saved Faye Lim.')).toBeInTheDocument()
    expect(screen.getByText('0999 123 4567')).toBeInTheDocument()
  })

  it('rejects a mobile number another customer already has', async () => {
    render(<CustomersPage />)
    await screen.findByText('Ana Reyes')
    fireEvent.click(screen.getByRole('button', { name: 'Add customer' }))
    const form = screen.getByRole('form', { name: 'Add customer' })
    fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Copy Cat' } })
    fireEvent.change(within(form).getByLabelText('Mobile number'), { target: { value: '0917-123-4567' } })
    fireEvent.click(within(form).getByLabelText('The customer agreed to the privacy notice'))
    fireEvent.click(within(form).getByRole('button', { name: 'Save customer' }))
    expect(await within(form).findByText('Another customer already has this mobile number.')).toBeInTheDocument()
  })

  it('shows a customer\'s sales and what they spent (FR-7)', async () => {
    render(<CustomersPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'View Ana Reyes' }))
    const panel = screen.getByRole('region', { name: 'Customer Ana Reyes' })
    expect(await within(panel).findByText('S-2026-000001')).toBeInTheDocument()
    expect(within(panel).getByText(/1 completed sale, ₱850\.00 in total/)).toBeInTheDocument()
  })

  it('lets the Owner export a customer\'s data as a file (NFR-5)', async () => {
    const createObjectURL = vi.fn(() => 'blob:export')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
    render(<CustomersPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'View Carlo Mendoza' }))
    const panel = screen.getByRole('region', { name: 'Customer Carlo Mendoza' })
    fireEvent.click(within(panel).getByRole('button', { name: 'Export data' }))
    expect(await within(panel).findByText(/Exported Carlo Mendoza’s data \(1 sales\)/)).toBeInTheDocument()
    expect(createObjectURL).toHaveBeenCalledOnce()
  })

  it('anonymises a customer only after confirmation and keeps their sales (NFR-5)', async () => {
    render(<CustomersPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'View Ana Reyes' }))
    const panel = screen.getByRole('region', { name: 'Customer Ana Reyes' })
    await within(panel).findByText('S-2026-000001')
    fireEvent.click(within(panel).getByRole('button', { name: 'Anonymise…' }))
    expect(screen.getByRole('button', { name: 'View Ana Reyes' })).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Yes, anonymise' }))
    expect(await screen.findByText(/Ana Reyes was anonymised\. Their 1 sale is kept/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View Ana Reyes' })).not.toBeInTheDocument()
  })

  it('does not offer export or anonymise to Staff', async () => {
    render(asStaff(<CustomersPage />))
    fireEvent.click(await screen.findByRole('button', { name: 'View Ana Reyes' }))
    const panel = screen.getByRole('region', { name: 'Customer Ana Reyes' })
    await within(panel).findByText('S-2026-000001')
    expect(within(panel).queryByRole('button', { name: 'Export data' })).not.toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Anonymise…' })).not.toBeInTheDocument()
  })
})
