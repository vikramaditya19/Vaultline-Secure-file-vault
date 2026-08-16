import { Link } from 'react-router-dom'
import { formatBytes, formatRelativeTime, extensionFromFilename } from '../../utils/formatters'
import './FileCard.css'

export function FileCard({ file, onDownload, onDelete, onShare }) {
  const name = file.metadata?.filename ?? '(unable to decrypt name)'
  const ext = file.metadata ? extensionFromFilename(file.metadata.filename) : '?'

  return (
    <div className="file-card">
      <Link to={`/files/${file.id}`} className="file-card__main">
        <div className="file-card__icon" aria-hidden="true">
          {ext.slice(0, 4)}
        </div>
        <div className="file-card__info">
          <span className="file-card__name" title={name}>
            {name}
          </span>
          <span className="file-card__meta">
            {formatBytes(file.sizeBytes)} · {formatRelativeTime(file.createdAt)}
            {!file.isOwner && ' · shared with you'}
          </span>
        </div>
      </Link>
      <div className="file-card__actions">
        <button type="button" className="file-card__action" onClick={() => onDownload(file)}>
          Download
        </button>
        {file.isOwner && (
          <button type="button" className="file-card__action" onClick={() => onShare(file)}>
            Share
          </button>
        )}
        {file.isOwner && (
          <button
            type="button"
            className="file-card__action file-card__action--danger"
            onClick={() => onDelete(file)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
