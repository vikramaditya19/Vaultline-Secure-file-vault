import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services'
import { bufferToBase64, base64ToBuffer } from '../crypto/cryptoUtils'
import './SettingsPage.css'

async function fingerprintFromPublicKey(publicKeyB64) {
  const raw = base64ToBuffer(publicKeyB64)
  const digest = await crypto.subtle.digest('SHA-256', raw)
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex.match(/.{1,4}/g).slice(0, 8).join(' ')
}

export function SettingsPage() {
  const { user } = useAuth()
  const [fingerprint, setFingerprint] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { publicKeyB64 } = await authService.lookupPublicKey({ email: user.email })
        const fp = await fingerprintFromPublicKey(publicKeyB64)
        if (!cancelled) setFingerprint(fp)
      } catch {
        if (!cancelled) setFingerprint(null)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user.email])

  return (
    <div className="settings-page">
      <section className="settings-section">
        <h2 className="settings-section__title">Account</h2>
        <div className="settings-row">
          <span className="settings-row__label">Email</span>
          <span className="settings-row__value">{user.email}</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Key fingerprint</span>
          <span className="settings-row__value mono">{fingerprint ?? '—'}</span>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Encryption</h2>
        <p className="settings-note">
          Files are encrypted with AES-256-GCM using a fresh key per file. Your private key is protected by your
          password and never leaves this browser unencrypted.
        </p>
      </section>

      <section className="settings-section settings-section--placeholder">
        <h2 className="settings-section__title">Change password</h2>
        <p className="settings-note">
          Not implemented yet — changing your password needs to re-wrap your private key without touching any file
          keys. Wiring this up is backend-dependent and will land once the auth endpoints are final.
        </p>
      </section>
    </div>
  )
}
