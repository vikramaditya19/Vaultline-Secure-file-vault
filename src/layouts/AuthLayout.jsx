import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './AuthLayout.css'

export function AuthLayout() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout__panel">
        <div className="auth-layout__brand">
          <span className="auth-layout__brand-mark" aria-hidden="true" />
          <span>Vaultline</span>
        </div>
        <Outlet />
      </div>
      <p className="auth-layout__tagline">
        Files are encrypted in your browser before upload. Vaultline's servers only ever handle ciphertext.
      </p>
    </div>
  )
}
