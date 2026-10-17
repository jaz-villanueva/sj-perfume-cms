import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import CustomersPage from './CustomersPage.jsx'
import { resetSampleCustomers } from './customersApi.js'

beforeEach(() => {
  resetSampleCustomers()
})

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
})
