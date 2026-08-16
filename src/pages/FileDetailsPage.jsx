import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useModal } from '../hooks/useModal'
import { fileService } from '../services'
import { decryptFileMetadata, unwrapFileKey, decryptToFile } from '../crypto/fileCrypto'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/StatePanel'
import { Button } from '../components/common/Button'
import { ShareDialog } from '../components/files/ShareDialog'
import { formatBytes, formatDate, extensionFromFilename } from '../utils/formatters'
import './FileDetailsPage.css'

export function FileDetailsPage() {
  const { fileId } = useParams()
  const { user, privateKey } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { openModal } = useModal()

  const [detail, setDetail] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const raw = await fileService.getDetail({ userId: user.id, fileId })
        const dek = await unwrapFileKey(raw.wrappedKeyB64, privateKey)
        const meta = await decryptFileMetadata(raw.encryptedMetadataB64, dek)
        if (!cancelled) {
          setDetail(raw)
          setMetadata(meta)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load this file.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fileId, user.id, privateKey])

  async function handleDownload() {
    try {
      const raw = await fileService.download({ userId: user.id, fileId })
      const dek = await unwrapFileKey(raw.wrappedKeyB64, privateKey)
      const { file, objectUrl } = await decryptToFile(raw.ciphertext, raw.encryptedMetadataB64, dek)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = file.name
      a.click()
      URL.revokeObjectURL(objectUrl)
      toast.success('Decrypted and downloaded.')
    } catch (err) {
      toast.error(err.message || 'Could not decrypt this file — wrong key or tampered data.')
    }
  }

  async function handleDelete() {
    try {
      await fileService.remove({ userId: user.id, fileId })
      toast.success('File deleted.')
      navigate('/files')
    } catch (err) {
      toast.error(err.message || 'Could not delete this file.')
    }
  }

  function handleShare() {
    openModal({
      title: `Share "${metadata?.filename ?? 'file'}"`,
      content: <ShareDialog file={{ id: fileId, metadata }} />,
    })
  }

  if (isLoading) return <LoadingState label="Decrypting file details…" />
  if (error) return <ErrorState description={error} onRetry={() => window.location.reload()} />

  return (
    <div className="file-details">
      <button type="button" className="file-details__back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="file-details__panel">
        <div className="file-details__icon" aria-hidden="true">
          {extensionFromFilename(metadata.filename).slice(0, 4)}
        </div>
        <h2 className="file-details__name">{metadata.filename}</h2>

        <dl className="file-details__meta">
          <div>
            <dt>Size</dt>
            <dd>{formatBytes(detail.sizeBytes)}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{metadata.mimeType}</dd>
          </div>
          <div>
            <dt>Uploaded</dt>
            <dd>{formatDate(detail.createdAt)}</dd>
          </div>
          <div>
            <dt>Encryption</dt>
            <dd className="mono">AES-256-GCM</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>{detail.isOwner ? 'Owner' : 'Shared with you'}</dd>
          </div>
        </dl>

        <div className="file-details__actions">
          <Button onClick={handleDownload}>Download &amp; decrypt</Button>
          {detail.isOwner && (
            <Button variant="secondary" onClick={handleShare}>
              Share
            </Button>
          )}
          {detail.isOwner && (
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
