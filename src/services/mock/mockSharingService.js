/**
 * mockSharingService.js
 *
 * Sharing, in this architecture, is just: "store one more wrapped copy
 * of the file's DEK, addressed to the recipient's public key." The mock
 * enforces that contract so the real backend's share endpoint has a
 * concrete shape to match: it never receives file bytes, never receives
 * a private key, only ever a wrapped-key blob it can't open.
 */
import { db, simulatedNetworkDelay } from './mockDb'

export const mockSharingService = {
  async shareFile({ ownerId, fileId, recipientUserId, wrappedKeyB64 }) {
    await simulatedNetworkDelay(300, 700)
    const file = db.filesById.get(fileId)
    if (!file || file.ownerId !== ownerId) {
      const err = new Error('Only the owner can share this file.')
      err.status = 403
      throw err
    }
    file.wrappedKeysByUserId.set(recipientUserId, wrappedKeyB64)
    return { success: true }
  },

  async listShares({ ownerId, fileId }) {
    await simulatedNetworkDelay(150, 350)
    const file = db.filesById.get(fileId)
    if (!file || file.ownerId !== ownerId) {
      const err = new Error('Only the owner can view shares for this file.')
      err.status = 403
      throw err
    }
    const recipients = []
    for (const [userId] of file.wrappedKeysByUserId) {
      if (userId === ownerId) continue
      const matchedUser = [...db.usersByEmail.values()].find((u) => u.id === userId)
      recipients.push({ userId, email: matchedUser?.email ?? 'unknown' })
    }
    return recipients
  },

  async revokeShare({ ownerId, fileId, recipientUserId }) {
    await simulatedNetworkDelay(200, 500)
    const file = db.filesById.get(fileId)
    if (!file || file.ownerId !== ownerId) {
      const err = new Error('Only the owner can revoke a share.')
      err.status = 403
      throw err
    }
    file.wrappedKeysByUserId.delete(recipientUserId)
    // NOTE: this revokes access to future downloads only. A recipient who
    // already fetched and cached the DEK could still decrypt a copy they
    // saved locally — true revocation needs DEK rotation + re-wrap for
    // remaining holders. Documented limitation, not a bug.
    return { success: true }
  },
}
