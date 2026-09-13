# Vaultline Frontend — Build & Troubleshooting Log

## Session Overview

**Goal:** Build the client-side application for Vaultline — a React + Vite frontend that
encrypts files with the Web Crypto API before upload, and integrates with the team's backend
contract (auth, file storage, sharing) via a service abstraction layer.

**Status:** ✅ RESOLVED — Frontend builds clean, runs against a mock backend, and is structured
so the real backend (Node auth gateway + Python storage) can be swapped in without touching any
page or component.

---

## Issues Faced & Solutions

### 1. Password-derived keys would have broken sharing entirely

**Problem:**
- Initial instinct: derive the file encryption key directly from the user's password
  (`PBKDF2(password) → AES key → encrypt file`).
- This looks reasonable until you try to implement "share this file with another user" —
  at which point it becomes clear nobody else can ever decrypt it, since nobody else has that
  password.

**Root cause:**
- Confusing *authentication* (proving you know a password) with *encryption* (deriving a key
  that can decrypt a specific file). They need to be separate mechanisms, not the same derived
  value doing double duty.

> [!TIP]
> **Solution:** Switched to **envelope encryption** — every file gets its own random
> AES-256-GCM key (a DEK). The DEK is wrapped (encrypted) with the *owner's* RSA-OAEP public
> key. Sharing = wrapping a copy of the same DEK with the *recipient's* public key. No file
> content is ever touched again. See `src/crypto/fileCrypto.js` —
> `generateFileKey()`, `wrapFileKey()`, `unwrapFileKey()`.

---

### 2. Sending the password to the backend would let it decrypt files

**Problem:**
- Even with envelope encryption for files, the *account* password still needed to reach the
  backend somehow for login — and any value derived from the password that the backend could
  use for two purposes (auth AND unwrapping the private key) would mean the backend could
  technically decrypt user data if it wanted to.

**Root cause:**
- A single derived key serving both "prove you're you" and "decrypt your private key" is a
  privilege-separation failure — whoever holds that value can do both things, including things
  they shouldn't be trusted with.

> [!TIP]
> **Solution:** One PBKDF2 derivation (600,000 iterations) from the password, then split via
> **HKDF** into two independent values — `authProof` (sent to the backend, bcrypt'd there,
> used only to verify login) and `wrapKey` (never leaves the browser, used only to
> encrypt/decrypt the local private key). See `src/crypto/passwordAuth.js`.

---

### 3. Vite build warning: mixed static and dynamic imports

**Problem:**

```text
(!) /src/hooks/useFiles.js is dynamically imported by useFiles.js but also
statically imported, dynamic import will not move module into another chunk.
```

- Same warning for `decryptToFile` in `FileDetailsPage.jsx` and `authService` in
  `useFiles.js`.

**Root cause:**
- During earlier iteration, a couple of imports were written as `await import('../services')`
  inside functions (to "lazy load"), while the same module was already imported statically
  elsewhere in the file. Vite can't chunk-split something that's imported both ways, so it just
  warns and inlines it anyway — the dynamic import was providing zero benefit.

**Solution:**
- Converted all of them to plain static `import { ... } from '...'` at the top of the file.

```bash
npm run build
# ✓ 156 modules transformed, 0 warnings
```

---

### 4. Session state disappearing on page refresh (by design, not a bug)

**Problem:**
- After logging in, refreshing the browser logs the user straight back out.

> [!WARNING]
> This is **intentional**, not a defect — `AuthContext` keeps the unwrapped RSA private key
> only in React state (in memory). Persisting an *unwrapped* private key anywhere durable
> (localStorage, sessionStorage, cookies) would mean plaintext-equivalent key material sitting
> on disk, defeating the point of wrapping it in the first place. Same tradeoff real E2EE apps
> (e.g. Proton Mail) make. **Do not "fix" this by persisting the private key.**

---

### 5. Workspace reset mid-project — rebuilt from the last delivered artifact

**Problem:**
- Partway through a later session, the entire project directory was gone — clean filesystem,
  no trace of `secure-file-vault-frontend/`.

**Root cause:**
- The build environment's working directory resets between sessions/long gaps. Nothing wrong
  with the code — the workspace itself just doesn't persist indefinitely.

**Solution:**
- Re-extracted the project from the last `.zip` that had actually been delivered/downloaded,
  confirmed it matched (same file list, same structure), reinstalled dependencies, and reran
  `npm run build` before making any further changes.

> [!NOTE]
> **Takeaway for the team:** commit early and often to the actual GitHub repo (like this
> journal is doing) rather than relying on any single environment to hold the only copy.

---

## Stack Versions Used

| Package | Version |
|---|---|
| React | 18.3.1 |
| Vite | 5.4.21 |
| react-router-dom | 6.28.0 |
| axios | 1.7.9 |
| Node target | ES2020+, Web Crypto API (native, no polyfill) |

## Next Steps

- [ ] Swap `src/api/endpoints.js` placeholders for real routes once Ishjaap's Auth gateway and
      Sukhansh's Storage service are reachable.
- [ ] Replace the three `services/*.js` mock delegations with real `apiClient` calls — no page
      or component should need to change (see README "Swapping in the real backend").
- [ ] Add chunked file encryption before testing with large files.
