# Vaultline Presentation & Demonstration Guide

```text
  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗██╗     ██╗███╗   ██╗███████╗
  ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝██║     ██║████╗  ██║██╔════╝
  ██║   ██║███████║██║   ██║██║     ██║   ██║     ██║██╔██╗ ██║█████╗  
  ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ██║     ██║██║╚██╗██║██╔══╝  
   ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ███████╗██║██║ ╚████║███████╗
    ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
                     EVALUATOR & DEMONSTRATION RUNBOOK
```

---

## 1. Demonstration Strategy & Formats

Vaultline offers two distinct demonstration tracks suited for different evaluation time limits:

| Track | Target Route | Time Required | Setup Needed | Purpose |
|---|---|:---:|---|---|
| **Track A: In-Website Guided Demo** | `/demo` | ~3 Minutes | Zero setup (Frontend only) | Rapid conceptual review, cryptographic UI walkthrough |
| **Track B: Full End-to-End Live Workflow** | Live Auth App | ~7 Minutes | Frontend (`:5173`) + Backend (`:8000`) | Comprehensive technical evaluation, persistence, multi-user sharing & revocation |

---

## 2. Track A: In-Website Guided Tour (3-Minute Script)

Direct URL: `http://localhost:5173/demo` (or click **"Start guided demo"** on the landing page).

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          INTERACTIVE 5-CHAPTER WALKTHROUGH                             │
│                                                                                        │
│   [1. OVERVIEW]  ──►  [2. ENCRYPT]  ──►  [3. SHARE]  ──►  [4. OPEN]  ──►  [5. PROOF]  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Chapter 1: Unlocked Workspace Overview
- **Action:** Open `/demo`. Point out the active vault dashboard with sample encrypted files.
- **Talking Point:** *"Notice how filenames are displayed in the vault. They are readable here solely because browser-side Web Crypto decrypted the metadata in memory. To the server and database, this file is an opaque identifier with an encrypted metadata blob."*

### Chapter 2: Local Encryption Simulation
- **Action:** Click **"Run encryption demo"**. Watch the animated encryption progress bar.
- **Talking Point:** *"Every file generates a fresh random 256-bit AES Data Encryption Key (DEK). The content and metadata are encrypted with distinct 96-bit random IVs. The DEK is then wrapped using the user's RSA-OAEP public key."*

### Chapter 3: Cryptographic Sharing
- **Action:** Select recipient `maya@vaultline.internal` and click **"Complete share"**.
- **Talking Point:** *"Notice what happens during sharing: we do NOT re-encrypt the file or send Maya our password. The browser unwraps the file DEK with our in-memory private key and wraps it using Maya's public RSA key. The server stores only that recipient-wrapped key."*

### Chapter 4: In-Memory Decryption & Integrity
- **Action:** Click **"Open protected file"**.
- **Talking Point:** *"Decryption occurs directly in memory. AES-GCM verifies the 128-bit authentication tag. If even one byte of ciphertext was altered on the server, decryption aborts with an integrity error."*

### Chapter 5: Mathematical Security Proof
- **Action:** Review the four security guarantee cards on screen.
- **Talking Point:** *"These four pillars guarantee that even if our backend database is completely dumped by an attacker, not a single file, filename, or private key can be compromised."*

---

## 3. Track B: Full Live Technical Evaluation (7-Minute Script)

### Step 1: Start Services
1. **Backend:**
   ```powershell
   cd backend-integration
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
   ```
2. **Frontend:**
   ```powershell
   npm run dev
   ```
3. Open Swagger UI at `http://localhost:8000/docs` in an adjacent tab to demonstrate live API requests.

### Step 2: Owner Registration & Encryption
1. Open `http://localhost:5173/register`.
2. Register Owner: `alice@example.com` with password `Password123!@#`.
3. Open the browser DevTools Network tab. Show the `POST /api/auth/register` payload: point out that the password is **never** sent—only `authProofB64`, `saltB64`, `publicKeyB64`, and `wrappedPrivateKeyB64`.
4. Upload a test PDF or image (`Annual_Report.pdf`).
5. Observe the upload progress states: *Encrypting locally* -> *Uploading ciphertext* -> *Complete*.

### Step 3: Salt Persistence & Repeat Login Proof
1. Log out of Alice's account.
2. In the Network tab, clear logs and log back in as `alice@example.com`.
3. Highlight the two-step login:
   - Request 1: `POST /api/auth/fetch-salt` returns Alice's exact persisted salt.
   - Browser runs PBKDF2 (600k iterations) and reproduces `authProofB64` and `wrapKey`.
   - Request 2: `POST /api/auth/login` verifies the proof and returns the wrapped private key.
   - The vault successfully unlocks!

### Step 4: Multi-User Sharing & Recipient Decryption
1. Open an Incognito/Private browser window at `http://localhost:5173/register`.
2. Register Recipient: `bob@example.com` with password `Password123!@#`.
3. Switch back to Alice's window. Click **Share** on `Annual_Report.pdf`.
4. Enter `bob@example.com` and submit.
5. In Bob's incognito window, navigate to **Shared With Me**.
6. Show `Annual_Report.pdf` appearing with Alice as the owner.
7. Click **Download**. Observe the file downloading and opening with its exact original filename and content!

### Step 5: Revocation & Negative Access Enforcement
1. Switch back to Alice's window. Click **Manage Shares** on `Annual_Report.pdf`.
2. Click **Revoke** next to Bob's email.
3. Switch back to Bob's window and refresh. The file is gone from **Shared With Me**.
4. In Swagger UI or curl, attempt to call `GET /api/files/{id}/download` using Bob's JWT:
   - The server immediately returns `404 Not Found`. Access is completely blocked.

---

## 4. Evaluator Q&A Defense Sheet

### Q1: "Can the database administrator read user files?"
> **Answer:** *"No. The database holds solely opaque Base64 strings: AES-256-GCM encrypted content, encrypted metadata, and RSA-OAEP wrapped keys. The backend has no access to the master password, no access to the private keys, and no mechanism to unwrap file keys."*

### Q2: "Why do you store the salt if it's generated by the client?"
> **Answer:** *"The salt is needed during PBKDF2 derivation to generate the same master key bits. If the salt were lost, the user could never reproduce the wrapping key to decrypt their private key. Storing the salt in the database is completely standard (salts are non-secret random values used to prevent rainbow table attacks)."*

### Q3: "What happens if an attacker tampers with the ciphertext on disk?"
> **Answer:** *"AES-256-GCM is an Authenticated Encryption with Associated Data (AEAD) cipher. It appends a 128-bit authentication tag. If even a single bit of ciphertext or metadata is altered, the Web Crypto API's `decrypt()` method fails immediately with an `OperationError`."*

### Q4: "Why does refreshing the page log the user out?"
> **Answer:** *"This is an intentional zero-knowledge security invariant. Vaultline keeps the unwrapped RSA private key strictly in volatile React heap memory. Writing an unwrapped private key to `localStorage` or cookies would expose it to disk theft and XSS attacks."*
