import { describe, expect, it } from 'vitest'
import { groupNav } from './navSections.js'
import { navItems } from './featureRoutes.js'

describe('groupNav', () => {
  it('places every registered page in exactly one group', () => {
    const grouped = groupNav(navItems).flatMap((group) => group.items.map((item) => item.path))
    expect(grouped.sort()).toEqual(navItems.map((item) => item.path).sort())
  })

  it('puts unlisted pages under "More" and drops empty groups', () => {
    const groups = groupNav([
      { path: '/', label: 'Dashboard' },
      { path: '/new-page', label: 'New page' },
    ])
    expect(groups).toEqual([
      { title: 'Overview', items: [{ path: '/', label: 'Dashboard' }] },
      { title: 'More', items: [{ path: '/new-page', label: 'New page' }] },
    ])
  })
})
