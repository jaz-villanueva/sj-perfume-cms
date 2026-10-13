// Every feature folder registers its pages in features/<name>/routes.js.
// They are discovered here at build time, so adding a page never requires editing a shared file.
const modules = import.meta.glob('../features/*/routes.js', { eager: true })

export const featureRoutes = Object.values(modules).flatMap((module) => module.default)

export const navItems = featureRoutes
  .filter((route) => route.nav)
  .map((route) => ({ path: route.path, ...route.nav }))
  .sort((a, b) => a.order - b.order)
