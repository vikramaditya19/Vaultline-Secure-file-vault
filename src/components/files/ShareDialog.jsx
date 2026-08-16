import { useEffect, useState } from 'react'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { authService, fileService, sharingService } from '../../services'
import { unwrapFileKey, wrapFileKey } from '../../crypto/fileCrypto'
import { importPublicKey } from '../../crypto/keyManagement'
import { isValidEmail } from '../../utils/validators'
import './ShareDialog.css'

export function ShareDialog({ file, onShared }) {
  const { user, privateKey } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const [shares, setShares] = useState([])
  const [isLoadingShares, setIsLoadingShares] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadShares() {
      setIsLoadingShares(true)
      try {
        const list = await sharingService.listShares({ ownerId: user.id, fileId: file.id })
        if (!cancelled) setShares(list)
      } finally {
        if (!cancelled) setIsLoadingShares(false)
      }
    }
    loadShares()
    return () => {
      cancelled = true
    }
  }, [file.id, user.id])

  async function handleShare(e) {
    e.preventDefault()
    setError(null)

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (email.trim().toLowerCase() === user.email.toLowerCase()) {
      setError('You already own this file.')
      return
    }

    setIsSharing(true)
    try {
      // 1. Look up the recipient's public key (safe — public keys are not secret).
      const { userId: recipientUserId, publicKeyB64 } = await authService.lookupPublicKey({
        email: email.trim(),
      })
      const recipientPublicKey = await importPublicKey(publicKeyB64)

      // 2. Recover this file's DEK using the owner's own private key.
      const raw = await fileService.download({ userId: user.id, fileId: file.id })
      const dek = await unwrapFileKey(raw.wrappedKeyB64, privateKey)

      // 3. Re-wrap the SAME DEK for the recipient. No file bytes move.
      const wrappedKeyB64 = await wrapFileKey(dek, recipientPublicKey)

      await sharingService.shareFile({
        ownerId: user.id,
        fileId: file.id,
        recipientUserId,
        wrappedKeyB64,
      })

      setShares((current) => [...current, { userId: recipientUserId, email: email.trim() }])
      setEmail('')
      toast.success(`Shared with ${email.trim()}.`)
      onShared?.()
    } catch (err) {
      setError(err.message || 'Could not share this file.')
    } finally {
      setIsSharing(false)
    }
  }

  async function handleRevoke(recipient) {
    try {
      await sharingService.revokeShare({ ownerId: user.id, fileId: file.id, recipientUserId: recipient.userId })
      setShares((current) => current.filter((s) => s.userId !== recipient.userId))
      toast.info(`Revoked access for ${recipient.email}.`)
    } catch (err) {
      toast.error(err.message || 'Could not revoke access.')
    }
  }

  return (
    <div className="share-dialog">
      <form className="share-dialog__form" onSubmit={handleShare}>
        <Input
          label="Share with (email)"
          type="email"
          placeholder="teammate@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" isLoading={isSharing} size="sm">
          Share
        </Button>
      </form>

      <div className="share-dialog__list">
        <p className="share-dialog__list-label">People with access</p>
        {isLoadingShares && <p className="share-dialog__muted">Loading…</p>}
        {!isLoadingShares && shares.length === 0 && (
          <p className="share-dialog__muted">Only you can access this file.</p>
        )}
        {shares.map((recipient) => (
          <div key={recipient.userId} className="share-dialog__row">
            <span>{recipient.email}</span>
            <button type="button" className="share-dialog__revoke" onClick={() => handleRevoke(recipient)}>
              Revoke
            </button>
          </div>
        ))}
      </div>

      <p className="share-dialog__note">
        Revoking access prevents future downloads. If the recipient already downloaded and cached the file locally,
        this alone does not delete that copy.
      </p>
    </div>
  )
}
