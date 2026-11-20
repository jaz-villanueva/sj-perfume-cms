import { describe, expect, it } from 'vitest'
import { accountStatus, passwordError, sortAccounts, suggestPassword, validateAccount } from './userUtils.js'

describe('validateAccount', () => {
  const others = [{ id: 'a', email: 'liza@example.com' }]

  it('accepts a complete new account', () => {
    expect(validateAccount({ fullName: 'Ria', email: 'ria@example.com', password: 'temporary1' }, { withPassword: true, others })).toEqual({})
  })

  it('needs a name, a valid e-mail and a long enough password', () => {
    const errors = validateAccount({ fullName: ' ', email: 'ria@', password: 'short' }, { withPassword: true })
    expect(Object.keys(errors).sort()).toEqual(['email', 'fullName', 'password'])
  })

  it('catches an e-mail another account uses, ignoring case', () => {
    expect(validateAccount({ fullName: 'X', email: 'LIZA@example.com' }, { others }).email).toMatch(/already uses/)
    expect(validateAccount({ id: 'a', fullName: 'Liza', email: 'liza@example.com' }, { others })).toEqual({})
  })
})

describe('passwordError', () => {
  it.each([
    ['', 'Use at least 8 characters.'],
    ['1234567', 'Use at least 8 characters.'],
    ['12345678', ''],
    ['x'.repeat(73), 'Use at most 72 characters.'],
  ])('%j → %j', (password, message) => {
    expect(passwordError(password)).toBe(message)
  })
})

describe('accountStatus and sortAccounts', () => {
  const accounts = [
    { id: 1, fullName: 'Zed', role: 'staff', isActive: true, deletedAt: null },
    { id: 2, fullName: 'Ann', role: 'staff', isActive: false, deletedAt: '2026-11-01' },
    { id: 3, fullName: 'Owner', role: 'owner', isActive: true, deletedAt: null },
    { id: 4, fullName: 'Ben', role: 'staff', isActive: false, deletedAt: null },
  ]

  it('names the status', () => {
    expect(accounts.map(accountStatus)).toEqual(['Active', 'Deleted', 'Active', 'Deactivated'])
  })

  it('lists the Owner first and deleted accounts last', () => {
    expect(sortAccounts(accounts).map((a) => a.fullName)).toEqual(['Owner', 'Ben', 'Zed', 'Ann'])
  })
})

describe('suggestPassword', () => {
  it('makes a 12-character password without look-alike characters', () => {
    const password = suggestPassword()
    expect(password).toHaveLength(12)
    expect(password).not.toMatch(/[0O1lI]/)
    expect(passwordError(password)).toBe('')
  })
})
