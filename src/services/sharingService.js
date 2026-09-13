import { apiClient } from '../api/client'
import { ENDPOINTS } from '../api/endpoints'

export const sharingService = {
  async shareFile({ fileId, recipientEmail, wrappedKeyB64 }) {
    return (await apiClient.post(ENDPOINTS.sharing.shareFile, {
      fileId,
      recipientEmail,
      wrappedKeyForRecipient: wrappedKeyB64,
    })).data
  },
  async listShares({ fileId }) {
    const data = (await apiClient.get(ENDPOINTS.sharing.listShares(fileId))).data
    return data.shares.map((share) => ({
      userId: share.recipientId,
      email: share.recipientEmail,
      sharedAt: share.sharedAt,
    }))
  },
  async revokeShare({ fileId, recipientEmail }) {
    return (await apiClient.delete(ENDPOINTS.sharing.revokeShare, {
      data: { fileId, recipientEmail },
    })).data
  },
}
