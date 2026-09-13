# Vaultline Combined Team Engineering Journal

```text
  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗██╗     ██╗███╗   ██╗███████╗
  ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝██║     ██║████╗  ██║██╔════╝
  ██║   ██║███████║██║   ██║██║     ██║   ██║     ██║██╔██╗ ██║█████╗  
  ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ██║     ██║██║╚██╗██║██╔══╝  
   ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ███████╗██║██║ ╚████║███████╗
    ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
           COLLABORATIVE ENGINEERING LOG & INCIDENT RETROSPECTIVE
```

## Team & Contribution Matrix

| Contributor | Registration / Roll No. | Primary Focus & System Modules | Individual Journals |
|---|---|---|---|
| **Vikramaditya** | `1024030315` | Frontend core, React component tree, Web Crypto envelope encryption primitives, mock service abstraction | [week1-2.md](1024030315-Vikramaditya/week1-2.md) |
| **Sukhansh Mittal** | `1024030318` | Backend foundation, FastAPI routing, SQLAlchemy models, Python 3.14 dependency triage, DB initialization scripts | [week1-2.md](1024030318-sukhanshmittal/week1-2.md) |
| **Ishjaap Singh** | `1024030327` | Full-stack integration, Auth defect diagnosis & repair, persistent JWT/Argon2 pipeline, Apple-inspired editorial UI redesign, in-website `/demo`, automated test suites & release documentation | [week1-2.md](1024030327-Ishjaap-Singh/week1-2.md) |

---

## Executive System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              TRUSTED BOUNDARY: CLIENT BROWSER                               │
│                                                                                             │
│   ┌───────────────────────────┐      ┌───────────────────────────┐      ┌────────────────┐  │
│   │    User Authentication    │      │    Envelope Encryption    │      │  Web UI / Demo │  │
│   │  Password + Random Salt   │      │   AES-256-GCM (DEK)       │      │   React 18.3   │  │
│   │           │               │      │   Content IV / Meta IV    │      │  Editorial UX  │  │
│   │      PBKDF2-SHA256        │      │   RSA-OAEP Key Wrapping   │      │  5-Step Walk-  │  │
│   │           │ (600k iter)   │      │   No Plaintext Leakage    │      │    through     │  │
│   │         HKDF              │      └─────────────┬─────────────┘      └────────────────┘  │
│   │     ┌─────┴─────┐         │                    │                                        │
│   │     ▼           ▼         │                    ▼                                        │
│   │ authProof   wrapKey       │             Encrypted Payload                               │
│   │ (Base64)    (In-Memory)   │             (Ciphertext + Form)                             │
│   └─────┬─────────────────────┘                    │                                        │
└─────────┼──────────────────────────────────────────┼────────────────────────────────────────┘
          │ POST /api/auth/register, /login          │ POST /api/files/upload, /sharing
          ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            UNTRUSTED BOUNDARY: FASTAPI BACKEND                              │
│                                                                                             │
│   ┌───────────────────────────┐      ┌───────────────────────────┐      ┌────────────────┐  │
│   │    Security & Identity    │      │      Storage Engine       │      │ Database Layer │  │
│   │  Argon2id Proof Hashing   │      │  Opaque Ciphertext Writes │      │   SQLAlchemy   │  │
│   │  JWT Access Tokens (HS256)│      │  Zero Knowledge of DEK    │      │ SQLite/Postgres│  │
│   │  CORS & Rate Guardrails   │      │  Upload Size Enforcement  │      │ Users/Files/   │  │
│   │  Negative Access Controls │      │  Streamed Octet Downloads │      │ Shares Tables  │  │
│   └───────────────────────────┘      └───────────────────────────┘      └────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Weekly Engineering Logs (Sprint Retrospective)

### Week 1 — Trust Boundary, Envelope Encryption & Frontend Scaffold
**Primary Contributors:** Vikramaditya (`1024030315`), Ishjaap Singh (`1024030327`)

- **Objective:** Establish the foundational zero-knowledge contract and prevent sensitive plaintext from touching the backend or network transport.
- **Problems Encountered:**
  1. *Password-Derived File Keys:* Initial design considered deriving file encryption keys directly from the user's password (`PBKDF2(pwd) -> AES key`). This made recipient sharing impossible without giving the recipient the owner's password.
  2. *Metadata Leakage:* Standard upload handlers exposed plaintext filenames and MIME types to server logs and database columns.
  3. *UI/Crypto Coupling:* Embedding Web Crypto calls directly into React component handlers threatened frontend maintainability.
- **Technical Decisions & Implementations:**
  - Implemented **Envelope Encryption**: Each file generates a cryptographically random AES-256-GCM Data Encryption Key (DEK). The DEK is wrapped using the user's RSA-OAEP public key. Sharing requires only wrapping the existing DEK with the recipient's public key.
  - Implemented dual-payload encryption: filename, MIME type, and size are serialized as JSON and encrypted with AES-256-GCM using an independent 96-bit IV.
  - Architected a 4-tier frontend stack: `Pages -> Hooks -> Service Adapters -> Web Crypto Primitives`.
  - Built initial React components with responsive layout, upload drag-and-drop, and mock service adapters for rapid iteration.
- **Outcome:** Clean client-side encryption verified in browser memory. Mock services unblocked interface development while backend API contracts were being drafted.

---

### Week 2 — Backend Scaffold, Python 3.14 Triage & API Contracts
**Primary Contributors:** Sukhansh Mittal (`1024030318`), Ishjaap Singh (`1024030327`)

- **Objective:** Stand up the FastAPI backend, establish SQLAlchemy ORM models, configure PostgreSQL database connectivity, and map endpoints to frontend services.
- **Problems Encountered:**
  1. *Python 3.14 Bleeding-Edge Incompatibilities:* Strict version pinning (`==`) in `requirements.txt` broke `psycopg-binary==3.1.12`, `pydantic-core`, and `bcrypt` (`AttributeError: module 'bcrypt' has no attribute '__about__'`).
  2. *SQLAlchemy 2.0 Syntax Constraints:* Raw text SQL strings in health checks caused execution exceptions.
  3. *Route Prefix Divergence:* Frontend called `/auth/register` while FastAPI router mounted `/api/auth/register`, leading to `404 Not Found`.
- **Technical Decisions & Implementations:**
  - Upgraded requirements from fixed `==` to minimum `>=` version constraints, enabling pip to resolve compatible Python 3.14 wheels.
  - Replaced `bcrypt` with modern, memory-hard `argon2-cffi`.
  - Wrapped SQL expressions with explicit `text()` in `backend-integration/app/database.py`.
  - Added `email-validator` to support Pydantic `EmailStr`.
  - Standardized all frontend endpoints under `/api` in `src/api/endpoints.js` and harmonized Vite proxy rules.
  - Created automated DB scripts: `create_db.py`, `init_db.py`, and `verify_tables.py`.
- **Outcome:** FastAPI server operational at `localhost:8000` with interactive OpenAPI docs at `/docs`. Temporary in-memory auth used to isolate network and CORS configuration.

---

### Week 3 — The Salt Regeneration Bug & Authentication Incident
**Primary Contributors:** Ishjaap Singh (`1024030327`), Sukhansh Mittal (`1024030318`)

- **Objective:** Transition from temporary in-memory auth to persistent database authentication, and solve the critical defect where users could register but could never log back in.
- **Root Cause Analysis (The Salt Replacement Incident):**
  ```text
  [REGISTRATION]
  Browser generates Salt A ───────► Derives: Proof A + WrapKey A
  Browser transmits: Salt A + Proof A + WrappedPrivateKey(WrapKey A)
  BACKEND BUG: Server ignores Salt A, generates Salt B, stores Salt B in DB!

  [LATER LOGIN]
  Browser calls /fetch-salt ◄──── Server returns Salt B!
  Browser produces: Proof B (!= Proof A) + WrapKey B (!= WrapKey A)
  RESULT: Proof verification fails, and user CANNOT decrypt their private key!
  ```
- **Technical Fixes:**
  - Updated `User` model and `UserCreate` schema to require and store `saltB64` as provided by the client.
  - Normalized email addresses across registration, login, and salt lookup (`email.strip().lower()`).
  - Implemented persistent database authentication in `backend-integration/app/routers/auth.py`, replacing the temporary dictionary.
  - Hashed client authentication proofs using Argon2id (`hasher.hash(payload.authProofB64)`).
  - Restored real HMAC-SHA256 signed JWT tokens accepted by all protected routes.
  - Created `/api/auth/me` endpoint to verify live token identity.
  - Authored automated regression tests verifying deterministic repeat logins and private key unwrapping.
- **Outcome:** Registration, session termination, and subsequent logins operate deterministically with complete zero-knowledge security guarantees.

---

### Week 4 — Encrypted File Lifecycle & Cryptographic Sharing
**Primary Contributors:** Ishjaap Singh (`1024030327`), Sukhansh Mittal (`1024030318`)

- **Objective:** Connect the real authenticated frontend to the backend file and sharing routers, enabling upload, encrypted download, and cross-user key distribution.
- **Problems Encountered:**
  1. *Database Prerequisite Fragility:* Hard dependency on local PostgreSQL made evaluation and local execution brittle across team machines.
  2. *Schema Mismatch on `/sharing/shared-with-me`:* Backend returned sharing grant records instead of hydrated file metadata, causing frontend rendering exceptions.
  3. *Recipient Normalization Defect:* Sharing lookup was case-sensitive; sharing with `Alice@example.com` failed if registered as `alice@example.com`.
- **Technical Decisions & Implementations:**
  - Implemented automatic SQLite fallback as the default zero-config local database, retaining optional PostgreSQL through `postgresql+psycopg://`.
  - Reconciled file upload endpoints: multipart payload receiving binary `ciphertext`, `encryptedMetadata`, `wrappedKey`, and `sizeBytes`.
  - Implemented custom binary download response returning `application/octet-stream` with cryptographic custom headers: `X-Encrypted-Metadata`, `X-Wrapped-Key`, `X-File-Id`.
  - Repaired `/sharing/shared-with-me` to join `File` and `Share` records, delivering recipient-wrapped DEKs and file size.
  - Enforced strict authorization barriers: non-owners cannot delete files, non-recipients cannot download files, and revoked users receive immediate `404 Not Found`.
- **Outcome:** Complete real file lifecycle operational. End-to-end multi-user sharing and revocation verified.

---

### Week 5 — Visual Redesign & Apple-Inspired Editorial Design System
**Primary Contributor:** Ishjaap Singh (`1024030327`)

- **Objective:** Overhaul the generic, dark "AI-template" theme into a refined, tactile, Apple-inspired editorial interface communicating security and trust.
- **Problems Encountered:**
  - The previous UI relied on over-saturated neon gradients and heavy drop shadows that felt gimmicky and unpolished for a serious cryptographic security tool.
  - Marketing, authentication, and vault dashboards lacked unified visual hierarchy and consistent design tokens.
- **Design Decisions & Implementation:**
  - Developed custom CSS variable system (`src/styles/variables.css`): warm ivory background (`#f8f6f0`), deep charcoal typography (`#1b1c1d`), coral accent highlights (`#d97757`), and sage green status indicators (`#5f7258`).
  - Integrated modern editorial serif typography for headings paired with crisp, clean sans-serif for functional UI elements.
  - Restyled buttons, form inputs, modal dialogs, and navigation sidebars with subtle tactile borders and organic curves.
  - Rebuilt `LandingPage.jsx` around a coherent product narrative, live architectural highlights, and an interactive workspace preview.
  - Preserved full accessibility: keyboard focus states, WCAG contrast compliance, and `prefers-reduced-motion` CSS rules.
- **Outcome:** Elevated the product to presentation-grade quality with an original, sophisticated visual identity.

---

### Week 6 — In-Browser Interactive Guided Demonstration (`/demo`)
**Primary Contributor:** Ishjaap Singh (`1024030327`)

- **Objective:** Enable evaluators and stakeholders to immediately understand and test the cryptographic vault workflow without requiring manual database setup or account registration.
- **Technical Decisions & Implementation:**
  - Created `ProductDemoPage.jsx` and `ProductDemoPage.css` mapped to `/demo`.
  - Engineered 5 interactive chapters:
    1. **Overview:** Guided tour of an active unlocked vault workspace.
    2. **Encrypt:** Live in-browser simulation demonstrating file byte encryption and independent metadata IV generation.
    3. **Share:** Interactive recipient selection, public-key lookup, and DEK re-wrapping demonstration.
    4. **Open:** In-memory private key unwrapping and AES-GCM integrity check simulation.
    5. **Proof:** Interactive review of cryptographic guarantees, key fingerprints, and threat mitigation models.
  - Connected the landing page primary CTA directly to the demo walkthrough.
- **Outcome:** Evaluators can inspect and understand the full system in under 3 minutes, while the real authenticated app remains available for deep technical auditing.

---

### Week 7 — Release Quality Gate, Boundary Bug Discovery & Final Docs
**Primary Contributor:** Ishjaap Singh (`1024030327`)

- **Objective:** Conduct an exhaustive, fine-tooth technical audit of the entire codebase, eliminate second-order defects, and establish canonical documentation.
- **Critical Discovery (The Axios Content-Type Mutation Bug):**
  - *Symptom:* Unit tests and backend tests both passed independently, yet live file uploads occasionally submitted empty `{ ciphertext: {} }` payloads.
  - *Root Cause:* Axios default configuration had `Content-Type: application/json` globally set. When dispatching a `FormData` multipart object, Axios failed to generate the required HTTP multipart boundary delimiter and instead attempted JSON stringification on the binary stream!
  - *Fix:* Configured per-request header overrides in `src/services/fileService.js` and added a dedicated mock-boundary regression test (`src/services/fileService.test.js`) ensuring `FormData` payloads remain intact.
- **Additional Polish & Hardening:**
  - Added production guard in `backend-integration/app/config.py` rejecting short (<32 char) or shared development JWT secrets.
  - Removed all cached `__pycache__` artifacts and stale documentation files.
  - Authored comprehensive canonical docs: `ARCHITECTURE.md`, `SECURITY.md`, `API_REFERENCE.md`, `DEMO_GUIDE.md`, `TESTING.md`, and top-tier `README.md`.
  - Built comprehensive individual and combined team journals.
- **Verification Evidence:**
  - Frontend Lint: `PASS`
  - Vitest Unit & Boundary Tests: `3 / 3 PASS`
  - Vite Production Build: `PASS` (dist generated cleanly)
  - Pytest Backend Integration Suite: `4 / 4 PASS`
  - Zero npm vulnerabilities, zero credential leaks.

---

## Evolution of Key Architectural Decisions

| Decision Area | Initial Approach (Week 1–2) | Intermediate Shift (Week 3–4) | Final Canonical Architecture (Week 5–7) |
|---|---|---|---|
| **File Encryption** | Password-derived AES key | Single DEK per file | Envelope encryption: AES-256-GCM DEK wrapped per recipient via RSA-OAEP |
| **Authentication** | Direct password sending | In-memory dict with fake tokens | Dual PBKDF2/HKDF split, Argon2id proof hashing, signed HS256 JWTs |
| **Derivation Salt** | Backend generated | In-memory transient salt | Exact client-generated salt persisted in database and returned at login |
| **Database Engine** | PostgreSQL only (strict pin) | In-memory dictionary fallback | Zero-config SQLite default with seamless PostgreSQL production profile |
| **Upload Transport** | Standard JSON Base64 | Unbounded multipart upload | Strict multipart `FormData` with Axios header boundary isolation |
| **Product Walkthrough** | Terminal command launcher | Manual multi-browser signup | Integrated 5-chapter interactive web demo at `/demo` |
| **Visual Design** | Neon dark-mode template | Unstyled layout fragments | Apple-inspired warm editorial design system with bespoke typography |

---

## Technical Debt & Future Engineering Roadmap

1. **Streaming & Chunked AEAD:** Current implementation buffers files in memory; future iterations will adopt chunked AES-GCM framing (e.g., 64 KB chunks with incremental counters) to support multi-gigabyte uploads without memory spikes.
2. **Hard Revocation via Key Rotation:** Currently, revocation deletes future server access grants. True cryptographic forward secrecy will re-encrypt the file with a fresh DEK for remaining authorized recipients.
3. **Session Revocation & Refresh Tokens:** Add Redis-backed JWT revocation lists and refresh token rotation.
4. **Public Key Infrastructure / Key Transparency:** Add signed public key logs to prevent server-side man-in-the-middle key substitution attacks.
5. **Cloud Object Storage Adapter:** Replace local disk directory with an S3/MinIO compatible storage driver.

---

## Team Retrospective & Key Takeaways

1. **Seams Between Systems Require Tests:** Independent frontend and backend tests are insufficient. The Axios multipart header bug proved that errors thrive at the boundary between two passing systems.
2. **Cryptographic Contracts Are Inflexible:** An error as subtle as discarding a client salt invalidates an entire security model. Cryptographic software demands deterministic state transitions.
3. **Design is Part of Security:** A confusing interface leads to operational mistakes. Thoughtful design, clear microcopy, and guided demonstrations make complex zero-knowledge systems trustworthy and accessible.
