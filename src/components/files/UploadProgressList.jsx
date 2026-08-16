import './UploadProgressList.css'

const STATUS_LABEL = {
  encrypting: 'Encrypting locally…',
  uploading: 'Uploading ciphertext…',
  done: 'Done',
  error: 'Failed',
}

export function UploadProgressList({ uploads }) {
  if (uploads.length === 0) return null

  return (
    <ul className="upload-progress">
      {uploads.map((upload) => (
        <li key={upload.id} className={`upload-progress__row upload-progress__row--${upload.status}`}>
          <span className="upload-progress__name">{upload.name}</span>
          <span className="upload-progress__status">
            {upload.status === 'encrypting' || upload.status === 'uploading' ? (
              <span className="upload-progress__spinner" aria-hidden="true" />
            ) : null}
            {upload.status === 'error' ? upload.error : STATUS_LABEL[upload.status]}
          </span>
        </li>
      ))}
    </ul>
  )
}
