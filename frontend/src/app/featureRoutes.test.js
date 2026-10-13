import { describe, expect, it } from 'vitest'
import { featureRoutes, navItems } from './featureRoutes.js'

describe('feature route registry', () => {
  it('discovers the routes of every feature folder', () => {
    expect(featureRoutes.length).toBeGreaterThan(0)
  })

  it('gives every route an absolute, unique path and a component', () => {
    const paths = featureRoutes.map((route) => route.path)
    expect(new Set(paths).size).toBe(paths.length)
    for (const route of featureRoutes) {
      expect(route.path.startsWith('/')).toBe(true)
      expect(typeof route.Component).toBe('function')
    }
  })

  it('orders navigation items and keeps their labels unique', () => {
    const orders = navItems.map((item) => item.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    const labels = navItems.map((item) => item.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
