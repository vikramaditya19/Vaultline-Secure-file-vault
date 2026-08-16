import { useNavigate } from 'react-router-dom'
import { useFiles } from '../hooks/useFiles'
import { useToast } from '../hooks/useToast'
import { FileList } from '../components/files/FileList'
import { Button } from '../components/common/Button'
import { formatBytes } from '../utils/formatters'
import './DashboardPage.css'

export function DashboardPage() {
  const { files, isLoading, error, refresh, downloadFile, deleteFile } = useFiles()
  const toast = useToast()
  const navigate = useNavigate()

  const ownedFiles = files.filter((f) => f.isOwner)
  const sharedFiles = files.filter((f) => !f.isOwner)
  const totalBytes = ownedFiles.reduce((sum, f) => sum + (f.sizeBytes || 0), 0)

  async function handleDownload(file) {
    try {
      const { file: decrypted, objectUrl } = await downloadFile(file.id)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = decrypted.name
      a.click()
      URL.revokeObjectURL(objectUrl)
      toast.success('Decrypted and downloaded.')
    } catch (err) {
      toast.error(err.message || 'Could not download this file.')
    }
  }

  async function handleDelete(file) {
    try {
      await deleteFile(file.id)
      toast.success('File deleted.')
    } catch (err) {
      toast.error(err.message || 'Could not delete this file.')
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-stats">
        <div className="dashboard-stat">
          <span className="dashboard-stat__value">{ownedFiles.length}</span>
          <span className="dashboard-stat__label">Files stored</span>
        </div>
        <div className="dashboard-stat">
          <span className="dashboard-stat__value">{formatBytes(totalBytes)}</span>
          <span className="dashboard-stat__label">Encrypted at rest</span>
        </div>
        <div className="dashboard-stat">
          <span className="dashboard-stat__value">{sharedFiles.length}</span>
          <span className="dashboard-stat__label">Shared with you</span>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h2 className="dashboard-section__title">Recent files</h2>
          <Button variant="secondary" size="sm" onClick={() => navigate('/files')}>
            View all
          </Button>
        </div>
        <FileList
          files={files.slice(0, 5)}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onShare={(file) => navigate(`/files/${file.id}`)}
          emptyProps={{
            actionLabel: 'Upload a file',
            onAction: () => navigate('/files'),
          }}
        />
      </div>
    </div>
  )
}
