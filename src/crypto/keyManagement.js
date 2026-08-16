/**
 * keyManagement.js
 *
 * Envelope-encryption key handling for one user:
 *
 *   - Each user has an RSA-OAEP keypair, generated in the browser.
 *   - The public key is stored server-side in plaintext (it's public).
 *   - The private key is wrapped (encrypted) with the user's wrapKey
 *     (see passwordAuth.js) before it's ever sent to the backend.
 *   - The unwrapped private key lives only in memory for the session
 *     (see AuthContext) — it is never written to localStorage.
 *
 * This keypair is what makes sharing possible without the server ever
 * seeing a usable decryption key: file keys (DEKs) get wrapped with a
 * recipient's public key, not with anything derived from a password.
 */

import { generateIv, packIvAndData, unpackIvAndData, bufferToBase64, base64ToBuffer } from './cryptoUtils'

const RSA_OAEP_PARAMS = {
  name: 'RSA-OAEP',
  modulusLength: 3072,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

/** Generates a fresh RSA-OAEP keypair for a new user. */
export async function generateUserKeyPair() {
  return crypto.subtle.generateKey(RSA_OAEP_PARAMS, true, ['wrapKey', 'unwrapKey'])
}

/** Exports the public key as base64 SPKI, safe to store/send in plaintext. */
export async function exportPublicKey(publicKey) {
  const spki = await crypto.subtle.exportKey('spki', publicKey)
  return bufferToBase64(spki)
}

export async function importPublicKey(publicKeyB64) {
  const spki = base64ToBuffer(publicKeyB64)
  return crypto.subtle.importKey('spki', spki, RSA_OAEP_PARAMS, true, ['wrapKey'])
}

/**
 * Wraps (encrypts) the user's private key with their AES-GCM wrapKey,
 * derived from their password. Returns a base64 payload safe to store
 * on the backend — the backend can never unwrap it without the password.
 */
export async function wrapPrivateKey(privateKey, wrapKey) {
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey)
  const iv = generateIv()
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrapKey, pkcs8)
  return bufferToBase64(packIvAndData(iv, encrypted))
}

/** Reverses wrapPrivateKey — requires the same wrapKey, derived from the correct password. */
export async function unwrapPrivateKey(wrappedPrivateKeyB64, wrapKey) {
  const packed = base64ToBuffer(wrappedPrivateKeyB64)
  const { iv, data } = unpackIvAndData(packed)
  const pkcs8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrapKey, data)
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    RSA_OAEP_PARAMS,
    true,
    ['unwrapKey']
  )
}
