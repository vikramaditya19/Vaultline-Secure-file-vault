/**
 * mockFileService.js
 *
 * Stands in for the real storage service (FastAPI + MinIO). The contract
 * this mock enforces: it only ever receives/returns ciphertext bytes and
 * an encrypted metadata blob. It never sees a filename or file content
 * in plaintext — same as the real service will.
 */
import { db, simulatedNetworkDelay, nextId } from './mockDb'

export const mockFileService = {
  async upload({ ownerId, ciphertext, encryptedMetadataB64, wrappedKeyB64, sizeBytes }) {
    await simulatedNetworkDelay(400, 1100)
    const id = nextId('file')
    const record = {
      id,
      ownerId,
      ciphertext, // Uint8Array — opaque bytes as far as this mock is concerned
      encryptedMetadataB64,
      sizeBytes,
      createdAt: new Date().toISOString(),
      wrappedKeysByUserId: new Map([[ownerId, wrappedKeyB64]]),
    }
    db.filesById.set(id, record)
    return { id, sizeBytes, createdAt: record.createdAt }
  },

  /** Lists files visible to a user — owned or shared with them. Metadata stays encrypted; caller decrypts client-side. */
  async list({ userId }) {
    await simulatedNetworkDelay()
    const results = []
    for (const file of db.filesById.values()) {
      if (file.wrappedKeysByUserId.has(userId)) {
        results.push({
          id: file.id,
          ownerId: file.ownerId,
          isOwner: file.ownerId === userId,
          encryptedMetadataB64: file.encryptedMetadataB64,
          wrappedKeyB64: file.wrappedKeysByUserId.get(userId),
          sizeBytes: file.sizeBytes,
          createdAt: file.createdAt,
        })
      }
    }
    return results
  },

  async getDetail({ userId, fileId }) {
    await simulatedNetworkDelay(150, 350)
    const file = db.filesById.get(fileId)
    if (!file || !file.wrappedKeysByUserId.has(userId)) {
      const err = new Error('File not found.')
      err.status = 404
      throw err
    }
    return {
      id: file.id,
      ownerId: file.ownerId,
      isOwner: file.ownerId === userId,
      encryptedMetadataB64: file.encryptedMetadataB64,
      wrappedKeyB64: file.wrappedKeysByUserId.get(userId),
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt,
      sharedWithCount: file.wrappedKeysByUserId.size - 1,
    }
  },

  async download({ userId, fileId }) {
    await simulatedNetworkDelay(400, 900)
    const file = db.filesById.get(fileId)
    if (!file || !file.wrappedKeysByUserId.has(userId)) {
      const err = new Error('File not found.')
      err.status = 404
      throw err
    }
    return {
      ciphertext: file.ciphertext,
      encryptedMetadataB64: file.encryptedMetadataB64,
      wrappedKeyB64: file.wrappedKeysByUserId.get(userId),
    }
  },

  async remove({ userId, fileId }) {
    await simulatedNetworkDelay(200, 500)
    const file = db.filesById.get(fileId)
    if (!file || file.ownerId !== userId) {
      const err = new Error('Only the owner can delete this file.')
      err.status = 403
      throw err
    }
    db.filesById.delete(fileId)
    return { success: true }
  },
}
