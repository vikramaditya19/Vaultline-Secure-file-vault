/**
 * passwordAuth.js
 *
 * Turns a password into two DIFFERENT, cryptographically unrelated values:
 *
 *   authProof  -> sent to the backend, which hashes it again (bcrypt) and
 *                 uses it purely to prove "this person knows the password".
 *   wrapKey    -> NEVER leaves the browser. Used only to encrypt
 *                 (wrap) the user's private key at rest.
 *
 * Why split them: if the backend only ever saw one derived key, whoever
 * controls the backend could use that same key to decrypt user files.
 * Deriving one master secret via PBKDF2, then splitting it into two
 * independent subkeys via HKDF, means the value that reaches the server
 * is cryptographically useless for decrypting anything.
 *
 * This mirrors the split used by Bitwarden and similar E2EE apps.
 */

import { stringToBytes, bufferToBase64 } from './cryptoUtils'

const PBKDF2_ITERATIONS = 600_000

/**
 * Derives the master key material for a password + salt. This raw
 * material is never used directly for encryption or sent anywhere —
 * it only ever feeds into deriveAuthAndWrapKeys() below.
 */
async function deriveMasterKeyMaterial(password, salt) {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToBytes(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  )
}

/** HKDF-expand the master key material into a purpose-specific subkey. */
async function deriveSubkeyBits(masterKeyMaterial, info) {
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    masterKeyMaterial,
    'HKDF',
    false,
    ['deriveBits']
  )

  return crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: stringToBytes(info),
    },
    hkdfKey,
    256
  )
}

/**
 * Main entry point. Given a password and the user's salt (fetched from
 * the backend, or freshly generated at registration), returns:
 *
 *   - authProofB64: base64 string, safe to send to authService
 *   - wrapKey: a non-extractable AES-GCM CryptoKey, used to
 *     wrap/unwrap the user's private key. Kept in memory only.
 */
export async function deriveAuthAndWrapKeys(password, salt) {
  const masterKeyMaterial = await deriveMasterKeyMaterial(password, salt)

  const authBits = await deriveSubkeyBits(masterKeyMaterial, 'vaultline-auth-v1')
  const wrapBits = await deriveSubkeyBits(masterKeyMaterial, 'vaultline-wrap-v1')

  const authProofB64 = bufferToBase64(authBits)

  const wrapKey = await crypto.subtle.importKey(
    'raw',
    wrapBits,
    { name: 'AES-GCM' },
    false, // non-extractable: this key material never leaves subtle crypto
    ['encrypt', 'decrypt']
  )

  return { authProofB64, wrapKey }
}

export const PASSWORD_KDF_ITERATIONS = PBKDF2_ITERATIONS
