import { Link, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AmbientBackground } from '../components/common/AmbientBackground'
import { VaultlineLogo } from '../components/common/VaultlineLogo'
import './AuthLayout.css'

export function AuthLayout() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="auth-layout">
      <AmbientBackground />
      <div className="auth-layout__panel">
        <Link to="/" className="auth-layout__brand" title="Back to Vaultline Home">
          <VaultlineLogo size={36} />
          <span>Vaultline</span>
        </Link>
        <Outlet />
      </div>
      <p className="auth-layout__tagline">
        Files are encrypted in your browser before upload. Vaultline's servers only ever handle ciphertext.
      </p>
    </div>
  )
}
