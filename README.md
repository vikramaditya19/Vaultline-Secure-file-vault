# Vaultline — secure file vault (frontend)

React + Vite frontend for a client-side end-to-end encrypted file vault.
No backend is included here — see `src/services/mock/` for the stand-in
backend this UI currently talks to, and the "Swapping in the real
backend" section below for exactly what to change.

## Run it

```
npm install
npm run dev
```

Register an account, upload a file, open it, share it with a second
account (open a private/incognito window and register a second user to
test sharing end to end).

## The core guarantee

Plaintext file content and plaintext filenames exist in exactly one
place: this browser, in memory, for as long as it takes to encrypt or
decrypt. Everything that crosses `src/services/*` is either ciphertext
or a value that's cryptographically useless without the user's password
(the public key, a wrapped private key, a wrapped per-file key).

## Crypto architecture (`src/crypto/`)

**`passwordAuth.js`** — a password derives ONE PBKDF2 master secret
(600,000 iterations, SHA-256), which is then split via HKDF into two
unrelated subkeys:
- `authProof` — sent to the backend, hashed again server-side. Proves
  the user knows the password without revealing anything that could
  decrypt a file.
- `wrapKey` — never leaves the browser. Only used to encrypt the user's
  private key at rest.

**`keyManagement.js`** — each user has an RSA-OAEP keypair generated in
the browser at registration. The public key is plaintext and safe to
store server-side. The private key is wrapped with `wrapKey` before it's
ever sent anywhere.

**`fileCrypto.js`** — envelope encryption, one fresh AES-256-GCM key
(DEK) per file:
1. `generateFileKey()` — random DEK, per file.
2. `encryptFile()` — AES-256-GCM over the file bytes AND a small JSON
   metadata blob (filename, mime type) — filenames are encrypted too.
3. `wrapFileKey()` — wraps the DEK with a user's RSA public key.
4. **Sharing = wrapping the same DEK again**, with the recipient's
   public key. No file bytes move, no re-encryption of content happens.

Known, documented limitation: revoking a share stops future downloads
but can't force-delete a copy the recipient already cached locally —
true revocation needs DEK rotation, which isn't implemented yet.

Also documented, not solved: files are encrypted as a single
`ArrayBuffer`. Fine for this foundation; don't push very large files
through without adding chunked encryption first (unique nonce per
chunk).

## Folder structure

```
src/
  api/          axios client + placeholder endpoint map (no real URLs yet)
  components/
    common/      Button, Input, Modal, Toast, loading/empty/error states
    layout/      Sidebar, Navbar
    files/       FileCard, FileList, UploadDropzone, ShareDialog
  context/       AuthContext, ToastContext, ModalContext
  crypto/        all Web Crypto logic — see above
  hooks/         useAuth, useToast, useModal, useFiles
  layouts/       AuthLayout (login/register shell), AppLayout (sidebar+nav, route-guarded)
  pages/         one file per route
  services/      authService / fileService / sharingService (public API)
    mock/        isolated fake backend — swap point, see below
  styles/        design tokens (variables.css) + global reset
  utils/         formatters, validators
```

## Swapping in the real backend

Everything routes through three files with a stable public shape:
`src/services/authService.js`, `fileService.js`, `sharingService.js`.
Each method currently delegates to `services/mock/*`. To go live:

1. Fill in real paths in `src/api/endpoints.js`.
2. In each `services/*.js` file, replace the `mock*Service.x(...)` call
   with the commented-out `apiClient` call below it, adjusting the
   payload shape to match whatever the backend team ships.
3. Delete or ignore `services/mock/` — nothing else imports it directly.

No component, page, or hook talks to `services/mock/` or `axios`
directly, so this swap shouldn't require touching UI code.

## Explicitly out of scope here (per the project split)

No Node/Express server, no Postgres, no Python storage service, no real
JWT/JWKS verification — those are the other team members' work. The
`token` this app stores is whatever string `authService.login()`
returns; this frontend doesn't inspect or verify it.
