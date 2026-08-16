import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '../services'
import { registerAuthTokenGetter } from '../api/client'
import {
  deriveAuthAndWrapKeys,
  generateUserKeyPair,
  exportPublicKey,
  wrapPrivateKey,
  unwrapPrivateKey,
  base64ToBuffer,
  bufferToBase64,
  generateSalt,
} from '../crypto'

export const AuthContext = createContext(null)

/**
 * Session shape kept in memory:
 *   user           -> { id, email }
 *   token          -> auth token attached to API requests
 *   privateKey     -> unwrapped CryptoKey, NEVER persisted to disk/localStorage
 *
 * Deliberate tradeoff: refreshing the page loses the unwrapped private key,
 * which means the session ends and the user re-enters their password. This
 * is the same tradeoff real E2EE apps make (e.g. Proton Mail's "lock" on
 * refresh) — persisting an unwrapped private key anywhere durable would
 * mean plaintext-equivalent key material sitting on disk.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [privateKey, setPrivateKey] = useState(null)
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    registerAuthTokenGetter(() => token)
  }, [token])

  const register = useCallback(async (email, password) => {
    setIsInitializing(true)
    try {
      // Salt for a brand-new account is generated client-side and sent
      // alongside registration so login can later request it back.
      const salt = generateSalt()
      const { authProofB64, wrapKey } = await deriveAuthAndWrapKeys(password, salt)

      const keyPair = await generateUserKeyPair()
      const publicKeyB64 = await exportPublicKey(keyPair.publicKey)
      const wrappedPrivateKeyB64 = await wrapPrivateKey(keyPair.privateKey, wrapKey)

      const result = await authService.register({
        email,
        authProofB64,
        publicKeyB64,
        wrappedPrivateKeyB64,
        saltB64: bufferToBase64(salt),
      })

      setUser(result.user)
      setToken(result.token)
      setPrivateKey(keyPair.privateKey)
      return result.user
    } finally {
      setIsInitializing(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    setIsInitializing(true)
    try {
      const { salt: saltB64 } = await authService.fetchSalt({ email })
      const salt = base64ToBuffer(saltB64)
      const { authProofB64, wrapKey } = await deriveAuthAndWrapKeys(password, salt)

      const result = await authService.login({ email, authProofB64 })
      const recoveredPrivateKey = await unwrapPrivateKey(result.wrappedPrivateKeyB64, wrapKey)

      setUser(result.user)
      setToken(result.token)
      setPrivateKey(recoveredPrivateKey)
      return result.user
    } finally {
      setIsInitializing(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setToken(null)
    setPrivateKey(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      privateKey,
      isAuthenticated: Boolean(user && token && privateKey),
      isInitializing,
      register,
      login,
      logout,
    }),
    [user, token, privateKey, isInitializing, register, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
