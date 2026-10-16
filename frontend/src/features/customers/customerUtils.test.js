import { describe, expect, it } from 'vitest'
import { formatMobile, matchesSearch, normalizeMobile, validateCustomer } from './customerUtils.js'

describe('normalizeMobile', () => {
  it.each([
    ['09171234567', '09171234567'],
    ['0917 123 4567', '09171234567'],
    ['0917-123-4567', '09171234567'],
    ['+63 917 123 4567', '09171234567'],
    ['639171234567', '09171234567'],
    ['9171234567', '09171234567'],
  ])('reads %s as %s', (input, expected) => {
    expect(normalizeMobile(input)).toBe(expected)
  })

  it.each(['', '12345', '0817 123 4567', '0917123456', '091712345678', 'not a number'])('rejects %s', (input) => {
    expect(normalizeMobile(input)).toBeNull()
  })
})

describe('formatMobile', () => {
  it('groups the digits for display', () => {
    expect(formatMobile('09171234567')).toBe('0917 123 4567')
  })
})

describe('validateCustomer', () => {
  const valid = { name: 'Ana Reyes', mobile: '0917 123 4567', email: '', consent: true }
  const others = [{ id: 7, name: 'Someone', mobile: '09181112222' }]

  it('accepts a complete customer with consent', () => {
    expect(validateCustomer(valid, others)).toEqual({})
  })

  it('requires a name, a mobile number and consent', () => {
    const errors = validateCustomer({ name: ' ', mobile: '', consent: false }, others)
    expect(Object.keys(errors).sort()).toEqual(['consent', 'mobile', 'name'])
  })

  it('rejects a mobile number in the wrong format', () => {
    expect(validateCustomer({ ...valid, mobile: '12345' }).mobile).toMatch(/11-digit/)
  })

  it('rejects a duplicate mobile number written differently (NFR-6)', () => {
    expect(validateCustomer({ ...valid, mobile: '+63 918 111 2222' }, others).mobile).toMatch(/already has/)
  })

  it('lets a customer keep their own number when edited', () => {
    expect(validateCustomer({ ...valid, id: 7, mobile: '09181112222' }, others)).toEqual({})
  })

  it('checks the e-mail format only when one is given', () => {
    expect(validateCustomer({ ...valid, email: 'ana@' }).email).toBeDefined()
    expect(validateCustomer({ ...valid, email: 'ana@example.com' })).toEqual({})
  })
})

describe('matchesSearch', () => {
  const ana = { name: 'Ana Reyes', mobile: '09171234567' }
  it('matches part of the name, ignoring case', () => {
    expect(matchesSearch(ana, 'reyes')).toBe(true)
  })
  it('matches part of the mobile number in any format', () => {
    expect(matchesSearch(ana, '0917 123')).toBe(true)
    expect(matchesSearch(ana, '+63917')).toBe(true)
  })
  it('does not match unrelated text', () => {
    expect(matchesSearch(ana, 'carlo')).toBe(false)
  })
})
