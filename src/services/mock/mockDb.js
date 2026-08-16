/**
 * mockDb.js
 *
 * In-memory fake backend, shared by mockAuthService/mockFileService/
 * mockSharingService so they behave consistently with each other
 * (e.g. sharing needs to look up a recipient's public key, which was
 * registered through mockAuthService).
 *
 * Explicitly isolated: nothing outside services/mock/* should ever
 * import this file directly. Resets on page refresh — that's fine,
 * it's a development stand-in, not persistence.
 */

export const db = {
  usersByEmail: new Map(), // email -> { id, email, salt(b64), authProofHash, publicKeyB64, wrappedPrivateKeyB64 }
  filesById: new Map(), // fileId -> { id, ownerId, ciphertext(Uint8Array), encryptedMetadataB64, wrappedKeysByUserId: Map, sizeBytes, createdAt }
}

export function simulatedNetworkDelay(min = 250, max = 700) {
  const ms = Math.random() * (max - min) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let idCounter = 1
export function nextId(prefix) {
  return `${prefix}_${idCounter++}`
}
