/**
 * mockAuthService.js
 *
 * Stands in for the real Node auth gateway. Simulates the important
 * CONTRACT the real backend must honor:
 *   - it only ever receives authProof (never the raw password),
 *   - it stores the public key in plaintext and the wrapped private key
 *     as an opaque ciphertext it cannot open,
 *   - it hands back a fake "JWT" (just a random token string here —
 *     real JWT/JWKS verification is explicitly out of scope for this
 *     mock and will be implemented by the backend team).
 *
 * Swap point: services/authService.js currently delegates every call
 * to this file. Replace those delegate calls with real apiClient
 * requests once endpoints.js is filled in.
 */
import { db, simulatedNetworkDelay, nextId } from './mockDb'
import { bufferToBase64, generateSalt } from '../../crypto'

function fakeToken(userId) {
  return `mock.${userId}.${bufferToBase64(crypto.getRandomValues(new Uint8Array(16)))}`
}

export const mockAuthService = {
  async register({ email, authProofB64, publicKeyB64, wrappedPrivateKeyB64 }) {
    await simulatedNetworkDelay()
    if (db.usersByEmail.has(email)) {
      const err = new Error('An account with this email already exists.')
      err.status = 409
      throw err
    }
    const id = nextId('user')
    const salt = bufferToBase64(generateSalt())
    const user = { id, email, salt, authProofB64, publicKeyB64, wrappedPrivateKeyB64 }
    db.usersByEmail.set(email, user)
    return {
      user: { id, email },
      token: fakeToken(id),
      wrappedPrivateKeyB64,
      salt,
    }
  },

  /** Step 1 of login: fetch the salt for a given email so the client can derive keys. */
  async fetchSalt({ email }) {
    await simulatedNetworkDelay(100, 250)
    const user = db.usersByEmail.get(email)
    if (!user) {
      const err = new Error('No account found for this email.')
      err.status = 404
      throw err
    }
    return { salt: user.salt }
  },

  /** Step 2 of login: verify the authProof derived from the password. */
  async login({ email, authProofB64 }) {
    await simulatedNetworkDelay()
    const user = db.usersByEmail.get(email)
    if (!user || user.authProofB64 !== authProofB64) {
      const err = new Error('Incorrect email or password.')
      err.status = 401
      throw err
    }
    return {
      user: { id: user.id, email: user.email },
      token: fakeToken(user.id),
      wrappedPrivateKeyB64: user.wrappedPrivateKeyB64,
      salt: user.salt,
    }
  },

  async logout() {
    await simulatedNetworkDelay(50, 150)
    return { success: true }
  },

  async lookupPublicKey({ email }) {
    await simulatedNetworkDelay(100, 250)
    const user = db.usersByEmail.get(email)
    if (!user) {
      const err = new Error('No user found with that email.')
      err.status = 404
      throw err
    }
    return { userId: user.id, email: user.email, publicKeyB64: user.publicKeyB64 }
  },
}
