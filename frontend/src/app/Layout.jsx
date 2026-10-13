import { NavLink, Outlet } from 'react-router'
import { navItems } from './featureRoutes.js'

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">SJPT-CMS</span>
        <nav aria-label="Main">
          <ul className="app-nav">
            {navItems.map(({ path, label }) => (
              <li key={path}>
                <NavLink to={path} end={path === '/'}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
