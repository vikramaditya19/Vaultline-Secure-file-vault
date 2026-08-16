/**
 * fileService.js
 *
 * Public interface for storage operations. Delegates to the mock storage
 * service for now. Notice every payload here is ciphertext or non-secret
 * metadata — this file's signatures ARE the contract the real Python
 * storage service needs to satisfy.
 */
import { mockFileService } from './mock/mockFileService'
// import { apiClient } from '../api/client'
// import { ENDPOINTS } from '../api/endpoints'

export const fileService = {
  /** @param {{ownerId: string, ciphertext: Uint8Array, encryptedMetadataB64: string, wrappedKeyB64: string, sizeBytes: number}} payload */
  async upload(payload) {
    return mockFileService.upload(payload)
    // Real version would likely be multipart/form-data:
    // const form = new FormData()
    // form.append('ciphertext', new Blob([payload.ciphertext]))
    // form.append('encryptedMetadata', payload.encryptedMetadataB64)
    // form.append('wrappedKey', payload.wrappedKeyB64)
    // return (await apiClient.post(ENDPOINTS.files.upload, form)).data
  },

  async list({ userId }) {
    return mockFileService.list({ userId })
  },

  async getDetail({ userId, fileId }) {
    return mockFileService.getDetail({ userId, fileId })
  },

  async download({ userId, fileId }) {
    return mockFileService.download({ userId, fileId })
  },

  async remove({ userId, fileId }) {
    return mockFileService.remove({ userId, fileId })
  },
}
