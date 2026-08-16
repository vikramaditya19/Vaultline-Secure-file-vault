import './Button.css'

/**
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * size: 'md' | 'sm'
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  type = 'button',
  icon,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && <span className="btn__spinner" aria-hidden="true" />}
      {icon && !isLoading && <span className="btn__icon">{icon}</span>}
      <span className={isLoading ? 'btn__label--loading' : ''}>{children}</span>
    </button>
  )
}
