# Vaultline Backend API Service

```text
  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗██╗     ██╗███╗   ██╗███████╗
  ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝██║     ██║████╗  ██║██╔════╝
  ██║   ██║███████║██║   ██║██║     ██║   ██║     ██║██╔██╗ ██║█████╗  
  ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ██║     ██║██║╚██╗██║██╔══╝  
   ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ███████╗██║██║ ╚████║███████╗
    ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
                     BACKEND SERVICE ARCHITECTURE & OPERATIONS
```

FastAPI backend service for Vaultline's zero-knowledge encrypted file vault. The API authenticates users via Argon2id proof verification, stores opaque ciphertext files on disk, coordinates RSA public key lookups, and manages per-user wrapped Data Encryption Keys (DEKs). Plaintext file content, metadata, and private keys never touch this service.

---

## 1. Quickstart

Python 3.10 or newer is required (tested on Python 3.12 and 3.14). SQLite is the zero-configuration default.

```powershell
# In backend-integration directory
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # On macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Key Service Endpoints:
- **Service Health:** `http://localhost:8000/health`
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc UI:** `http://localhost:8000/redoc`
- **OpenAPI Schema:** `http://localhost:8000/openapi.json`

The default local database is `vaultline.db` (auto-created on startup). Ciphertext files are written to `uploads/`. Both are excluded by `.gitignore`.

---

## 2. Configuration Options

Copy `.env.example` to `.env` when overriding development defaults:

| Variable | Development Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./vaultline.db` | SQLAlchemy connection string |
| `SECRET_KEY` | `development-secret-key-...` | HS256 JWT signing key |
| `ENVIRONMENT` | `development` | `development`, `test`, or `production` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24 Hours) | JWT session lifetime |
| `MAX_FILE_SIZE` | `104857600` (100 MB) | Maximum permitted ciphertext payload |
| `UPLOAD_DIR` | `./uploads` | Ciphertext storage path |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Whitelisted browser origins |

---

## 3. Database Management & Migrations

For PostgreSQL environments, install psycopg 3 and set:
```env
DATABASE_URL=postgresql+psycopg://vaultline:password@localhost:5432/vaultline
```

Execute migrations:
```powershell
alembic upgrade head
```

Or verify database table existence via helper scripts:
```powershell
python verify_tables.py
```
