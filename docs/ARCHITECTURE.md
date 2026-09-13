# Vaultline System Architecture & Cryptographic Specification

```text
  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗██╗     ██╗███╗   ██╗███████╗
  ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝██║     ██║████╗  ██║██╔════╝
  ██║   ██║███████║██║   ██║██║     ██║   ██║     ██║██╔██╗ ██║█████╗  
  ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ██║     ██║██║╚██╗██║██╔══╝  
   ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ███████╗██║██║ ╚████║███████╗
    ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
                     CORE ARCHITECTURAL BLUEPRINT
```

---

## 1. Architectural Philosophy & Trust Boundary

Vaultline is architected around a strict security boundary: **usable plaintext and private keys exist exclusively within browser memory**. The backend services, transport layers, database engines, and storage systems are **untrusted by design**.

The server authenticates users, enforces authorization rules, persists encrypted blobs, and coordinates public keys and wrapped key exchanges without possessing the mathematical capability to decrypt user files or read filenames.

```mermaid
flowchart TB
    subgraph TrustedBoundary ["TRUSTED CLIENT BOUNDARY (Browser)"]
        direction TB
        User["User Interaction"]
        ReactApp["React 18 / Vite UI Layer"]
        HooksContext["Hooks & Ephemeral Session State"]
        WebCrypto["Web Crypto API (SubtleCrypto)"]
        
        User <--> ReactApp
        ReactApp <--> HooksContext
        HooksContext <--> WebCrypto
    end

    subgraph UntrustedBoundary ["UNTRUSTED SERVER BOUNDARY (Infrastructure)"]
        direction TB
        APIGateway["FastAPI Gateway (/api)"]
        AuthRouter["Auth & JWT Engine (Argon2id)"]
        FileRouter["File Storage Router"]
        ShareRouter["Cryptographic Sharing Router"]
        SQLAlchemy["SQLAlchemy ORM Layer"]
        Database[("SQLite / PostgreSQL Database")]
        FileStore[("Ciphertext Disk / Object Storage")]

        APIGateway --> AuthRouter
        APIGateway --> FileRouter
        APIGateway --> ShareRouter
        
        AuthRouter --> SQLAlchemy
        FileRouter --> SQLAlchemy
        FileRouter --> FileStore
        ShareRouter --> SQLAlchemy
        SQLAlchemy --> Database
    end

    WebCrypto <-- "TLS Encrypted Transport (JSON / Multipart)" --> APIGateway

    classDef clientStyle fill:#f8f6f0,stroke:#d97757,stroke-width:2px,color:#1b1c1d;
    classDef serverStyle fill:#f0f3f6,stroke:#5f7258,stroke-width:2px,color:#1b1c1d;
    class TrustedBoundary clientStyle;
    class UntrustedBoundary serverStyle;
```

### Text Architectural Schematic

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TRUSTED ZONE: CLIENT BROWSER (PLAINTEXT)                        │
│                                                                                        │
│   Master Password ────────► PBKDF2-SHA256 (600,000 iter) ──► Master Derivation Key     │
│                                                                        │               │
│                                            ┌───────────────────────────┴──────────┐    │
│                                            ▼                                      ▼    │
│                                  HKDF("vaultline-auth-v1")              HKDF("vaultline-wrap-v1")
│                                            │                                      │    │
│                                            ▼                                      ▼    │
│                                       authProofB64                           wrappingKey
│                                            │                                      │    │
│                                            │                             Decrypts/Encrypts
│                                            │                                      │    │
│                                            │                                      ▼    │
│   Plaintext File ──► AES-256-GCM (DEK) ──► Ciphertext                     RSA Private Key
│                            │                                                           │
│                            └───────────────── RSA-OAEP Wrap ───────────────────────────┘
│                                                     │
└─────────────────────────────────────────────────────┼──────────────────────────────────┘
                                                      │ HTTPS / TLS Transport
┌─────────────────────────────────────────────────────▼──────────────────────────────────┐
│                     UNTRUSTED ZONE: BACKEND & STORAGE (CIPHERTEXT ONLY)                │
│                                                                                        │
│   authProofB64 ────────► Argon2id Hash ────────► Stored in Database                    │
│   Ciphertext ──────────► Disk Storage ─────────► Opaque Binary Storage                 │
│   Wrapped DEK ─────────► Database ─────────────► Stored per Authorized User            │
│   Metadata (Encrypted) ► Database ─────────────► Server Cannot Read Filenames          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Layering & Modular Decoupling

The frontend code separates UI presentation, session lifecycle orchestration, HTTP transport, and cryptographic primitives into discrete layers to prevent leaks and make testing modular.

```mermaid
flowchart TD
    subgraph PresentationTier ["Presentation Tier"]
        Pages["Pages (Landing, Demo, Auth, Vault, Settings)"]
        Components["Reusable Components (Modals, Buttons, FileLists)"]
    end

    subgraph StateTier ["State & Lifecycle Tier"]
        AuthContext["AuthContext (In-Memory Key Holder)"]
        UseFiles["useFiles Hook (Vault State & Mutations)"]
        UIContext["Toast & Modal Contexts"]
    end

    subgraph ServiceTier ["Service & Transport Tier"]
        AuthService["authService.js"]
        FileService["fileService.js"]
        SharingService["sharingService.js"]
        AxiosClient["Shared Axios Client (Bearer Interceptor)"]
    end

    subgraph CryptoTier ["Cryptographic Primitives Tier"]
        PasswordAuth["passwordAuth.js (PBKDF2 / HKDF)"]
        FileCrypto["fileCrypto.js (AES-256-GCM / DEK)"]
        KeyManagement["keyManagement.js (RSA-OAEP Wrap)"]
        CryptoUtils["cryptoUtils.js (Base64 / Buffer Utils)"]
    end

    Pages --> StateTier
    Components --> StateTier
    StateTier --> ServiceTier
    StateTier --> CryptoTier
    ServiceTier --> AxiosClient
    CryptoTier --> WebCryptoCore["Native Web Crypto API (window.crypto.subtle)"]

    classDef pres fill:#fcfbfa,stroke:#d97757,stroke-width:1px;
    classDef state fill:#f4efe6,stroke:#8c6d62,stroke-width:1px;
    classDef serv fill:#edf2f4,stroke:#4a6b82,stroke-width:1px;
    classDef crypt fill:#eef3e8,stroke:#5f7258,stroke-width:1px;

    class Pages,Components pres;
    class AuthContext,UseFiles,UIContext state;
    class AuthService,FileService,SharingService,AxiosClient serv;
    class PasswordAuth,FileCrypto,KeyManagement,CryptoUtils crypt;
```

---

## 3. Cryptographic Key Derivation & Hierarchy

Vaultline employs strict **domain separation** through HKDF. A single master password cannot both authenticate the user and decrypt files directly without explicit derivation steps.

```mermaid
flowchart TD
    Pwd["User Master Password"] --> PBKDF2["PBKDF2-SHA-256<br>Salt: 16 Random Bytes<br>Iterations: 600,000"]
    Salt["Client-Generated Salt"] --> PBKDF2
    PBKDF2 --> MDK["Master Derivation Key (Bits)"]

    MDK --> HKDF1["HKDF Extract & Expand<br>Info: 'vaultline-auth-v1'<br>Length: 256 bits"]
    MDK --> HKDF2["HKDF Extract & Expand<br>Info: 'vaultline-wrap-v1'<br>Length: 256 bits"]

    HKDF1 --> AuthProof["authProof (Transmitted to Server)"]
    HKDF2 --> WrapKey["wrapKey (Held in Memory Only)"]

    AuthProof --> Argon2["Server-side Argon2id Hashing"]
    Argon2 --> DBHash[("Database: hashed_auth_proof")]

    RSAKeyPair["Client RSA-3072 Keypair"] --> PubKey["Public Key (SPKI)"]
    RSAKeyPair --> PrivKey["Private Key (PKCS#8)"]
    
    PubKey --> DBPub[("Database: public_key")]
    PrivKey --> AESWrap["AES-256-GCM Encrypt with wrapKey"]
    WrapKey --> AESWrap
    AESWrap --> DBPriv[("Database: wrapped_private_key")]

    classDef cryptoBox fill:#fdf8f5,stroke:#d97757,stroke-width:1px;
    classDef storeBox fill:#edf2f7,stroke:#2b6cb0,stroke-width:1px;
    class Pwd,Salt,PBKDF2,MDK,HKDF1,HKDF2,AuthProof,WrapKey,RSAKeyPair,PubKey,PrivKey,AESWrap,Argon2 cryptoBox;
    class DBHash,DBPub,DBPriv storeBox;
```

---

## 4. Dual-Stage Registration Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Browser Client
    participant Crypto as Web Crypto API
    participant API as FastAPI Backend
    participant DB as Database Engine

    User->>Browser: Enter Email & Master Password
    Browser->>Crypto: Generate cryptographically random 16-byte Salt
    Browser->>Crypto: PBKDF2-SHA-256 (password, salt, 600k iterations)
    Crypto-->>Browser: Master Derivation Key (MDK)
    Browser->>Crypto: HKDF(MDK, info="vaultline-auth-v1")
    Crypto-->>Browser: authProof (Base64)
    Browser->>Crypto: HKDF(MDK, info="vaultline-wrap-v1")
    Crypto-->>Browser: wrapKey (AES-GCM CryptoKey)
    Browser->>Crypto: Generate RSA-OAEP 3072-bit Keypair
    Crypto-->>Browser: Public Key & Private Key
    Browser->>Crypto: Encrypt Private Key with wrapKey (AES-GCM)
    Crypto-->>Browser: wrappedPrivateKeyB64
    Browser->>API: POST /api/auth/register (email, saltB64, authProofB64, publicKeyB64, wrappedPrivateKeyB64)
    API->>API: Hash authProofB64 using Argon2id
    API->>DB: INSERT INTO users (email, salt, hashed_auth_proof, public_key, wrapped_private_key)
    DB-->>API: User Record Created
    API->>API: Generate signed JWT access token (HS256)
    API-->>Browser: 201 Created (access_token, user_id, email, wrappedPrivateKeyB64)
    Browser->>Browser: Store JWT in memory, cache unwrapped private key in React state
    Browser-->>User: Redirect to Vault Dashboard
```

---

## 5. Deterministic Repeat Login Sequence (Salt Recovery)

This diagram highlights the solution to the **salt replacement incident**, showing how the exact persisted client salt is recovered to unlock the vault.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Browser Client
    participant Crypto as Web Crypto API
    participant API as FastAPI Backend
    participant DB as Database Engine

    User->>Browser: Enter Email & Password
    Browser->>API: POST /api/auth/fetch-salt { email }
    API->>DB: SELECT salt FROM users WHERE email = normalized(email)
    DB-->>API: exact saltB64 persisted at registration
    API-->>Browser: 200 OK { saltB64 }
    
    Note over Browser,Crypto: Recreate Identical Cryptographic State
    Browser->>Crypto: PBKDF2-SHA-256 (password, saltB64, 600k iter)
    Crypto-->>Browser: Identical MDK
    Browser->>Crypto: HKDF(MDK, "vaultline-auth-v1") -> authProofB64
    Browser->>Crypto: HKDF(MDK, "vaultline-wrap-v1") -> wrapKey

    Browser->>API: POST /api/auth/login { email, authProofB64 }
    API->>DB: SELECT hashed_auth_proof, wrapped_private_key FROM users
    DB-->>API: Stored Hash & Wrapped Key
    API->>API: Argon2id.verify(authProofB64, hashed_auth_proof)
    API->>API: Issue signed JWT access token
    API-->>Browser: 200 OK { access_token, wrappedPrivateKeyB64 }

    Browser->>Crypto: AES-256-GCM Decrypt wrappedPrivateKeyB64 using wrapKey
    Crypto-->>Browser: Unwrapped RSA Private Key (CryptoKey)
    Browser->>Browser: Keep Private Key exclusively in React memory state
    Browser-->>User: Vault Unlocked Successfully
```

---

## 6. Encrypted File Upload & Envelope Generation

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    participant Browser as Browser Client
    participant Crypto as Web Crypto API
    participant API as Files API
    participant Storage as File Storage Disk

    Owner->>Browser: Select file to upload (e.g. Contract.pdf)
    Browser->>Crypto: Generate random 256-bit AES-GCM Key (DEK)
    Browser->>Crypto: Generate 96-bit Content IV & 96-bit Metadata IV
    
    Browser->>Crypto: AES-GCM Encrypt(file_bytes, DEK, Content_IV)
    Crypto-->>Browser: ciphertext_bytes (IV prepended)
    
    Browser->>Browser: Serialize metadata: JSON { name, type, size, modified }
    Browser->>Crypto: AES-GCM Encrypt(metadata_json, DEK, Metadata_IV)
    Crypto-->>Browser: encryptedMetadata (Base64)

    Browser->>Crypto: RSA-OAEP Wrap(DEK, Owner_PublicKey)
    Crypto-->>Browser: wrappedKey (Base64)

    Browser->>Browser: Build FormData (multipart/form-data with isolated headers)
    Browser->>API: POST /api/files/upload [multipart: ciphertext, encryptedMetadata, wrappedKey, sizeBytes]
    API->>API: Validate JWT bearer token & extract user_id
    API->>Storage: Write opaque ciphertext to disk (uploads/<uuid>.enc)
    API->>API: INSERT INTO files (owner_id, ciphertext_path, encrypted_metadata, wrapped_key, size_bytes)
    API-->>Browser: 201 Created { file_id, created_at, size_bytes }
    Browser-->>Owner: Upload Complete & Encrypted in Vault
```

---

## 7. Encrypted File Download & Integrity Verification

```mermaid
sequenceDiagram
    autonumber
    actor User as Owner or Recipient
    participant Browser as Browser Client
    participant Crypto as Web Crypto API
    participant API as Files API
    participant Storage as File Storage Disk

    User->>Browser: Click Download File
    Browser->>API: GET /api/files/{id}/download (Authorization: Bearer <JWT>)
    API->>API: Verify caller is Owner OR has active Share record
    API->>Storage: Read opaque ciphertext bytes
    API-->>Browser: 200 OK [Stream: ciphertext bytes]<br>Headers: X-Encrypted-Metadata, X-Wrapped-Key
    
    Browser->>Crypto: RSA-OAEP Unwrap(X-Wrapped-Key, In-Memory RSA Private Key)
    Crypto-->>Browser: Recovered File DEK (CryptoKey)
    
    Browser->>Crypto: AES-GCM Decrypt(X-Encrypted-Metadata, DEK)
    Crypto-->>Browser: Plaintext Metadata JSON { name: "Contract.pdf", type: "application/pdf" }

    Browser->>Crypto: AES-GCM Decrypt & Authenticate(ciphertext_bytes, DEK)
    alt Ciphertext / Tag Unmodified
        Crypto-->>Browser: Plaintext File ArrayBuffer
        Browser->>Browser: Trigger native browser file download (Contract.pdf)
        Browser-->>User: File Saved to Local Disk
    else Ciphertext Tampered
        Crypto-->>Browser: OperationError: Decryption failed (Authentication tag mismatch)
        Browser-->>User: Show Error: "File integrity check failed — payload modified"
    end
```

---

## 8. Multi-Party Secure Sharing & Key Distribution

Sharing never requires re-encrypting the original file or transmitting user passwords. The Data Encryption Key (DEK) is simply wrapped for the recipient.

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Owner (Alice)
    participant ABrowser as Alice's Browser
    participant API as Sharing API
    participant DB as Database
    participant BBrowser as Bob's Browser
    actor Bob as Recipient (Bob)

    Alice->>ABrowser: Share "Contract.pdf" with bob@example.com
    ABrowser->>API: POST /api/auth/lookup-public-key { email: "bob@example.com" }
    API->>DB: SELECT id, public_key FROM users WHERE email = "bob@example.com"
    DB-->>API: Bob's Record
    API-->>ABrowser: 200 OK { userId: "bob-uuid", publicKeyB64: "bob-spki-key" }

    Note over ABrowser: Cryptographic Key Translation
    ABrowser->>ABrowser: Unwrap Contract.pdf DEK using Alice's Private Key
    ABrowser->>ABrowser: Import Bob's Public Key via SubtleCrypto
    ABrowser->>ABrowser: RSA-OAEP Wrap(DEK, Bob_PublicKey) -> wrappedKeyForRecipient

    ABrowser->>API: POST /api/sharing/share { fileId, recipientEmail, wrappedKeyForRecipient }
    API->>API: Verify Alice owns fileId
    API->>DB: INSERT INTO shares (file_id, recipient_id, wrapped_key_for_recipient)
    API-->>ABrowser: 201 Created { message: "Shared successfully" }
    ABrowser-->>Alice: Share Confirmed

    Note over Bob,BBrowser: Bob Accesses Shared File
    Bob->>BBrowser: View "Shared with Me" Tab
    BBrowser->>API: GET /api/sharing/shared-with-me
    API->>DB: SELECT file details + wrapped_key_for_recipient
    API-->>BBrowser: 200 OK [{ fileId, encryptedMetadata, wrappedKeyForRecipient, ownerEmail }]
    Bob->>BBrowser: Click Download
    BBrowser->>API: GET /api/files/{id}/download
    API-->>BBrowser: Ciphertext Stream + Bob's Wrapped Key in Headers
    BBrowser->>BBrowser: Unwrap DEK with Bob's Private Key & Decrypt Locally
    BBrowser-->>Bob: Plaintext File Saved
```

---

## 9. Access Revocation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Owner (Alice)
    participant Browser as Alice's Browser
    participant API as Sharing API
    participant DB as Database
    actor Bob as Revoked Recipient (Bob)

    Alice->>Browser: Revoke Bob's access to "Contract.pdf"
    Browser->>API: DELETE /api/sharing/revoke { fileId, recipientEmail: "bob@example.com" }
    API->>API: Verify caller is File Owner
    API->>DB: DELETE FROM shares WHERE file_id = fileId AND recipient_id = bob_id
    DB-->>API: 1 Row Deleted
    API-->>Browser: 200 OK { message: "Access revoked successfully" }
    Browser-->>Alice: Bob's Grant Removed from UI

    Note over Bob,API: Bob Attempts Unauthorized Download
    Bob->>API: GET /api/files/{id}/download (Bob's JWT)
    API->>DB: Check if Bob is Owner OR in shares
    DB-->>API: No matching grant
    API-->>Bob: 404 Not Found (Silent rejection; existence concealed)
```

---

## 10. Relational Database Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ FILES : owns
    USERS ||--o{ SHARES : receives
    FILES ||--o{ SHARES : "authorized via"

    USERS {
        string id PK "UUID string"
        string email UK "Normalized lowercase string"
        string hashed_auth_proof "Argon2id hash of authProof"
        string salt "Base64 16-byte PBKDF2 derivation salt"
        text public_key "Base64 RSA-3072 SPKI public key"
        text wrapped_private_key "Base64 AES-GCM encrypted PKCS#8 private key"
        datetime created_at "UTC timestamp"
    }

    FILES {
        string id PK "UUID string"
        string owner_id FK "References users.id (CASCADE)"
        string ciphertext_path "Local filesystem or S3 object URI"
        text encrypted_metadata "Base64 AES-GCM encrypted filename & type"
        text wrapped_key "Base64 RSA-OAEP wrapped DEK for Owner"
        bigint size_bytes "Original file size in bytes"
        datetime created_at "UTC timestamp"
    }

    SHARES {
        string file_id PK,FK "References files.id (CASCADE)"
        string recipient_id PK,FK "References users.id (CASCADE)"
        text wrapped_key_for_recipient "Base64 RSA-OAEP wrapped DEK for Recipient"
        datetime shared_at "UTC timestamp"
    }
```

---

## 11. Deployment Topology & Environments

```mermaid
flowchart TB
    subgraph DevProfile ["Development Profile (Zero-Config)"]
        direction TB
        ViteDev["Vite Dev Server (Port 5173)"]
        FastAPIDev["FastAPI Uvicorn (Port 8000)"]
        SQLiteDB[("SQLite DB (vaultline.db)")]
        DiskStore[("Local Disk (uploads/*.enc)")]

        ViteDev -->|Proxy /api| FastAPIDev
        FastAPIDev --> SQLiteDB
        FastAPIDev --> DiskStore
    end

    subgraph ProdProfile ["Production Target Profile (Hardened)"]
        direction TB
        Cloudflare["Cloudflare CDN & Edge TLS"]
        StaticFrontend["Static Frontend Assets (S3/CloudFront)"]
        ReverseProxy["Nginx / ALB Ingress Controller"]
        FastAPICluster["FastAPI Containers (Gunicorn/Uvicorn)"]
        ManagedPG[("Managed PostgreSQL (RDS/Aurora)")]
        S3Encrypted[("Encrypted S3 Object Storage")]
        SecretManager["AWS Secrets Manager / Vault"]

        Cloudflare --> StaticFrontend
        Cloudflare --> ReverseProxy
        ReverseProxy --> FastAPICluster
        SecretManager -.->|Inject SECRET_KEY| FastAPICluster
        FastAPICluster --> ManagedPG
        FastAPICluster --> S3Encrypted
    end
```

---

## 12. Summary of Cryptographic Invariants

1. **No Plaintext on Wire:** Plaintext passwords, private keys, filenames, and file bodies are never transmitted over network protocols.
2. **Ephemeral Private Key:** The unwrapped RSA private key exists only in JavaScript heap memory during an active session and is never persisted to `localStorage`, `sessionStorage`, cookies, or IndexedDB.
3. **Independent Initialization Vectors:** Every AES-GCM encryption operation draws a freshly generated cryptographically secure 96-bit random IV. IV reuse across identical keys is mathematically prevented.
4. **Authenticity Enforcement:** All AES-GCM ciphertexts include a 128-bit authentication tag. Altered ciphertexts are rejected before buffer release.
5. **Ownership Isolation:** API routes derive caller identity strictly from verified cryptographically signed JWT tokens, completely ignoring client-supplied user IDs.
