import { Link, NavLink } from 'react-router-dom'
import { VaultlineLogo } from '../common/VaultlineLogo'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/files', label: 'Files' },
  { to: '/shared', label: 'Shared with me' },
  { to: '/settings', label: 'Settings' },
  { to: '/demo', label: 'Interactive Demo ↗' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar__brand" title="Return to Landing Page">
        <VaultlineLogo size={28} />
        <span className="sidebar__brand-name">Vaultline</span>
      </Link>
      <nav className="sidebar__nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <p className="sidebar__footer-text">End-to-end encrypted. Only your browser holds plaintext.</p>
      </div>
    </aside>
  )
}
