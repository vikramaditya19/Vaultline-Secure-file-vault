import { useEffect } from 'react'
import { useModal } from '../../hooks/useModal'
import './Modal.css'

export function ModalRoot() {
  const { modal, closeModal } = useModal()

  useEffect(() => {
    if (!modal) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modal, closeModal])

  if (!modal) return null

  return (
    <div className="modal-backdrop" onMouseDown={closeModal}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={modal.title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-panel__header">
          <h2 className="modal-panel__title">{modal.title}</h2>
          <button type="button" className="modal-panel__close" aria-label="Close" onClick={closeModal}>
            ×
          </button>
        </div>
        <div className="modal-panel__body">{modal.content}</div>
      </div>
    </div>
  )
}
