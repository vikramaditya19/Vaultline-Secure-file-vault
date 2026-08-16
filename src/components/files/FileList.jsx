import { FileCard } from './FileCard'
import { LoadingState } from '../common/LoadingState'
import { EmptyState, ErrorState } from '../common/StatePanel'
import './FileList.css'

export function FileList({ files, isLoading, error, onRetry, onDownload, onDelete, onShare, emptyProps }) {
  if (isLoading && files.length === 0) {
    return <LoadingState label="Decrypting your file list…" />
  }

  if (error) {
    return <ErrorState description={error} onRetry={onRetry} />
  }

  if (files.length === 0) {
    return (
      <EmptyState
        title="No files yet"
        description="Upload a file and it will be encrypted in your browser before it ever leaves your device."
        {...emptyProps}
      />
    )
  }

  return (
    <div className="file-list">
      {files.map((file) => (
        <FileCard key={file.id} file={file} onDownload={onDownload} onDelete={onDelete} onShare={onShare} />
      ))}
    </div>
  )
}
