import { createContext, useCallback, useState } from 'react'

export const ModalContext = createContext(null)

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null) // { title, content, actions }

  const openModal = useCallback((config) => {
    setModal(config)
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
  }, [])

  return (
    <ModalContext.Provider value={{ modal, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  )
}
