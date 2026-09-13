# Vaultline Security Model & Cryptographic Threat Analysis

```text
  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗██╗     ██╗███╗   ██╗███████╗
  ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝██║     ██║████╗  ██║██╔════╝
  ██║   ██║███████║██║   ██║██║     ██║   ██║     ██║██╔██╗ ██║█████╗  
  ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ██║     ██║██║╚██╗██║██╔══╝  
   ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ███████╗██║██║ ╚████║███████╗
    ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
                     SECURITY & THREAT SPECIFICATION
```

---

## 1. Scope & Security Objective

This document defines the security parameters, threat boundary, trust model, and cryptographic guarantees of **Vaultline**. 

### Primary Security Invariant
> **The server, database, network transport, and underlying storage systems are untrusted by design.** A total compromise of the database records and ciphertext storage must **not** compromise:
> 1. Plaintext file contents
> 2. File metadata (names, types, sizes)
> 3. Account master passwords
> 4. Unwrapped RSA private keys
> 5. Unwrapped Data Encryption Keys (DEKs)

---

## 2. Asset Classification & Protection State

| Asset Class | Active Form (During Operation) | Stored / At-Rest Form | Server Visibility |
|---|---|---|:---:|
| **Master Password** | Browser memory only (transient) | Never stored, never transmitted | ❌ Zero Knowledge |
| **RSA Private Key** | Browser memory (unwrapped) | PKCS#8 wrapped via AES-256-GCM (`wrapKey`) | ❌ Ciphertext Blob |
| **RSA Public Key** | Memory & Database | SPKI format (Base64) | ✅ Public Asset |
| **File DEK** | Browser memory during crypto op | RSA-OAEP wrapped per authorized recipient | ❌ Ciphertext Blob |
| **File Content** | Browser memory buffer | AES-256-GCM ciphertext + 128-bit tag | ❌ Ciphertext Blob |
| **File Metadata** | Browser memory JSON object | AES-256-GCM encrypted string (`encryptedMetadata`) | ❌ Ciphertext Blob |
| **Auth Proof** | Transmitted over TLS at login | Argon2id password hash | ❌ Irreversible Hash |
| **Session Credential** | Browser memory bearer token | Signed JWT (HS256) | ❌ Ephemeral Signature |

---

## 3. Trust Boundary & Zone Model

```text
┌────────────────────────────────────────────────────────┐
│               TRUSTED ZONE: CLIENT BROWSER             │
│                                                        │
│   • Raw User Password Input                            │
│   • Web Crypto API Subsystem                           │
│   • In-Memory JavaScript Heap (Unwrapped Keys)         │
│   • Local Decrypted File Buffers                       │
└───────────────────────────┬────────────────────────────┘
                            │ TLS 1.3 Transport Channel
┌───────────────────────────▼────────────────────────────┐
│              UNTRUSTED ZONE: SERVER & STORAGE          │
│                                                        │
│   • FastAPI Process Memory                             │
│   • SQLAlchemy Relational Database                     │
│   • Local Filesystem Ciphertext Directory              │
│   • Application Logs & Monitoring Systems              │
└────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Cryptographic Specifications

### 4.1 Master Password & Key Derivation Protocol
Vaultline implements cryptographic domain separation via **PBKDF2-SHA-256** followed by **HKDF** (RFC 5869):

```text
User Password + Random 16-Byte Salt
                 │
                 ▼
      PBKDF2-SHA-256 (600,000 Iterations)
                 │
                 ▼
       Master Derivation Key (Bits)
                 │
                 ├───────────────────────────────┐
                 ▼                               ▼
       HKDF Extract & Expand           HKDF Extract & Expand
     Info: "vaultline-auth-v1"       Info: "vaultline-wrap-v1"
          Length: 256 bits                Length: 256 bits
                 │                               │
                 ▼                               ▼
            authProof                       wrapKey
       (Sent to server for             (Used locally to wrap
        Argon2id hashing)               RSA private key)
```

- **Salt Generation:** 16 cryptographically random bytes via `window.crypto.getRandomValues()`.
- **Salt Persistence:** The exact registration salt is saved in the database. When the user logs in, the salt is fetched via `/api/auth/fetch-salt` to ensure deterministic derivation.
- **Argon2id Parameters:** The server verifies `authProof` using Argon2id with memory-hard parameters resistant to GPU/ASIC password dictionary cracking.

### 4.2 File Envelope Encryption Protocol
- **Data Encryption Key (DEK):** Generated afresh for each file via `crypto.subtle.generateKey('AES-GCM', true, ['encrypt', 'decrypt'], length: 256)`.
- **Content Encryption:** 
  $$\text{Ciphertext} = \text{AES-256-GCM}(\text{DEK}, \text{IV}_{\text{content}}, \text{FileBytes})$$
  A unique 96-bit random IV is prepended to the ciphertext.
- **Metadata Encryption:**
  $$\text{EncryptedMetadata} = \text{AES-256-GCM}(\text{DEK}, \text{IV}_{\text{metadata}}, \text{JSON}(\text{name, type, size}))$$
  A distinct 96-bit random IV is prepended to the metadata ciphertext.
- **Owner Key Wrapping:**
  $$\text{WrappedKey}_{\text{owner}} = \text{RSA-OAEP-3072}(\text{PublicKey}_{\text{owner}}, \text{DEK}, \text{SHA-256})$$

### 4.3 Multi-Party Cryptographic Sharing
When user $A$ (Alice) shares a file with user $B$ (Bob):
1. Alice requests Bob's public RSA key from the server: $\text{PublicKey}_B$.
2. Alice's browser unwraps the file DEK using Alice's in-memory private key:
   $$\text{DEK} = \text{RSA-OAEP-Decrypt}(\text{PrivateKey}_A, \text{WrappedKey}_A)$$
3. Alice's browser wraps the same DEK using Bob's public key:
   $$\text{WrappedKey}_B = \text{RSA-OAEP-Encrypt}(\text{PublicKey}_B, \text{DEK})$$
4. Alice submits $\text{WrappedKey}_B$ to the backend sharing endpoint.
5. **No plaintext data and no private keys are ever transmitted.** File content is never re-encrypted.

---

## 5. STRIDE Threat Analysis & Mitigation Matrix

| Threat Category | Specific Attack Vector | System Vulnerability | Mitigation & Invariant |
|---|---|---|---|
| **Spoofing** | Adversary attempts to log in as another user | Password guessing or credential stuffing | PBKDF2 (600k iter) + Argon2id hash. Wrong proof returns `401 Unauthorized`. |
| **Tampering** | Attacker modifies ciphertext on server disk or in transit | Silent data corruption or bit-flipping attacks | AES-256-GCM authenticated encryption tag (128-bit). Tampered payload throws `OperationError` during Web Crypto decryption. |
| **Repudiation** | User denies uploading or sharing an unauthorized file | Lack of non-repudiation audit trails | Database maintains immutable creation timestamps, owner foreign keys, and share grant logs. |
| **Information Disclosure** | Database administrator or cloud vendor dumps database tables | Plaintext file or metadata leakage | Zero-Knowledge invariant: tables store only Base64 ciphertext, encrypted metadata, and RSA wrapped keys. |
| **Denial of Service** | Malicious client uploads multi-gigabyte files to exhaust memory | Buffer overflow or disk saturation | Backend enforces `MAX_FILE_SIZE` (100 MB default) and returns `413 Request Entity Too Large`. |
| **Elevation of Privilege** | User $B$ attempts to delete or share User $A$'s file | Insecure direct object reference (IDOR) | Backend verifies ownership via JWT claims. Non-owners receive `403 Forbidden` or `404 Not Found`. |

---

## 6. Security Invariants (Engineering Rules)

All future modifications must preserve the following non-negotiable rules:

1. **Rule 1 (Zero Plaintext Transmissions):** Never transmit raw passwords, private keys, unwrapped DEKs, or plaintext file contents over any API route.
2. **Rule 2 (No Persistent Unwrapped Keys):** Never store unwrapped private RSA keys in persistent browser storage (`localStorage`, `sessionStorage`, cookies, IndexedDB).
3. **Rule 3 (Unique IV per Encryption):** Never reuse an IV under the same AES key. Every encryption operation must generate a fresh 96-bit random vector.
4. **Rule 4 (No Metadata Leakage):** Never send original filenames or MIME types as raw HTTP query parameters, form headers, or database columns.
5. **Rule 5 (Verified Identity Extraction):** Never trust user IDs provided in request parameters or request bodies. Identity must be extracted strictly from the validated JWT bearer signature.
6. **Rule 6 (Hardened Production Secrets):** The backend must immediately crash on startup if `ENVIRONMENT=production` and `SECRET_KEY` is the default test string or shorter than 32 characters.

---

## 7. Operational Production Hardening Checklist

Before deploying Vaultline to an internet-accessible public environment:

- [ ] **TLS Termination:** Enforce TLS 1.3 with strict HTTPS redirection and HSTS headers.
- [ ] **Production Secret:** Set `SECRET_KEY` via a secure cloud vault (e.g., AWS Secrets Manager, HashiCorp Vault).
- [ ] **CORS Lockdown:** Restrict `CORS_ORIGINS` to the exact deployed client origin.
- [ ] **Database Engine:** Transition from local SQLite to managed PostgreSQL with encrypted storage and automated point-in-time backups.
- [ ] **Object Storage:** Migrate local disk storage (`uploads/*.enc`) to encrypted object storage (e.g., AWS S3 with bucket encryption and private ACLs).
- [ ] **Rate Limiting:** Implement IP-based and account-based rate limiting on `/api/auth/register`, `/api/auth/fetch-salt`, and `/api/auth/login`.
- [ ] **Content Security Policy:** Deploy strict CSP headers preventing unauthorized script injection.
