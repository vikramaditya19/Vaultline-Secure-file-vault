/**
 * fileCrypto.js
 *
 * The core security boundary of the whole app. Every function here runs
 * client-side only. Nothing in this file ever sends plaintext anywhere —
 * callers are responsible for only uploading what these functions return
 * as ciphertext.
 *
 * Model: envelope encryption, one fresh Data Encryption Key (DEK) per file.
 *
 *   1. generateFileKey()        -> random AES-256-GCM DEK for one file
 *   2. encryptFile(file, dek)   -> ciphertext + encrypted metadata
 *   3. decryptFile(...)         -> plaintext bytes, back in the browser
 *   4. wrapFileKey(dek, pubKey) -> DEK wrapped for one recipient (owner or share)
 *   5. unwrapFileKey(...)       -> recover the DEK to decrypt
 *
 * Filenames and MIME types are encrypted too (as a small JSON metadata
 * blob) — otherwise "the server never sees plaintext" would be false for
 * anything except file bytes.
 *
 * Current limitation (documented, not hidden): files are encrypted as a
 * single ArrayBuffer. That's fine for the sizes this foundation targets,
 * but do not push multi-GB files through this without adding chunked
 * encryption (unique nonce per chunk) first — see project roadmap Week 7.
 */

import { generateIv, packIvAndData, unpackIvAndData, bufferToBase64, base64ToBuffer, stringToBytes, bytesToString } from './cryptoUtils'

const AES_KEY_PARAMS = { name: 'AES-GCM', length: 256 }

/** Generates a fresh, random per-file AES-256-GCM key. Extractable so it can be wrapped for sharing. */
export async function generateFileKey() {
  return crypto.subtle.generateKey(AES_KEY_PARAMS, true, ['encrypt', 'decrypt'])
}

/**
 * Encrypts a File object with the given DEK.
 * Returns everything needed to upload — all of it ciphertext or non-secret metadata.
 */
export async function encryptFile(file, dek) {
  const plaintextBytes = new Uint8Array(await file.arrayBuffer())

  const contentIv = generateIv()
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: contentIv },
    dek,
    plaintextBytes
  )

  const metadata = JSON.stringify({
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  })
  const metadataIv = generateIv()
  const encryptedMetadata = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: metadataIv },
    dek,
    stringToBytes(metadata)
  )

  return {
    // Ready to upload as an opaque binary blob:
    ciphertext: packIvAndData(contentIv, encryptedContent),
    // Ready to upload as an opaque string field:
    encryptedMetadataB64: bufferToBase64(packIvAndData(metadataIv, encryptedMetadata)),
    sizeBytes: file.size,
  }
}

/** Decrypts file content bytes back to plaintext. Throws if the DEK is wrong or data was tampered with (GCM auth tag fails). */
export async function decryptFileContent(ciphertext, dek) {
  const { iv, data } = unpackIvAndData(ciphertext)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, data)
  return plaintext
}

/** Decrypts the metadata blob (filename, mime type, size) back to a plain object. */
export async function decryptFileMetadata(encryptedMetadataB64, dek) {
  const packed = base64ToBuffer(encryptedMetadataB64)
  const { iv, data } = unpackIvAndData(packed)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, data)
  return JSON.parse(bytesToString(plaintext))
}

/**
 * Wraps a file's DEK with a recipient's RSA public key.
 * This is what "sharing" actually is: no file bytes move, no re-encryption
 * of the file happens — just a new wrapped copy of the same DEK.
 */
export async function wrapFileKey(dek, recipientPublicKey) {
  const wrapped = await crypto.subtle.wrapKey('raw', dek, recipientPublicKey, {
    name: 'RSA-OAEP',
  })
  return bufferToBase64(wrapped)
}

/** Unwraps a file's DEK using the current user's private key. */
export async function unwrapFileKey(wrappedKeyB64, privateKey) {
  const wrapped = base64ToBuffer(wrappedKeyB64)
  return crypto.subtle.unwrapKey(
    'raw',
    wrapped,
    privateKey,
    { name: 'RSA-OAEP' },
    AES_KEY_PARAMS,
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Convenience helper for the download flow: decrypts content + metadata
 * and returns a real File object plus a Blob URL ready for <a download>.
 */
export async function decryptToFile(ciphertext, encryptedMetadataB64, dek) {
  const [metadata, plaintext] = await Promise.all([
    decryptFileMetadata(encryptedMetadataB64, dek),
    decryptFileContent(ciphertext, dek),
  ])
  const file = new File([plaintext], metadata.filename, { type: metadata.mimeType })
  return { file, metadata, objectUrl: URL.createObjectURL(file) }
}
