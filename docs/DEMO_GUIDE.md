# Vaultline Presentation & Demonstration Guide

```text
  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗██╗     ██╗███╗   ███╗███████╗
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
| **Track A: In-Website Guided Demo & Testbench** | `/demo` | ~3–4 Minutes | Zero setup (Frontend only) | Rapid conceptual review, real Web Crypto execution, live tamper sandbox, F1 telemetry walkthrough |
| **Track B: Full End-to-End Live Workflow** | Live Auth App | ~7 Minutes | Frontend (`:5173`) + Backend (`:8000`) | Comprehensive technical evaluation, persistence, multi-user sharing & revocation |

---

## 2. Track A: In-Website Guided Demo & Testbench (3–4 Minute Script)

Direct URL: `http://localhost:5173/demo` (or click **"Start Guided Demo"** on the landing page).

Persona: **Max Verstappen** (`max.verstappen@redbullracing.com` · Oracle Red Bull Racing)  
Dataset: **RB20 Powertrain & Telemetry Envelopes** (with custom file upload support).

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               INTERACTIVE 6-CHAPTER CRYPTOGRAPHIC TESTBENCH                            │
│                                                                                                        │
│  [0. HKDF SPLIT] ──► [1. WEBCRYPTO] ──► [2. STORAGE] ──► [3. ZERO-COPY] ──► [4. TAMPER] ──► [5. AUDIT] │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Chapter 0: Master Key Derivation & Domain Separation
- **Action:** Adjust the PBKDF2 iteration slider (default 600,000) and change the raw password. Observe the live key derivation hierarchy tree.
- **Talking Point:** *"Vaultline enforces dual-branch domain separation via RFC 5869 HKDF. Notice Branch A outputs `authProof` (sent to the server to be hashed with Argon2id), while Branch B produces `wrapKey` in volatile memory. Because HKDF is one-way, even an adversary with full database access cannot deduce `wrapKey`."*

### Chapter 1: Real-Time Web Crypto Encryption Pipeline
- **Action:** Select a preset telemetry document (e.g., `telemetry_rb20_f92c10.json`) or click **"Drop any document or click to browse"** to upload any custom local file. Click **"Execute Real Web Crypto Encryption"**.
- **Talking Point:** *"This is not a mock simulation. The browser executes W3C `window.crypto.subtle` directly in RAM. It generates a fresh 256-bit AES-GCM DEK, encrypts payload bytes with a 96-bit Content IV, encrypts metadata with a distinct 96-bit Meta IV, and wraps the DEK under Max's RSA-3072 public key. Inspect the Wire Inspector tabs to see the raw key envelope, ciphertext hex bytes, and encrypted metadata."*

### Chapter 2: End-to-End Telemetry Journey
- **Action:** Review the 5-stage architecture pipeline card.
- **Talking Point:** *"Here is the complete zero-knowledge lifecycle: Step 1 occurs in browser memory where the DEK is generated. Step 2 dispatches ciphertext over TLS. In Step 3, FastAPI receives opaque buffers with zero visibility into plaintext. In Step 4, encrypted bytes are written to disk (`.enc`). In Step 5, the relational database only stores metadata and wrapped key envelopes."*

### Chapter 3: Zero-Copy Multi-Party Envelope Sharing
- **Action:** Select recipient **Adrian Newey** (`Chief Technical Officer`) or **Gianpiero Lambiase** (`Race Engineer`) and click **"Grant Access"**.
- **Talking Point:** *"Notice what happens during sharing: zero bytes of ciphertext are re-uploaded. Max's browser unwraps the file DEK using his private RSA key in memory and re-wraps it with Adrian Newey's RSA-3072 public key. The server acts purely as a blind relay storing the new envelope."*

### Chapter 4: Local Decryption & Live AEAD Tamper Sandbox
- **Action:** First click **"Decrypt Telemetry in Memory"** to demonstrate verified decryption. Next, toggle the **"Inject Single-Byte Ciphertext Corruption"** switch and click **"Attempt Decryption Under Attack"**.
- **Talking Point:** *"Notice the result: W3C SubtleCrypto throws an `OperationError: Tag mismatch / authentication failed`. Because AES-256-GCM employs an authenticated tag, tampering with even a single bit causes immediate failure, eliminating chosen-ciphertext and padding oracle attacks."*

### Chapter 5: Security Guarantees & Verification Matrix
- **Action:** Toggle between the **"Security Guarantees"** and **"Threat & Attack Matrix"** tabs.
- **Talking Point:** *"This matrix summarizes our formal invariants: complete confidentiality against server compromise, zero plaintexts on disk, cryptographically enforced instant revocation, and zero-knowledge domain separation."*

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
2. Click **Revoke** next to Bob.
3. Switch back to Bob's window and refresh. Confirm `Annual_Report.pdf` is instantly gone and access is terminated.

---

## 4. Key Talking Points for Evaluators & Defense

1. **Why not just HTTPS/TLS?**  
   *TLS only protects data in transit between the client and server. Once it reaches the cloud server, it sits in plaintext in memory and storage unless end-to-end encrypted.*

2. **How is Vaultline different from typical client-side encryption?**  
   *Vaultline separates authentication from data decryption using dual-branch HKDF, and uses multi-party RSA-OAEP envelope encryption so files can be shared instantly without re-encrypting or re-uploading large payloads.*

3. **What happens if the server database is compromised?**  
   *The attacker only gets opaque ciphertext files (`.enc`), encrypted metadata blobs, and wrapped DEKs. They cannot decrypt anything without the client's raw master password or in-memory private key.*
