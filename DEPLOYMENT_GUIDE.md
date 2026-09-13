# Vaultline Deployment & Infrastructure Guide

```text
  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗██╗     ██╗███╗   ██╗███████╗
  ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝██║     ██║████╗  ██║██╔════╝
  ██║   ██║███████║██║   ██║██║     ██║   ██║     ██║██╔██╗ ██║█████╗  
  ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ██║     ██║██║╚██╗██║██╔══╝  
   ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ███████╗██║██║ ╚████║███████╗
    ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
                     DEPLOYMENT & OPERATIONAL RUNBOOK
```

---

## 1. Operating Profiles & Infrastructure Matrix

Vaultline supports three deployment tiers designed for specific evaluation and operational environments:

| Deployment Profile | Target Audience | Required Stack Components | Data Persistence |
|---|---|---|---|
| **Guided Website Demo** | Evaluators, quick presentations | Static React bundle (`dist/`) | In-memory ephemeral browser state |
| **Local Application Stack** | Development, classroom assessment | Vite (`:5173`) + FastAPI (`:8000`) + SQLite | Local disk (`vaultline.db` + `uploads/*.enc`) |
| **Production Target** | Hardened public internet | Cloudflare CDN + HTTPS + FastAPI + PostgreSQL + S3 | Managed encrypted database & cloud object storage |

---

## 2. Local Full-Stack Deployment (Recommended for Grading & Assessment)

### Step 1: Backend API Service

```powershell
# In terminal 1
cd backend-integration

# Set up virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # On macOS/Linux: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI server (binds to http://127.0.0.1:8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 2: Web Client Application

```powershell
# In terminal 2 (repository root)
npm install

# Start Vite dev server (binds to http://localhost:5173)
npm run dev
```

### Verification Endpoints:
- Web App & Guided Tour: `http://localhost:5173` (or direct `/demo`)
- API Health Check: `http://localhost:8000/health` (verifies SQLite connectivity)
- Interactive OpenAPI Swagger Docs: `http://localhost:8000/docs`

---

## 3. Production Target Architecture & Security Hardening

```mermaid
flowchart TD
    User["End-User Browser"]
    CF["Cloudflare CDN (Edge TLS / WAF)"]
    S3Static["S3 / CloudFront (Static React Assets)"]
    ReverseProxy["Nginx / Ingress Controller"]
    FastAPIApp["FastAPI Cluster (Uvicorn / Gunicorn)"]
    Postgres[("Managed PostgreSQL (RDS)")]
    ObjectStore[("Encrypted Object Storage (AWS S3)")]
    SecretsMgr["AWS Secrets Manager / Vault"]

    User -->|HTTPS :443| CF
    CF -->|Static Content| S3Static
    CF -->|API Traffic /api/*| ReverseProxy
    ReverseProxy --> FastAPIApp
    SecretsMgr -.->|Inject SECRET_KEY & DB_URL| FastAPIApp
    FastAPIApp --> Postgres
    FastAPIApp --> ObjectStore
```

### Critical Production Checklist:
1. **Configure Secret Key:** Set a cryptographically secure 64-character secret (`openssl rand -hex 32`) in `SECRET_KEY`.
2. **Restrict CORS Origins:** Update `CORS_ORIGINS` to accept only authorized frontend production domains.
3. **Database Migration:** Point `DATABASE_URL` to a high-availability PostgreSQL cluster (`postgresql+psycopg://user:pass@host:5432/dbname`). Run Alembic migrations:
   ```powershell
   alembic upgrade head
   ```
4. **Cloud Object Storage:** Transition `upload_dir` filesystem storage to an S3/MinIO compatible driver prior to horizontal scaling.
5. **TLS Termination & HSTS:** Enforce TLS 1.3 with HTTP Strict Transport Security (`max-age=31536000; includeSubDomains; preload`).
