# Vaultline Quality Gates & Verification Matrix

```text
  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗██╗     ██╗███╗   ██╗███████╗
  ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝██║     ██║████╗  ██║██╔════╝
  ██║   ██║███████║██║   ██║██║     ██║   ██║     ██║██╔██╗ ██║█████╗  
  ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ██║     ██║██║╚██╗██║██╔══╝  
   ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ███████╗██║██║ ╚████║███████╗
    ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
                     VERIFICATION & TEST RUNBOOK
```

---

## 1. Automated Verification Commands

Vaultline enforces a zero-warning, zero-defect release policy across frontend and backend environments.

### 1.1 Full Frontend Verification Pipeline
Executes ESLint static analysis, Vitest unit/boundary suites, and the Vite production compilation build:

```powershell
# From repository root
npm run verify
```

Expected output:
```text
> secure-file-vault-frontend@0.1.0 verify
> npm run lint && npm run test && npm run build

✓ ESLint passed (0 errors, 0 warnings)
✓ Vitest: 3 passed across 2 test files (crypto.test.js, fileService.test.js)
✓ Vite build: dist/ generated successfully
```

---

### 1.2 Backend Integration & Authorization Suite
Executes the Pytest suite covering database persistence, salt reproducibility, JWT verification, and negative authorization controls:

```powershell
# In backend-integration directory
cd backend-integration
$env:PYTHONDONTWRITEBYTECODE='1'
.\.venv\Scripts\python.exe -m pytest tests -q -p no:cacheprovider
```

Expected output:
```text
....                                                                     [100%]
4 passed in ~2.5s
```

---

### 1.3 Dependency Consistency & Vulnerability Audits

```powershell
# Check Python environment dependencies for missing or conflicting packages
cd backend-integration
.\.venv\Scripts\python.exe -m pip check

# Audit Node.js packages for known Common Vulnerabilities and Exposures (CVEs)
cd ..
npm audit
```

---

## 2. Automated Test Matrix & Invariant Coverage

| Test File | Test Case | Target Invariant / Boundary | Status |
|---|---|---|:---:|
| `src/crypto/crypto.test.js` | `reproduces auth proof with same password & salt` | Verifies PBKDF2 (600k iter) and HKDF produce deterministic `authProof` | `PASS` |
| `src/crypto/crypto.test.js` | `can wrap and recover a private key` | Verifies RSA private key AES-GCM wrapping and unwrapping with `wrapKey` | `PASS` |
| `src/services/fileService.test.js` | `preserves FormData boundary during upload` | Verifies Axios does not mutate binary `FormData` multipart payloads to JSON | `PASS` |
| `backend-integration/tests/test_api.py` | `test_registration_salt_survives_and_login_returns_real_jwt` | Verifies exact client salt persistence across logout and repeat logins | `PASS` |
| `backend-integration/tests/test_api.py` | `test_auth_me_and_wrong_proof_behavior` | Verifies `/auth/me` identity and rejects invalid authentication proofs with `401` | `PASS` |
| `backend-integration/tests/test_api.py` | `test_encrypted_file_lifecycle_and_sharing` | Verifies upload, encrypted download, key wrapping, sharing, and revocation | `PASS` |
| `backend-integration/tests/test_api.py` | `test_production_secret_guard` | Verifies backend crashes on startup if `SECRET_KEY` is short or default in prod | `PASS` |

---

## 3. Manual Release Audit Checklist

Before cutting a release or presenting to evaluators:

- [ ] **Desktop & Mobile Responsiveness:** Landing page, auth forms, and vault dashboard adapt smoothly across breakpoints (320px to 1920px).
- [ ] **Guided Demo Health:** `/demo` routes directly and executes all 5 chapters with clean state resets on refresh.
- [ ] **Incognito Isolation:** Testing multi-user sharing with two separate accounts in normal and incognito windows works without session bleed.
- [ ] **File Integrity Rejection:** Altering one byte of ciphertext causes the Web Crypto decryption operation to reject the payload safely.
- [ ] **Ephemeral Session Invariant:** Refreshing the dashboard clears the unwrapped private key and redirects to login.
- [ ] **Zero Credential Leaks:** Git commit logs and tracking trees contain zero API keys, secrets, or plaintext credentials.
