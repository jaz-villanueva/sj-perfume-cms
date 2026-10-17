import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import SalesPage from './SalesPage.jsx'
import { resetSampleSales } from './salesApi.js'
import { resetSampleCustomers } from '../customers/customersApi.js'

beforeEach(() => {
  resetSampleSales()
  resetSampleCustomers()
})

async function openNewSale() {
  render(<SalesPage />)
  await screen.findByText('S-2026-000001')
  fireEvent.click(screen.getByRole('button', { name: 'New sale' }))
  return screen.getByRole('form', { name: 'New sale' })
}

function addProduct(form, search, name) {
  fireEvent.change(within(form).getByLabelText('Add a product'), { target: { value: search } })
  fireEvent.click(within(form).getByRole('button', { name: `Add ${name}` }))
}

describe('Sales page', () => {
  it('lists recent sales, newest first', async () => {
    render(<SalesPage />)
    await screen.findByText('S-2026-000001')
    const saleNos = screen.getAllByText(/^S-2026-\d{6}$/).map((el) => el.textContent)
    expect(saleNos).toEqual(['S-2026-000003', 'S-2026-000002', 'S-2026-000001'])
  })

  it('records a walk-in sale and shows its total', async () => {
    const form = await openNewSale()
    fireEvent.change(within(form).getByLabelText('Where did the order come from?'), { target: { value: 'walk_in' } })
    addProduct(form, 'rose', 'Rose Velvet Eau de Parfum')
    fireEvent.change(within(form).getByLabelText('Quantity of Rose Velvet Eau de Parfum'), { target: { value: '3' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Save sale' }))
    expect(await screen.findByText(/Sale S-\d{4}-000004 saved\. Total ₱2,550\.00\./)).toBeInTheDocument()
  })

  it('uses the reseller price and asks for the reseller', async () => {
    const form = await openNewSale()
    fireEvent.change(within(form).getByLabelText('Where did the order come from?'), { target: { value: 'reseller' } })
    addProduct(form, 'SJ-000101', 'Rose Velvet Eau de Parfum')
    fireEvent.click(within(form).getByRole('button', { name: 'Save sale' }))
    expect(await within(form).findByText('Choose the reseller.')).toBeInTheDocument()
    expect(within(form).queryByRole('option', { name: 'Fragrance Hub (old)' })).not.toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Reseller'), { target: { value: '1' } })
    expect(within(form).getAllByText('₱680.00').length).toBeGreaterThan(0)
  })

  it('stops a quantity above the stock on hand', async () => {
    const form = await openNewSale()
    fireEvent.change(within(form).getByLabelText('Where did the order come from?'), { target: { value: 'online' } })
    addProduct(form, 'vanilla', 'Vanilla Musk Eau de Parfum')
    fireEvent.change(within(form).getByLabelText('Quantity of Vanilla Musk Eau de Parfum'), { target: { value: '4' } })
    expect(within(form).getByText('Only 3 in stock.')).toBeInTheDocument()
    fireEvent.click(within(form).getByRole('button', { name: 'Save sale' }))
    expect(screen.queryByText(/saved\. Total/)).not.toBeInTheDocument()
  })

  it('does not offer products that are out of stock', async () => {
    const form = await openNewSale()
    fireEvent.change(within(form).getByLabelText('Add a product'), { target: { value: 'oud' } })
    expect(within(form).getByRole('button', { name: 'Add Oud Noir Extrait' })).toBeDisabled()
  })

  it('voids a sale with a reason and keeps it in the list', async () => {
    render(<SalesPage />)
    await screen.findByText('S-2026-000001')
    fireEvent.click(screen.getByRole('button', { name: 'Void S-2026-000001' }))
    fireEvent.change(screen.getByLabelText('Reason for voiding S-2026-000001'), { target: { value: 'Customer returned it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm void' }))
    expect(await screen.findByText('Sale S-2026-000001 voided. Its stock was returned.')).toBeInTheDocument()
    const row = screen.getByText('S-2026-000001').closest('tr')
    expect(within(row).getByText('Voided')).toBeInTheDocument()
  })
})
