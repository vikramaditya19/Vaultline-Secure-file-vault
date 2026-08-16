import './StatePanel.css'
import { Button } from './Button'

export function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="state-panel">
      {icon && <div className="state-panel__icon state-panel__icon--neutral">{icon}</div>}
      <h3 className="state-panel__title">{title}</h3>
      {description && <p className="state-panel__description">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="state-panel">
      <div className="state-panel__icon state-panel__icon--danger">!</div>
      <h3 className="state-panel__title">{title}</h3>
      {description && <p className="state-panel__description">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
