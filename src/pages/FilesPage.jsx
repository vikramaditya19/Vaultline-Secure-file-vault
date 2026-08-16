import { useState } from 'react'
import { useFiles } from '../hooks/useFiles'
import { useToast } from '../hooks/useToast'
import { useModal } from '../hooks/useModal'
import { UploadDropzone } from '../components/files/UploadDropzone'
import { UploadProgressList } from '../components/files/UploadProgressList'
import { FileList } from '../components/files/FileList'
import { ShareDialog } from '../components/files/ShareDialog'
import './FilesPage.css'

let uploadIdCounter = 0

export function FilesPage() {
  const { files, isLoading, error, refresh, uploadFile, downloadFile, deleteFile } = useFiles()
  const toast = useToast()
  const { openModal } = useModal()
  const [uploads, setUploads] = useState([])

  const ownedFiles = files.filter((f) => f.isOwner)

  function updateUpload(id, patch) {
    setUploads((current) => current.map((u) => (u.id === id ? { ...u, ...patch } : u)))
  }

  async function handleFilesSelected(browserFiles) {
    for (const browserFile of browserFiles) {
      const id = ++uploadIdCounter
      setUploads((current) => [...current, { id, name: browserFile.name, status: 'encrypting' }])
      try {
        await uploadFile(browserFile, {
          onProgress: (status) => updateUpload(id, { status }),
        })
        updateUpload(id, { status: 'done' })
        toast.success(`${browserFile.name} encrypted and uploaded.`)
      } catch (err) {
        updateUpload(id, { status: 'error', error: err.message || 'Upload failed.' })
        toast.error(`Could not upload ${browserFile.name}.`)
      }
    }
    setTimeout(() => setUploads((current) => current.filter((u) => u.status !== 'done')), 3000)
  }

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
      toast.error(err.message || 'Could not download this file. Wrong key or tampered data.')
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

  function handleShare(file) {
    openModal({
      title: `Share "${file.metadata?.filename ?? 'file'}"`,
      content: <ShareDialog file={file} onShared={refresh} />,
    })
  }

  return (
    <div className="files-page">
      <UploadDropzone onFilesSelected={handleFilesSelected} />
      <UploadProgressList uploads={uploads} />

      <div className="files-page__list">
        <FileList
          files={ownedFiles}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onShare={handleShare}
        />
      </div>
    </div>
  )
}
