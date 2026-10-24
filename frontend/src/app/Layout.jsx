import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import logo from '../assets/sj-logo.webp'
import { Leaves } from '../components/Ornament.jsx'
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
            <img src={logo} alt="" className="app-logo" width="512" height="512" />
            <span className="app-wordmark-text" aria-hidden="true">
              <span className="app-wordmark-band">SJ PERFUME</span>
              <span className="app-wordmark-sub">trading</span>
            </span>
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
      <main className="app-main">
        <Leaves className="app-leaves app-leaves-top" />
        <Outlet />
        <Leaves className="app-leaves app-leaves-bottom" />
      </main>
    </div>
  )
}
