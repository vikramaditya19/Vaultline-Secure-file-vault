import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { isValidEmail, validatePassword, passwordsMatch } from '../utils/validators'
import './AuthPages.css'

export function RegisterPage() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    const nextErrors = {}
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address.'
    const passwordIssue = validatePassword(password)
    if (passwordIssue) nextErrors.password = passwordIssue
    if (!passwordsMatch(password, confirmPassword)) nextErrors.confirmPassword = 'Passwords do not match.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await register(email.trim(), password)
      toast.success('Account created. Your encryption keys were generated locally.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setFormError(err.message || 'Could not create account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <h2 className="auth-page__title">Create your vault</h2>
      <p className="auth-page__subtitle">
        Your encryption keypair is generated in this browser. There is no password reset that recovers old files —
        losing your password means losing access to them.
      </p>

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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={!errors.password ? 'At least 10 characters, mixed case, and a number.' : undefined}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />
        {formError && <p className="auth-page__error">{formError}</p>}
        <Button type="submit" isLoading={isSubmitting} style={{ width: '100%' }}>
          Create account
        </Button>
      </form>

      <p className="auth-page__switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </>
  )
}
