import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { initialsFromEmail } from '../../utils/formatters'
import './Navbar.css'

export function Navbar({ title }) {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    toast.info('Signed out.')
    navigate('/login')
  }

  return (
    <header className="navbar">
      <h1 className="navbar__title">{title}</h1>
      <div className="navbar__user">
        <span className="navbar__email">{user?.email}</span>
        <div className="navbar__avatar" aria-hidden="true">
          {initialsFromEmail(user?.email)}
        </div>
        <button type="button" className="navbar__logout" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </header>
  )
}
