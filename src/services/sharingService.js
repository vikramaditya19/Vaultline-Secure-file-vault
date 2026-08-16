/**
 * sharingService.js
 *
 * Public interface for sharing operations. A "share" is transport of a
 * wrapped-DEK blob only — see mockSharingService.js for the contract.
 */
import { mockSharingService } from './mock/mockSharingService'

export const sharingService = {
  /** @param {{ownerId: string, fileId: string, recipientUserId: string, wrappedKeyB64: string}} payload */
  async shareFile(payload) {
    return mockSharingService.shareFile(payload)
  },

  async listShares({ ownerId, fileId }) {
    return mockSharingService.listShares({ ownerId, fileId })
  },

  async revokeShare({ ownerId, fileId, recipientUserId }) {
    return mockSharingService.revokeShare({ ownerId, fileId, recipientUserId })
  },
}
