# 🚀 Vaultline Backend - Quick Start Guide

## ✅ Everything is Built and Ready!

The complete FastAPI backend is implemented and ready to run. Follow these steps to get it working.

---

## 📋 Prerequisites

- **Python 3.10+**
- **PostgreSQL 12+** (or Docker)
- **pip** (Python package manager)

---

## 🚀 Step 1: Setup PostgreSQL Database

### Option A: Using Docker (Recommended - Easiest)

```powershell
# Start PostgreSQL in Docker
docker run --name vaultline-db `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=vaultline `
  -p 5432:5432 `
  -d postgres:15

# Verify it's running
docker ps | findstr vaultline-db
```

### Option B: Local PostgreSQL Installation

If PostgreSQL is already installed locally:

```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE vaultline;

# Exit
\q
```

---

## 📦 Step 2: Install Dependencies

```powershell
# Navigate to backend directory
cd backend-integration

# Create virtual environment (recommended)
python -m venv .venv
.\.venv\Scripts\activate

# Install all dependencies
pip install -r requirements.txt

# Verify installation
pip list | findstr -i "fastapi sqlalchemy pydantic"
```

---

## ⚙️ Step 3: Verify Configuration

Check `.env` file exists with correct database URL:

```powershell
# Windows
Get-Content .env | Select-String "DATABASE_URL"

# Should show: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vaultline
```

---

## 🗄️ Step 4: Initialize Database

The database tables are created automatically on first startup, but you can also create them manually:

```powershell
# Option 1: Automatic (happens on startup)
# Just start the server and it will create tables

# Option 2: Manual using Alembic
alembic upgrade head
```

---

## 🎯 Step 5: Start the Server

```powershell
# Make sure you're in backend-integration directory
cd backend-integration

# Activate virtual environment (if not already active)
.\.venv\Scripts\activate

# Start the development server
uvicorn app.main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

---

## 🌐 Step 6: Access the API

### Swagger UI (Interactive Documentation)
- **URL:** http://localhost:8000/docs
- Try endpoints here!

### ReDoc (Alternative Documentation)
- **URL:** http://localhost:8000/redoc

### Health Check
- **URL:** http://localhost:8000/health
- Should return: `{"status": "healthy", "database": "connected", "api": "operational"}`

---

## 🧪 Testing the API

### Using Swagger UI (Easiest)

1. Open http://localhost:8000/docs
2. Click on **POST /api/auth/register**
3. Click "Try it out"
4. Enter test data:
   ```json
   {
     "email": "test@example.com",
     "authProofB64": "dGVzdF9hdXRoX3Byb29m",
     "publicKeyB64": "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0K",
     "wrappedPrivateKeyB64": "aGFzaGVkX3ByaXZhdGU="
   }
   ```
5. Click "Execute"
6. You should get a 201 response with user data and JWT token

### Using curl

```powershell
# Register
$body = @{
    email = "test@example.com"
    authProofB64 = "dGVzdF9hdXRoX3Byb29m"
    publicKeyB64 = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0K"
    wrappedPrivateKeyB64 = "aGFzaGVkX3ByaXZhdGU="
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:8000/api/auth/register `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

## 📝 Full API Testing Flow

1. **Register User**
   ```
   POST /api/auth/register
   Body: email, authProofB64, publicKeyB64, wrappedPrivateKeyB64
   Returns: token, user info, salt
   ```

2. **Fetch Salt (for login)**
   ```
   POST /api/auth/fetch-salt
   Body: email
   Returns: salt
   ```

3. **Login**
   ```
   POST /api/auth/login
   Body: email, authProofB64
   Returns: token, user info
   ```

4. **Upload File**
   ```
   POST /api/files/upload
   Headers: Authorization: Bearer <token>
   Body: multipart/form-data with ciphertext, metadata, wrappedKey
   Returns: file ID
   ```

5. **List Files**
   ```
   GET /api/files
   Headers: Authorization: Bearer <token>
   Returns: all accessible files
   ```

6. **Download File**
   ```
   GET /api/files/{file_id}/download
   Headers: Authorization: Bearer <token>
   Returns: encrypted file with metadata in headers
   ```

7. **Share File**
   ```
   POST /api/sharing/share
   Headers: Authorization: Bearer <token>
   Body: fileId, recipientEmail, wrappedKeyForRecipient
   Returns: share confirmation
   ```

---

## 🔍 Troubleshooting

### Issue: "Database connection failed"

**Solution 1: PostgreSQL not running**
```powershell
# Check if PostgreSQL is running
docker ps | findstr postgres

# If not, start it
docker start vaultline-db
```

**Solution 2: Wrong DATABASE_URL**
```powershell
# Check .env file
cat .env | findstr DATABASE_URL

# Should be: postgresql://postgres:postgres@localhost:5432/vaultline
```

### Issue: "ModuleNotFoundError: No module named 'fastapi'"

**Solution:**
```powershell
# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: "Port 8000 already in use"

**Solution:**
```powershell
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <PID> /F

# Or use a different port
uvicorn app.main:app --port 8001
```

### Issue: "CORS error" in frontend

**Solution:**
Check `CORS_ORIGINS` in `.env`:
```
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

If using different port, add it!

---

## 📊 File Structure

```
backend-integration/
├── app/
│   ├── routers/          # API endpoints (auth, files, sharing)
│   ├── schemas/          # Request/response validation
│   ├── utils/            # Helper functions (auth, JWT)
│   ├── config.py         # Configuration
│   ├── database.py       # Database setup
│   ├── models.py         # Database models
│   └── main.py           # FastAPI app
├── alembic/              # Database migrations
├── uploads/              # Encrypted file storage
├── .env                  # Environment variables
├── requirements.txt      # Dependencies
├── alembic.ini          # Alembic config
└── README.md            # Full documentation
```

---

## 🔐 Security Notes

### Development
- ✅ Using default credentials (OK for local dev)
- ✅ DEBUG=true (helps debugging)
- ✅ Plain HTTP (localhost only)

### Production Deployment
- ❌ Change `SECRET_KEY` in `.env`
- ❌ Set `DEBUG=false`
- ❌ Use HTTPS only
- ❌ Use strong database passwords
- ❌ Restrict `CORS_ORIGINS` to your domain
- ❌ Use environment-specific `.env` files

---

## 📚 Additional Resources

- **Full README:** `README.md`
- **Learning Guide:** `LEARNING_GUIDE.md`
- **Implementation Details:** `IMPLEMENTATION_SUMMARY.md`
- **Migration Guide:** `alembic/README`
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **API Docs (Swagger):** http://localhost:8000/docs

---

## ✅ Verification Checklist

After startup, verify everything works:

- [ ] Server running without errors
- [ ] http://localhost:8000/docs accessible
- [ ] Health check passes: http://localhost:8000/health
- [ ] Database connected (check logs)
- [ ] Can register new user (test in Swagger)
- [ ] Can login (test in Swagger)
- [ ] Can upload file (test in Swagger)
- [ ] Can list files (test in Swagger)

---

## 🎉 You're Ready!

The backend is fully functional and ready for use. Now you can:

1. ✅ Test endpoints in Swagger UI
2. ✅ Connect the frontend
3. ✅ Deploy to production
4. ✅ Scale and monitor

---

## 🆘 Need Help?

1. Check the **logs** in console - they're very informative
2. Check `ERROR: ` lines first
3. Search error message in README or LEARNING_GUIDE
4. Check `alembic/README` for migration issues
5. Try restarting the server

---

**Happy coding! 🚀**
