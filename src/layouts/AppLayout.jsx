import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Navbar } from '../components/layout/Navbar'
import { useAuth } from '../hooks/useAuth'
import './AppLayout.css'

const TITLES = {
  '/dashboard': 'Dashboard',
  '/files': 'Files',
  '/shared': 'Shared with me',
  '/settings': 'Settings',
}

export function AppLayout() {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (!isAuthenticated && !isInitializing) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const title =
    Object.entries(TITLES).find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'Vaultline'

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__main">
        <Navbar title={title} />
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
