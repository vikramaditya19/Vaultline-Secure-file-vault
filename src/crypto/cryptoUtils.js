/**
 * cryptoUtils.js
 *
 * Low-level helpers shared by every crypto module. Nothing in this file
 * decides *how* encryption happens — it only provides safe primitives
 * (randomness, encoding) so the rest of the crypto layer never has to
 * touch Math.random() or hand-roll base64.
 */

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** AES-GCM recommended IV length, in bytes. Never reuse an IV with the same key. */
export const IV_LENGTH_BYTES = 12

/** Salt length for PBKDF2. */
export const SALT_LENGTH_BYTES = 16

/**
 * Cryptographically secure random bytes. This is the ONLY place in the app
 * that should call crypto.getRandomValues — everything else (IVs, salts,
 * key material) routes through here so there is one audit point.
 */
export function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length))
}

export function generateIv() {
  return randomBytes(IV_LENGTH_BYTES)
}

export function generateSalt() {
  return randomBytes(SALT_LENGTH_BYTES)
}

export function stringToBytes(str) {
  return textEncoder.encode(str)
}

export function bytesToString(bytes) {
  return textDecoder.decode(bytes)
}

/** ArrayBuffer/TypedArray -> base64 string, safe for JSON transport. */
export function bufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

/** base64 string -> Uint8Array */
export function base64ToBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Concatenate an IV (or salt) with ciphertext into one payload for storage,
 * and split it back apart on the way out. Keeping IV+ciphertext together
 * is standard practice — the IV isn't secret, it just must never repeat.
 */
export function packIvAndData(iv, data) {
  const dataBytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const packed = new Uint8Array(iv.length + dataBytes.length)
  packed.set(iv, 0)
  packed.set(dataBytes, iv.length)
  return packed
}

export function unpackIvAndData(packed, ivLength = IV_LENGTH_BYTES) {
  const bytes = packed instanceof Uint8Array ? packed : new Uint8Array(packed)
  return {
    iv: bytes.slice(0, ivLength),
    data: bytes.slice(ivLength),
  }
}
