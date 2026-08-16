import { useFiles } from '../hooks/useFiles'
import { useToast } from '../hooks/useToast'
import { FileList } from '../components/files/FileList'
import './FilesPage.css'

export function SharedPage() {
  const { files, isLoading, error, refresh, downloadFile } = useFiles()
  const toast = useToast()

  const sharedFiles = files.filter((f) => !f.isOwner)

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

  return (
    <div className="files-page">
      <FileList
        files={sharedFiles}
        isLoading={isLoading}
        error={error}
        onRetry={refresh}
        onDownload={handleDownload}
        onDelete={() => toast.info('Only the owner can delete a shared file.')}
        onShare={() => toast.info('Only the owner can manage sharing for this file.')}
        emptyProps={{ description: 'Files someone else shares with you will show up here.' }}
      />
    </div>
  )
}
