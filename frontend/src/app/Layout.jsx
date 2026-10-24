import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Swash, Vine } from '../components/Ornament.jsx'
import { navItems } from './featureRoutes.js'
import { groupNav } from './navSections.js'

const groups = groupNav(navItems)

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <Link to="/" className="app-wordmark" aria-label="SJ Perfume Trading home">
            <span className="app-wordmark-caps">SJ</span>
            <span className="app-wordmark-script">Perfume</span>
            <span className="app-wordmark-caps">Trading</span>
            <Swash className="app-wordmark-swash" />
          </Link>
          <button
            type="button"
            className="app-menu-button"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
        <nav id="main-nav" aria-label="Main" className="app-nav" data-open={menuOpen}>
          {groups.map((group) => (
            <div key={group.title} className="app-nav-section">
              <p className="app-nav-title">{group.title}</p>
              <ul>
                {group.items.map(({ path, label }) => (
                  <li key={path}>
                    <NavLink to={path} end={path === '/'} onClick={() => setMenuOpen(false)}>
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <Vine className="app-ornament app-ornament-left" />
      <Vine className="app-ornament app-ornament-right" />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
