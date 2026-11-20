import { describe, expect, it } from 'vitest'
import { actionLabel, describeChanges, endOfDayPht, fieldLabel, formatValue, matchesFilters, recordLabel, startOfDayPht } from './auditUtils.js'

describe('describing entries', () => {
  it('names actions in plain words', () => {
    expect(actionLabel('insert', 'sales')).toBe('Recorded')
    expect(actionLabel('insert', 'products')).toBe('Added')
    expect(actionLabel('void', 'sales')).toBe('Voided')
    expect(actionLabel('password_reset', 'profiles')).toBe('Reset password')
  })

  it('names the record', () => {
    expect(recordLabel({ tableName: 'sales', recordLabel: 'S-2026-000004' })).toBe('Sale S-2026-000004')
    expect(recordLabel({ tableName: 'customers', recordLabel: 'Customer #7' })).toBe('Customer #7')
    expect(recordLabel({ tableName: 'products', recordId: '9', recordLabel: null })).toBe('Product #9')
  })

  it('shows an edit as before → after, without internal columns', () => {
    const changes = describeChanges({
      action: 'update', tableName: 'products',
      oldData: { retail_price: 500, updated_at: 'x' }, newData: { retail_price: 550, updated_at: 'y' },
    })
    expect(changes).toEqual([{ field: 'Retail price', from: '₱500.00', to: '₱550.00' }])
  })

  it('summarises a recorded sale', () => {
    const changes = describeChanges({
      action: 'insert', tableName: 'sales',
      newData: { channel: 'walk_in', total: 1100, items: [{ name: 'Audit Perfume', quantity: 2 }] },
    })
    expect(changes.map((c) => `${c.field}: ${c.to}`)).toEqual(['Channel: Walk-in', 'Items: Audit Perfume × 2', 'Total: ₱1,100.00'])
  })

  it('formats values', () => {
    expect(formatValue(null)).toBe('—')
    expect(formatValue(false)).toBe('No')
    expect(formatValue('[personal data]')).toBe('[personal data]')
    expect(formatValue('2026-11-10T04:00:00+00:00')).toMatch(/Nov 10, 2026/)
    expect(formatValue('stock_in', 'kind')).toBe('Stock-in')
    expect(fieldLabel('lead_time_days')).toBe('Lead time (days)')
    expect(fieldLabel('reference')).toBe('Reference')
  })
})

describe('filters', () => {
  const entry = { tableName: 'sales', action: 'void', actorId: 'a', createdAt: '2026-11-09T16:30:00+00:00' } // Nov 10, 00:30 PHT

  it('use Philippine days', () => {
    expect(startOfDayPht('2026-11-10')).toBe('2026-11-09T16:00:00.000Z')
    expect(endOfDayPht('2026-11-10')).toBe('2026-11-10T16:00:00.000Z')
    expect(matchesFilters(entry, { from: '2026-11-10', to: '2026-11-10' })).toBe(true)
    expect(matchesFilters(entry, { to: '2026-11-09' })).toBe(false)
  })

  it('match area, action group and person', () => {
    expect(matchesFilters(entry, { area: 'sales', actionGroup: 'removed', actorId: 'a' })).toBe(true)
    expect(matchesFilters(entry, { actionGroup: 'changed' })).toBe(false)
    expect(matchesFilters(entry, { actorId: 'b' })).toBe(false)
  })
})
