import { afterEach, describe, expect, it } from 'vitest'
import { apiClient } from '../api/client'
import { fileService } from './fileService'

describe('fileService upload boundary', () => {
  const originalAdapter = apiClient.defaults.adapter

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it('preserves encrypted uploads as multipart FormData', async () => {
    let dispatchedConfig
    apiClient.defaults.adapter = async (config) => {
      dispatchedConfig = config
      return {
        data: { id: 'file-1', sizeBytes: 3, createdAt: '2026-09-14T00:00:00Z' },
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      }
    }

    await fileService.upload({
      ciphertext: new Uint8Array([1, 2, 3]),
      encryptedMetadataB64: 'ZW5jcnlwdGVkLW1ldGFkYXRh',
      wrappedKeyB64: 'd3JhcHBlZC1rZXk=',
      sizeBytes: 3,
    })

    expect(dispatchedConfig.data).toBeInstanceOf(FormData)
    expect(dispatchedConfig.data.get('encryptedMetadata')).toBe('ZW5jcnlwdGVkLW1ldGFkYXRh')
    expect(dispatchedConfig.data.get('wrappedKey')).toBe('d3JhcHBlZC1rZXk=')
    expect(dispatchedConfig.data.get('sizeBytes')).toBe('3')
    expect(dispatchedConfig.data.get('ciphertext')).toBeInstanceOf(Blob)
    expect(dispatchedConfig.headers.getContentType()).not.toContain('application/json')
  })
})
