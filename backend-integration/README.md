# Vaultline Backend - FastAPI Server

Backend API for the Vaultline secure file vault application.

## 🏗️ Architecture

**Zero-Knowledge Encryption:**
- All encryption happens client-side (browser)
- Server only stores ciphertext and encrypted metadata
- Server never sees plaintext files, filenames, or unwrapped keys

**Technology Stack:**
- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Relational database
- **SQLAlchemy**: ORM for database operations
- **JWT**: Token-based authentication
- **bcrypt**: Password hashing
- **RSA-OAEP + AES-256-GCM**: Encryption scheme (client-side)

## 📋 Prerequisites

- Python 3.10 or higher
- PostgreSQL 12 or higher
- pip (Python package manager)

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
# Create virtual environment (optional but recommended)
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Setup Database

**Install PostgreSQL:**
- Download from: https://www.postgresql.org/download/windows/
- Or use Docker: `docker run --name vaultline-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`

**Create Database:**

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE vaultline;

-- Create user (optional)
CREATE USER vaultuser WITH PASSWORD 'securepassword';
GRANT ALL PRIVILEGES ON DATABASE vaultline TO vaultuser;
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update values:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vaultline
SECRET_KEY=your-secret-key-here-generate-with-openssl
```

**Generate a secure secret key:**

```powershell
# Using Python
python -c "import secrets; print(secrets.token_hex(32))"

# Or using OpenSSL (if installed)
openssl rand -hex 32
```

### 4. Run the Server

```powershell
# Development mode (auto-reload)
uvicorn app.main:app --reload --port 8000

# Or run directly
python -m app.main
```

**Server will start at:** http://localhost:8000

## 📚 API Documentation

Once the server is running, visit:

- **Swagger UI (Interactive):** http://localhost:8000/docs
- **ReDoc (Alternative):** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

## 🔐 Authentication Flow

### Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "authProofB64": "...",           # PBKDF2 hash (client-side)
  "publicKeyB64": "...",            # RSA public key
  "wrappedPrivateKeyB64": "..."    # Encrypted private key
}
```

### Login (2-Step)

**Step 1: Fetch Salt**

```http
POST /api/auth/fetch-salt
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: { "salt": "..." }
```

**Step 2: Login**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "authProofB64": "..."  # Derived using salt from step 1
}

Response: {
  "user": { "id": "...", "email": "..." },
  "token": "...",
  "wrappedPrivateKeyB64": "...",
  "salt": "..."
}
```

### Using the Token

Include JWT token in all subsequent requests:

```http
Authorization: Bearer <token>
```

## 📁 File Operations

### Upload File

```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

ciphertext: <binary file>
encryptedMetadata: "..."
wrappedKey: "..."
sizeBytes: 1234567
```

### List Files

```http
GET /api/files
Authorization: Bearer <token>
```

### Download File

```http
GET /api/files/{file_id}/download
Authorization: Bearer <token>
```

Response headers contain encrypted metadata and wrapped key.

### Delete File

```http
DELETE /api/files/{file_id}
Authorization: Bearer <token>
```

## 🤝 File Sharing

### Share File

```http
POST /api/sharing/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileId": "...",
  "recipientEmail": "friend@example.com",
  "wrappedKeyForRecipient": "..."
}
```

### List Shares

```http
GET /api/sharing/{file_id}
Authorization: Bearer <token>
```

### Revoke Share

```http
DELETE /api/sharing/revoke
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileId": "...",
  "recipientEmail": "friend@example.com"
}
```

## 🗂️ Project Structure

```
backend-integration/
├── app/
│   ├── routers/
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── files.py         # File operations
│   │   └── sharing.py       # File sharing
│   ├── schemas/
│   │   ├── auth.py          # Request/response models
│   │   ├── files.py
│   │   └── sharing.py
│   ├── utils/
│   │   ├── auth_utils.py    # Password hashing
│   │   └── jwt_utils.py     # JWT token management
│   ├── config.py            # Configuration management
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy models
│   └── main.py              # FastAPI application
├── uploads/                  # Encrypted file storage
├── requirements.txt          # Python dependencies
├── .env.example             # Environment variables template
└── README.md                # This file
```

## 🧪 Testing

### Manual Testing

Use the interactive API docs at http://localhost:8000/docs

### Health Check

```http
GET /health

Response: {
  "status": "healthy",
  "database": "connected",
  "api": "operational"
}
```

## 🔧 Configuration

All configuration is in `app/config.py` and loaded from environment variables.

**Key Settings:**

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/vaultline` |
| `SECRET_KEY` | JWT signing key | Auto-generated |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `1440` (24 hours) |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `104857600` (100 MB) |
| `UPLOAD_DIR` | Encrypted file storage | `uploads/` |
| `CORS_ORIGINS` | Allowed origins | `["http://localhost:5173"]` |

## 🐛 Troubleshooting

### Database Connection Failed

**Error:** `Database connection failed`

**Solutions:**
- Check PostgreSQL is running: `psql -U postgres`
- Verify DATABASE_URL in `.env`
- Ensure database exists: `CREATE DATABASE vaultline;`

### Import Errors

**Error:** `ModuleNotFoundError`

**Solution:**
```powershell
pip install -r requirements.txt
```

### Port Already in Use

**Error:** `Address already in use: 8000`

**Solution:**
```powershell
# Use different port
uvicorn app.main:app --port 8001

# Or kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### CORS Errors

**Error:** `No 'Access-Control-Allow-Origin' header`

**Solution:**
- Add frontend URL to `CORS_ORIGINS` in `.env`
- Ensure frontend is using correct API URL

## 🚀 Production Deployment

### Environment Variables

Create `.env` with production values:

```env
DATABASE_URL=postgresql://user:pass@production-db:5432/vaultline
SECRET_KEY=<very-secure-random-string>
DEBUG=false
CORS_ORIGINS=https://yourdomain.com
```

### Run with Gunicorn/Uvicorn

```powershell
# Single worker
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Multiple workers (production)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker (Optional)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 📊 Database Migrations

For production, use Alembic for database migrations:

```powershell
# Initialize Alembic (already done)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

## 🔒 Security Notes

1. **Never commit `.env` file** - Contains secrets
2. **Use HTTPS in production** - Protect tokens in transit
3. **Change SECRET_KEY** - Generate unique key for production
4. **Limit CORS origins** - Only allow your frontend domain
5. **Enable rate limiting** - Prevent brute force attacks
6. **Monitor logs** - Detect suspicious activity

## 📝 License

This is part of the Vaultline project. See main README for license information.

## 🤝 Contributing

1. Follow existing code structure
2. Add docstrings to all functions
3. Test endpoints before committing
4. Update this README for new features

## 📞 Support

For issues or questions:
- Check `/docs` for API documentation
- Review error messages in console
- Ensure database is running
- Verify environment variables are set
