import './LoadingState.css'

export function Spinner({ size = 20 }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  )
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="loading-state">
      <Spinner size={22} />
      <p>{label}</p>
    </div>
  )
}
