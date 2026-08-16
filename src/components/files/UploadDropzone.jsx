import { useCallback, useRef, useState } from 'react'
import './UploadDropzone.css'

export function UploadDropzone({ onFilesSelected, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || [])
      if (files.length > 0) onFilesSelected(files)
    },
    [onFilesSelected]
  )

  return (
    <div
      className={`dropzone ${isDragOver ? 'dropzone--active' : ''} ${disabled ? 'dropzone--disabled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="visually-hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
        disabled={disabled}
      />
      <div className="dropzone__icon" aria-hidden="true">↑</div>
      <p className="dropzone__title">Drop files to encrypt and upload</p>
      <p className="dropzone__hint">or click to browse — encryption happens in your browser before anything uploads</p>
    </div>
  )
}
