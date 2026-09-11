import { useId, useState } from 'react'
import './Input.css'

export function Input({ label, error, hint, type = 'text', ...rest }) {
  const id = useId()
  const [showPassword, setShowPassword] = useState(false)
  
  const isPasswordField = type === 'password'
  const inputType = isPasswordField && showPassword ? 'text' : type

  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="field__wrapper">
        <input
          id={id}
          type={inputType}
          className={`field__input ${error ? 'field__input--error' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...rest}
        />
        {isPasswordField && (
          <button
            type="button"
            className="field__toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex="-1"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  )
}
