import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TrendsPage from './TrendsPage.jsx'

describe('Sales trends page', () => {
  it('shows weekly, monthly and product trends from recorded sales, and says they are not forecasts', async () => {
    render(<TrendsPage />)
    expect(await screen.findByRole('heading', { name: 'Weekly sales' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Monthly totals' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Product trend' })).toBeTruthy()
    expect(screen.getByText(/not forecasts/i)).toBeTruthy()
    expect(screen.getByText(/showing sample data/i)).toBeTruthy()
  })
})
