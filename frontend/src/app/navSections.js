// Sidebar groups. Pages register themselves in features/<name>/routes.js; this file only
// decides which group each one appears under. A page not listed here lands in "More".
export const NAV_SECTIONS = [
  { title: 'Overview', paths: ['/'] },
  { title: 'Sales', paths: ['/sales', '/customers', '/resellers'] },
  { title: 'Stock', paths: ['/products', '/inventory'] },
  { title: 'Insights', paths: ['/reports', '/trends', '/forecasts'] },
  { title: 'Storefront', paths: ['/catalog'] },
  { title: 'Admin', paths: ['/imports', '/users', '/audit'] },
]

export function groupNav(items) {
  const listed = new Set(NAV_SECTIONS.flatMap((section) => section.paths))
  const groups = NAV_SECTIONS.map((section) => ({
    title: section.title,
    items: section.paths.map((path) => items.find((item) => item.path === path)).filter(Boolean),
  }))
  groups.push({ title: 'More', items: items.filter((item) => !listed.has(item.path)) })
  return groups.filter((group) => group.items.length > 0)
}
