import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { fileService, authService } from '../services'
import {
  generateFileKey,
  encryptFile,
  decryptFileMetadata,
  decryptToFile,
  unwrapFileKey,
  wrapFileKey,
} from '../crypto'
import { importPublicKey } from '../crypto/keyManagement'

/**
 * Loads the current user's file list, decrypting each file's metadata
 * (filename, mime type) client-side after unwrapping its DEK with the
 * user's private key. The server only ever returned ciphertext + an
 * encrypted metadata blob — this hook is where that becomes something
 * a component can render.
 */
export function useFiles() {
  const { user, privateKey } = useAuth()
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!user || !privateKey) return
    setIsLoading(true)
    setError(null)
    try {
      const rawFiles = await fileService.list({ userId: user.id })
      const decorated = await Promise.all(
        rawFiles.map(async (raw) => {
          try {
            const dek = await unwrapFileKey(raw.wrappedKeyB64, privateKey)
            const metadata = await decryptFileMetadata(raw.encryptedMetadataB64, dek)
            return { ...raw, metadata, decryptError: null }
          } catch (err) {
            return { ...raw, metadata: null, decryptError: 'Could not decrypt metadata.' }
          }
        })
      )
      decorated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setFiles(decorated)
    } catch (err) {
      setError(err.message || 'Failed to load files.')
    } finally {
      setIsLoading(false)
    }
  }, [user, privateKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  const uploadFile = useCallback(
    async (browserFile, { onProgress } = {}) => {
      if (!user || !privateKey) throw new Error('Not authenticated.')
      onProgress?.('encrypting')
      const dek = await generateFileKey()
      const { ciphertext, encryptedMetadataB64, sizeBytes } = await encryptFile(browserFile, dek)

      // Owner needs their own public key to wrap the DEK for themself too.
      const { publicKeyB64 } = await authService.lookupPublicKey({ email: user.email })
      const ownerPublicKey = await importPublicKey(publicKeyB64)
      const wrappedKeyB64 = await wrapFileKey(dek, ownerPublicKey)

      onProgress?.('uploading')
      const uploaded = await fileService.upload({
        ownerId: user.id,
        ciphertext,
        encryptedMetadataB64,
        wrappedKeyB64,
        sizeBytes,
      })
      onProgress?.('done')
      await refresh()
      return uploaded
    },
    [user, privateKey, refresh]
  )

  const downloadFile = useCallback(
    async (fileId) => {
      if (!user || !privateKey) throw new Error('Not authenticated.')
      const raw = await fileService.download({ userId: user.id, fileId })
      const dek = await unwrapFileKey(raw.wrappedKeyB64, privateKey)
      const { file, objectUrl } = await decryptToFile(raw.ciphertext, raw.encryptedMetadataB64, dek)
      return { file, objectUrl }
    },
    [user, privateKey]
  )

  const deleteFile = useCallback(
    async (fileId) => {
      if (!user) throw new Error('Not authenticated.')
      await fileService.remove({ userId: user.id, fileId })
      await refresh()
    },
    [user, refresh]
  )

  return { files, isLoading, error, refresh, uploadFile, downloadFile, deleteFile }
}
