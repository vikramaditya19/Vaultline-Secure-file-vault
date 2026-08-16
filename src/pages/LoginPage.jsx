import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { isValidEmail } from '../utils/validators'
import './AuthPages.css'

export function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    const nextErrors = {}
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address.'
    if (!password) nextErrors.password = 'Enter your password.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
      toast.success('Welcome back.')
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      setFormError(err.message || 'Could not sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <h2 className="auth-page__title">Sign in</h2>
      <p className="auth-page__subtitle">Your password never leaves your browser as plaintext.</p>

      <form className="auth-page__form" onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {formError && <p className="auth-page__error">{formError}</p>}
        <Button type="submit" isLoading={isSubmitting} style={{ width: '100%' }}>
          Sign in
        </Button>
      </form>

      <p className="auth-page__switch">
        Don't have an account? <Link to="/register">Create one</Link>
      </p>
    </>
  )
}
