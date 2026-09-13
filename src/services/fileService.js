import { apiClient } from '../api/client'
import { ENDPOINTS } from '../api/endpoints'

export const fileService = {
  async upload(payload) {
    const form = new FormData()
    form.append('ciphertext', new Blob([payload.ciphertext]), 'vaultline.enc')
    form.append('encryptedMetadata', payload.encryptedMetadataB64)
    form.append('wrappedKey', payload.wrappedKeyB64)
    form.append('sizeBytes', String(payload.sizeBytes))
    return (await apiClient.post(ENDPOINTS.files.upload, form, {
      // Clear Axios's method default so the browser generates the multipart
      // boundary instead of serializing FormData as JSON or urlencoded data.
      headers: { 'Content-Type': undefined },
    })).data
  },
  async list() {
    return (await apiClient.get(ENDPOINTS.files.list)).data.files
  },
  async getDetail({ fileId }) {
    return (await apiClient.get(ENDPOINTS.files.detail(fileId))).data
  },
  async download({ fileId }) {
    const response = await apiClient.get(ENDPOINTS.files.download(fileId), { responseType: 'arraybuffer' })
    return {
      ciphertext: new Uint8Array(response.data),
      encryptedMetadataB64: response.headers['x-encrypted-metadata'],
      wrappedKeyB64: response.headers['x-wrapped-key'],
    }
  },
  async remove({ fileId }) {
    return (await apiClient.delete(ENDPOINTS.files.delete(fileId))).data
  },
}
