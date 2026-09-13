# Vaultline Full-Stack Integration & Cryptographic Systems — Build & Troubleshooting Log

**Contributor:** Ishjaap Singh  
**Roll / Registration Number:** 1024030327  
**Primary Focus:** Full-Stack Integration, Cryptographic Gateway & Auth Bug Diagnosis, Multipart Boundary Repair, Design Systems & Product Demo, Automated Release Gates

---

## Session Overview

**Goal:** Establish end-to-end integration between the React Web Crypto frontend (`localhost:5173`) and the FastAPI backend (`localhost:8000`), diagnose and resolve the critical salt regeneration defect that broke repeated logins, eliminate binary upload corruption caused by Axios header mutation, implement persistent database auth with Argon2id and signed JWT tokens, overhaul the product interface with an Apple-inspired editorial design system, engineer the 5-chapter interactive in-browser demonstration at `/demo`, and enforce release verification gates.

**Status:** ✅ RESOLVED — Full zero-knowledge product loop operational. Clean builds, 100% passing automated test suites (Vitest & Pytest), and presentation-ready interactive demo.

---

## Issues Faced & Solutions

### 1. The Critical Salt Regeneration Defect (Broken Repeat Logins)

**Problem:**
- Users could successfully register an account and immediately access their encrypted vault during the initial session.
- However, after logging out or opening a new browser tab, **subsequent login attempts always failed**, or if forced, the user could never decrypt their private key or access uploaded files.

**Root Cause Analysis:**
```text
[REGISTRATION]
Client Browser generates Salt A (16 random bytes)
Client derives: MDK = PBKDF2(Password, Salt A, 600,000 iter)
Client HKDF: -> authProof A  &  wrapKey A
Client transmits to backend: { email, authProofA, saltA, publicKey, wrappedPrivateKey(wrapKey A) }

THE DEFECT:
Backend registration handler discarded Salt A!
Instead, backend generated its own Salt B, saved Salt B in DB, and hashed authProof A.

[REPEAT LOGIN]
Client calls /api/auth/fetch-salt -> Backend returns Salt B!
Client derives: MDK' = PBKDF2(Password, Salt B, 600,000 iter)
Client HKDF: -> authProof B (≠ authProof A) & wrapKey B (≠ wrapKey A)
RESULT:
1. authProof B fails Argon2id verification -> 401 Unauthorized!
2. Even if bypassed, wrapKey B fails AES-GCM decryption of the RSA private key!
```

> [!TIP]
> **Solution:**
> 1. Updated `backend-integration/app/schemas/auth.py` (`UserCreate` schema) to require `saltB64`.
> 2. Updated `backend-integration/app/routers/auth.py` (`/register`) to store the exact `saltB64` sent by the client.
> 3. Standardized email normalization (`email.strip().lower()`) across registration, login, and salt lookup.
> 4. Verified with automated regression test: `backend-integration/tests/test_api.py::test_registration_salt_survives_and_login_returns_real_jwt`.

---

### 2. Axios FormData Multipart Boundary Corruption (Upload JSON Mutation)

**Problem:**
- During file uploads, the browser console threw `422 Unprocessable Entity` or backend received an empty payload `{ ciphertext: {} }` instead of the expected binary stream.
- The unit crypto tests passed and backend test client passed, but live browser uploads failed silently.

**Root Cause Analysis:**
- The shared Axios client in `src/api/client.js` had a global default header: `headers: { 'Content-Type': 'application/json' }`.
- When `fileService.js` constructed a native browser `FormData` object containing the binary ciphertext blob, Axios applied its global `application/json` header.
- This prevented the browser from setting the required HTTP multipart boundary delimiter (e.g. `multipart/form-data; boundary=----WebKitFormBoundary...`), causing the browser to attempt JSON stringification on the binary `FormData` stream!

> [!TIP]
> **Solution:**
> 1. In `src/services/fileService.js`, explicitly removed the `Content-Type` header from the upload request options (`headers: { 'Content-Type': undefined }`), enabling Axios and the browser to automatically compute and append the correct multipart boundary.
> 2. Created an automated regression test in `src/services/fileService.test.js` verifying that `uploadFile` preserves the `FormData` boundary and passes the binary payload intact.

---

### 3. In-Memory Auth Decoupling & Relational Database Transition

**Problem:**
- The team was temporarily relying on an in-memory dictionary for authentication, which lost all user accounts and key material every time the server reloaded.
- Furthermore, the system strictly demanded local PostgreSQL with hardcoded credentials, making developer onboarding and grading evaluation brittle.

**Root Cause:**
- Lack of database persistence for auth proofs and public keys, combined with rigid database URI configurations that lacked zero-config local fallbacks.

> [!TIP]
> **Solution:**
> 1. Replaced the in-memory auth dictionary with persistent SQLAlchemy ORM models (`User`, `File`, `Share`) in `backend-integration/app/models.py`.
> 2. Configured dynamic database fallback: default to zero-config SQLite (`vaultline.db`) for instant evaluation while preserving full PostgreSQL support via the `DATABASE_URL` environment variable.
> 3. Implemented secure HMAC-SHA256 signed JWT token issuance and verification dependencies (`get_current_user`), fully replacing fake static bearer tokens.

---

### 4. Wire Protocol & API Endpoint Standardization

**Problem:**
- Frontend service adapters were calling disparate URL endpoints (`/auth/register`, `/files/upload`), while the FastAPI backend mounted routers under `/api/*` prefixes, generating `404 Not Found` network errors.
- CORS policy blocked cross-origin requests between Vite (`localhost:5173`) and FastAPI (`localhost:8000`).

**Root Cause:**
- Inconsistent route declarations across `endpoints.js`, `vite.config.js`, and FastAPI router mounts.

> [!TIP]
> **Solution:**
> 1. Normalized all route definitions in `src/api/endpoints.js` to strictly adhere to the `/api` prefix:
>    - `/api/auth/register`, `/api/auth/fetch-salt`, `/api/auth/login`, `/api/auth/me`, `/api/auth/lookup-public-key`
>    - `/api/files/upload`, `/api/files`, `/api/files/{id}/download`, `/api/files/{id}`
>    - `/api/sharing/share`, `/api/sharing/file/{id}`, `/api/sharing/revoke`, `/api/sharing/shared-with-me`
> 2. Configured Vite reverse proxy in `vite.config.js` to proxy `/api` traffic cleanly to `http://127.0.0.1:8000`.
> 3. Configured FastAPI `CORSMiddleware` in `backend-integration/app/main.py` with explicit allow-origin policies.

---

### 5. Ephemeral Key Memory Model vs. Zero-Knowledge Guarantees

**Problem:**
- Initial frontend drafts considered caching the unwrapped RSA private key in browser `localStorage` to keep the user logged in across page refreshes.

**Root Cause:**
- Storing an unwrapped RSA private key in `localStorage` or `sessionStorage` violates zero-knowledge security invariants: any cross-site scripting (XSS) vulnerability or device access immediately compromises all user files.

> [!TIP]
> **Solution:**
> - Enforced strict ephemeral key residence: the unwrapped RSA private key exists solely in volatile JavaScript heap memory within React `AuthContext`.
> - Refreshing the browser or terminating the tab intentionally purges the private key from memory, requiring the user to re-authenticate with their master password to decrypt the vault.

---

### 6. Product Demo Experience: 5-Chapter In-Browser Walkthrough (`/demo`)

**Problem:**
- Evaluators and academic reviewers often have tight time constraints and may not want to set up Python virtual environments or register test accounts just to assess the cryptographic architecture.

**Root Cause:**
- Lack of a frictionless, self-contained walkthrough demonstrating the core cryptographic concepts in real time.

> [!TIP]
> **Solution:**
> - Built an interactive 5-chapter product walkthrough at `/demo` (`src/pages/ProductDemoPage.jsx`):
>   1. **Overview:** Interactive tour of an unlocked zero-knowledge vault workspace.
>   2. **Encrypt:** Live in-browser visual simulation of AES-256-GCM file encryption, distinct metadata IV generation, and RSA key wrapping.
>   3. **Share:** Multi-user recipient selection, public key lookup, and DEK re-wrapping demonstration.
>   4. **Open:** In-memory private key unwrapping and AES-GCM 128-bit authentication tag integrity check.
>   5. **Proof:** Review of core mathematical security guarantees and threat models.
> - Linked primary landing page CTA directly to the demo walkthrough.

---

### 7. Production Hardening & Release Verification Pipeline

**Problem:**
- Potential for configuration oversights (e.g. running production deployments with default development JWT secret keys).
- Need for continuous validation that no regressions occur across linting, unit tests, building, and backend integration.

> [!TIP]
> **Solution:**
> 1. Added startup environment assertion in `backend-integration/app/config.py` that halts backend initialization if `ENVIRONMENT=production` and `SECRET_KEY` is the default string or shorter than 32 characters.
> 2. Built complete automated testing pipeline:
>    - `npm run verify` (`eslint src && vitest run && vite build`)
>    - Pytest integration suite (`test_api.py`) covering repeat login, salt persistence, sharing, revocation, and negative authorization controls.

---

## Stack & Environment Versions

- **Frontend:** React 18.3.1, Vite 8.2.2, Vitest 5.0.0, ESLint 9.39.2, Axios 1.7.9
- **Cryptography:** Native Web Crypto API (`window.crypto.subtle`), AES-256-GCM, RSA-OAEP 3072-bit (SHA-256), PBKDF2-SHA-256 (600k iter), HKDF (RFC 5869), Argon2id (`argon2-cffi`)
- **Backend:** Python 3.12 / 3.14, FastAPI 0.115.6, Uvicorn 0.34.0, SQLAlchemy 2.0.36, Pydantic 2.10.4, python-jose 3.3.0
- **Storage & Database:** SQLite 3 (zero-config default), PostgreSQL (via psycopg 3.2.3)

---

## Verification Checklist & Results

- [x] `npm run lint` — 0 errors, 0 warnings
- [x] `vitest run` — 3/3 passing across 2 test files (crypto derivation, key wrapping, multipart boundary)
- [x] `vite build` — Clean production bundle generated in `dist/` (0 warnings)
- [x] `pytest tests` — 4/4 passing (salt persistence, repeat login, JWT validation, file sharing & revocation)
- [x] `pip check` — 0 dependency conflicts
- [x] `npm audit` — 0 vulnerabilities reported
- [x] Ephemeral session verification: unwrapped private key never touches disk storage
