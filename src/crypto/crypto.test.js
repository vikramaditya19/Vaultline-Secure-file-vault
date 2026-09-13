import { describe, expect, it } from 'vitest'
import { deriveAuthAndWrapKeys } from './passwordAuth'
import { generateSalt } from './cryptoUtils'
import { generateUserKeyPair, wrapPrivateKey, unwrapPrivateKey } from './keyManagement'

describe('Vaultline key derivation', () => {
  it('reproduces the authentication proof with the same password and salt', async () => {
    const salt = generateSalt()
    const first = await deriveAuthAndWrapKeys('A classroom-beating password 42', salt)
    const second = await deriveAuthAndWrapKeys('A classroom-beating password 42', salt)
    expect(second.authProofB64).toBe(first.authProofB64)
  })

  it('can wrap and recover a private key', async () => {
    const { wrapKey } = await deriveAuthAndWrapKeys('Another excellent password 7', generateSalt())
    const pair = await generateUserKeyPair()
    const wrapped = await wrapPrivateKey(pair.privateKey, wrapKey)
    const recovered = await unwrapPrivateKey(wrapped, wrapKey)
    expect(recovered.type).toBe('private')
    expect(recovered.algorithm.name).toBe('RSA-OAEP')
  })
})
