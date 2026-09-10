# 🎓 Complete Backend Learning Guide

## Step-by-Step Tutorial to Build the Vaultline Backend

This guide will teach you how to build a production-ready FastAPI backend from scratch. Follow each step, understand the concepts, and implement the code yourself.

---

## 📚 What You'll Learn

1. ✅ FastAPI framework basics
2. ✅ SQLAlchemy ORM and database models
3. ✅ Pydantic schemas for validation
4. ✅ JWT authentication
5. ✅ Password hashing with bcrypt
6. ✅ File upload/download handling
7. ✅ Database migrations with Alembic
8. ✅ CORS and middleware
9. ✅ API documentation (Swagger/OpenAPI)
10. ✅ Zero-knowledge encryption architecture

---

## 🎯 Learning Path Overview

```
Phase 1: Foundation (30 mins)
├─ Setup project structure
├─ Install dependencies
└─ Basic configuration

Phase 2: Database (1 hour)
├─ Design database schema
├─ Create SQLAlchemy models
├─ Setup database connection
└─ Database migrations

Phase 3: Authentication (1.5 hours)
├─ Understand password security
├─ Implement JWT tokens
├─ Build auth endpoints
└─ Test authentication flow

Phase 4: File Operations (2 hours)
├─ File upload with encryption
├─ File listing and details
├─ File download (streaming)
└─ File deletion

Phase 5: Sharing (1 hour)
├─ Envelope encryption concept
├─ Share endpoint
├─ Revoke endpoint
└─ List shares

Phase 6: Integration (30 mins)
├─ Wire all routers
├─ Setup CORS
├─ Error handling
└─ Testing
```

**Total Time: ~6-7 hours** (with breaks!)

---

## 📖 PHASE 1: Foundation (30 minutes)

### Step 1.1: Project Structure

Create this directory structure:

```
backend-integration/
├── app/
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── files.py
│   │   └── sharing.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── files.py
│   │   └── sharing.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── auth_utils.py
│   │   └── jwt_utils.py
│   ├── __init__.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   └── main.py
├── alembic/
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── uploads/
├── requirements.txt
├── alembic.ini
├── .env.example
└── README.md
```

**💡 Learning Tip:** Each directory has a specific purpose:
- `routers/`: API endpoints grouped by feature
- `schemas/`: Request/response validation (Pydantic)
- `utils/`: Reusable helper functions
- `models.py`: Database tables (SQLAlchemy)
- `main.py`: Application entry point

### Step 1.2: requirements.txt

**📝 Task:** Create `requirements.txt` with these dependencies:

```txt
# Core Framework
fastapi==0.115.0
uvicorn[standard]==0.32.0

# Database
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
alembic==1.13.3

# Data Validation
pydantic==2.9.2
pydantic-settings==2.6.0

# Authentication & Security
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==0.0.12

# Utilities
python-dotenv==1.0.1
aiofiles==24.1.0
```

**📚 What each dependency does:**
- `fastapi`: Web framework
- `uvicorn`: ASGI server to run FastAPI
- `sqlalchemy`: ORM for database
- `psycopg2-binary`: PostgreSQL adapter
- `alembic`: Database migrations
- `pydantic`: Data validation
- `passlib`: Password hashing
- `python-jose`: JWT tokens
- `python-multipart`: File uploads
- `aiofiles`: Async file I/O

**🎯 Install:** `pip install -r requirements.txt`

### Step 1.3: Configuration (config.py)

**📝 Task:** Create `app/config.py`

**🎓 Concepts to understand:**
1. **Environment Variables**: Keep secrets out of code
2. **Pydantic Settings**: Type-safe configuration
3. **Default Values**: Sensible defaults for development

**💻 What to implement:**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/vaultline"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # File Storage
    UPLOAD_DIR: Path = Path("uploads")
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100 MB
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    
    # App Info
    APP_NAME: str = "Vaultline Secure File Vault"
    API_VERSION: str = "1.0.0"
    
    class Config:
        env_file = ".env"

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
```

**🔑 Key Learning:**
- Settings loaded from environment or `.env` file
- Type validation automatic (e.g., int, Path, list)
- Single source of truth for config

---

## 📖 PHASE 2: Database (1 hour)

### Step 2.1: Database Models (models.py)

**📝 Task:** Create `app/models.py` with 3 models: User, File, Share

**🎓 Concepts:**
1. **ORM (Object-Relational Mapping)**: Python classes → database tables
2. **Relationships**: One-to-many, many-to-many
3. **Foreign Keys**: Link tables together
4. **Cascading Deletes**: When user deleted, files deleted too

**💻 User Model:**
```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_auth_proof = Column(String(255), nullable=False)
    salt = Column(String(64), nullable=False)
    public_key = Column(Text, nullable=False)
    wrapped_private_key = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owned_files = relationship("File", back_populates="owner", cascade="all, delete-orphan")
    shared_files = relationship("Share", back_populates="recipient", cascade="all, delete-orphan")
```

**🔑 Key Fields:**
- `hashed_auth_proof`: bcrypt(PBKDF2(password)) - double hashing!
- `salt`: For client-side PBKDF2
- `public_key`: For file sharing (RSA)
- `wrapped_private_key`: Encrypted with user's password

**💻 File Model:** (Similar structure, add yourself!)
**💻 Share Model:** (Junction table for many-to-many)

**📚 Read More:**
- SQLAlchemy relationships: https://docs.sqlalchemy.org/en/20/orm/basic_relationships.html

### Step 2.2: Database Connection (database.py)

**🎓 Concepts:**
1. **Engine**: Connection pool to database
2. **Session**: "Workspace" for database operations
3. **Dependency Injection**: FastAPI provides session to routes

**💻 Key Code:**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Test connections before use
    pool_size=10,        # Keep 10 connections ready
    max_overflow=20      # Allow 20 more if needed
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**🔑 Understanding:**
- `pool_pre_ping`: Prevents "connection lost" errors
- `yield`: Gives session to route, then closes after
- Used with `Depends(get_db)` in routes

---

## 📖 PHASE 3: Authentication (1.5 hours)

### Step 3.1: Password Hashing (utils/auth_utils.py)

**🎓 Security Architecture:**

```
User's Password: "MyPassword123"
        ↓ (Client-side PBKDF2 - 600k iterations)
authProofB64: "dGVzdF9hdXRoX3Byb29m..."
        ↓ (Sent to server)
        ↓ (Server-side bcrypt - 12 rounds)
hashed_auth_proof: "$2b$12$EixZaYVK1fsbw..."
        ↓ (Stored in database)
```

**Why double hashing?**
- Client PBKDF2: Password never sent over network
- Server bcrypt: Even with DB access, can't decrypt files
- This is Bitwarden's model!

**💻 Implement:**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_auth_proof(auth_proof_b64: str) -> str:
    return pwd_context.hash(auth_proof_b64)

def verify_auth_proof(auth_proof_b64: str, hashed: str) -> bool:
    return pwd_context.verify(auth_proof_b64, hashed)

def generate_salt() -> str:
    return secrets.token_hex(16)
```

### Step 3.2: JWT Tokens (utils/jwt_utils.py)

**🎓 What is JWT?**

JWT = JSON Web Token = header.payload.signature

Example:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9  ← Header
.eyJ1c2VyX2lkIjoiMTIzIiwiZXhwIjoxNjk...  ← Payload (user data)
.Xm8B6pQ-9R7KVBr6H_3M2g4nF8j...          ← Signature
```

**Payload contains:**
- user_id
- email
- exp (expiration)

**Signature prevents tampering:**
- HMAC-SHA256(header + payload, SECRET_KEY)
- If someone changes payload, signature won't match

**💻 Implement:**
```python
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_token(token: str) -> TokenData:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    user_id = payload.get("user_id")
    email = payload.get("email")
    return TokenData(user_id=user_id, email=email)
```

### Step 3.3: Auth Router (routers/auth.py)

**📝 Endpoints to implement:**

1. **POST /auth/register**
   - Receive: email, authProofB64, publicKeyB64, wrappedPrivateKeyB64
   - Hash authProofB64 with bcrypt
   - Save user to database
   - Return JWT token

2. **POST /auth/fetch-salt**
   - Receive: email
   - Return: salt for that user

3. **POST /auth/login**
   - Receive: email, authProofB64
   - Verify authProofB64
   - Return JWT token + wrappedPrivateKey

4. **POST /auth/lookup-public-key**
   - Receive: email
   - Return: user's public key (for sharing)

**💻 Example structure:**
```python
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=RegisterResponse)
def register_user(body: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email exists
    # Hash auth proof
    # Create user
    # Generate token
    # Return response
    pass
```

**🎯 Test:**
```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "authProofB64": "dGVzdF9hdXRoX3Byb29m",
    "publicKeyB64": "cHVibGljX2tleQ==",
    "wrappedPrivateKeyB64": "d3JhcHBlZF9rZXk="
  }'
```

---

## 📖 PHASE 4: File Operations (2 hours)

### Step 4.1: File Upload (routers/files.py)

**🎓 Concept:** Multipart Form Data

File uploads use `Content-Type: multipart/form-data`, not JSON!

```
POST /api/files/upload
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="ciphertext"; filename="file.enc"

[BINARY FILE CONTENT HERE]
------WebKitFormBoundary
Content-Disposition: form-data; name="encryptedMetadata"

base64-encoded-metadata-here
------WebKitFormBoundary--
```

**💻 Implement:**
```python
from fastapi import UploadFile, File, Form

@router.post("/upload")
async def upload_file(
    ciphertext: UploadFile = File(...),
    encryptedMetadata: str = Form(...),
    wrappedKey: str = Form(...),
    sizeBytes: int = Form(...),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Read file content
    content = await ciphertext.read()
    
    # Create file record in database
    new_file = File(owner_id=current_user.user_id, ...)
    db.add(new_file)
    db.commit()
    
    # Save to disk
    path = f"uploads/{new_file.id}.enc"
    async with aiofiles.open(path, 'wb') as f:
        await f.write(content)
    
    return FileUploadResponse(id=new_file.id, ...)
```

**🔑 Key Points:**
- `UploadFile`: FastAPI handles binary data
- `async`/`await`: Non-blocking I/O
- Save to disk AFTER database (get the ID first)

### Step 4.2: File Download (Streaming)

**🎓 Why streaming?**
- Large files don't fit in memory
- Efficient for 100MB+ files
- Client receives data as it's read

**💻 Implement:**
```python
from fastapi.responses import StreamingResponse

@router.get("/{file_id}/download")
async def download_file(file_id: str, ...):
    # Check access
    # ...
    
    async def file_stream():
        async with aiofiles.open(file.ciphertext_path, 'rb') as f:
            while chunk := await f.read(8192):  # 8KB chunks
                yield chunk
    
    return StreamingResponse(
        file_stream(),
        media_type="application/octet-stream",
        headers={
            "X-Encrypted-Metadata": file.encrypted_metadata,
            "X-Wrapped-Key": wrapped_key,
        }
    )
```

---

## 📖 PHASE 5: Sharing (1 hour)

### Step 5.1: Understanding Envelope Encryption

**🎓 The Magic:**

```
File: report.pdf (5 MB)
  ↓ Encrypt with DEK_file (AES-256-GCM)
Ciphertext: report.pdf.enc (5 MB)

Owner (Alice):
  DEK_file → Wrap with Alice's RSA public key
  → wrapped_key_alice (4 KB)

To share with Bob:
  1. Frontend unwraps DEK_file with Alice's private key
  2. Frontend wraps DEK_file with Bob's RSA public key
  3. Server stores: Share(file_id, bob_id, wrapped_key_bob)

Bob downloads:
  1. Gets same ciphertext (5 MB)
  2. Gets his wrapped_key_bob (4 KB)
  3. Unwraps with his private key → DEK_file
  4. Decrypts ciphertext → report.pdf
```

**Key insight:** File content (5 MB) never moves! Only tiny keys (~4 KB) are created!

### Step 5.2: Share Endpoint

**💻 Implement:**
```python
@router.post("/share")
def share_file(body: ShareFileRequest, ...):
    # Find file
    # Check ownership (only owner can share)
    # Find recipient by email
    # Create Share record
    return ShareFileResponse(...)
```

---

## 📖 PHASE 6: Integration (30 mins)

### Step 6.1: Wire Everything (main.py)

**💻 Implement:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, files, sharing

app = FastAPI(title="Vaultline API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Encrypted-Metadata", "X-Wrapped-Key"]  # Important!
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(sharing.router, prefix="/api")

@app.on_event("startup")
async def startup():
    init_db()  # Create tables
```

---

## 🧪 Testing Your Backend

### 1. Start the server
```bash
uvicorn app.main:app --reload
```

### 2. Open Swagger UI
http://localhost:8000/docs

### 3. Test flow
1. Register a user
2. Login (fetch salt, then login)
3. Upload a file
4. List files
5. Download file
6. Share with another user
7. Revoke share

---

## 📚 Learning Resources

### Official Docs
- **FastAPI**: https://fastapi.tiangolo.com/
- **SQLAlchemy**: https://docs.sqlalchemy.org/
- **Pydantic**: https://docs.pydantic.dev/

### Video Tutorials
- **freeCodeCamp FastAPI (19h)**: https://www.youtube.com/watch?v=0sOvCWFmrtA
- **SQLAlchemy Tutorial**: https://www.youtube.com/results?search_query=sqlalchemy+tutorial

### Concepts
- **JWT Authentication**: https://jwt.io/introduction
- **Bcrypt Hashing**: https://en.wikipedia.org/wiki/Bcrypt
- **CORS**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

## 💡 Tips for Learning

1. **Type everything yourself** - Don't copy-paste
2. **Break when stuck** - Take a 10-minute break
3. **Read error messages** - They're helpful!
4. **Use debugger** - Add `import pdb; pdb.set_trace()`
5. **Test frequently** - Don't write too much before testing
6. **Read documentation** - Official docs are your friend
7. **Ask questions** - Use StackOverflow, ChatGPT, etc.

---

## 🎯 Checkpoints

After each phase, you should be able to:

**Phase 1:** ✅ Server starts without errors
**Phase 2:** ✅ Tables created in database
**Phase 3:** ✅ Can register and login
**Phase 4:** ✅ Can upload and download files
**Phase 5:** ✅ Can share files between users
**Phase 6:** ✅ Frontend connects successfully

---

## 🐛 Common Issues & Solutions

### "Module not found"
```bash
pip install -r requirements.txt
```

### "Database connection failed"
```bash
# Start PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres
# Or install PostgreSQL locally
```

### "CORS error"
Add your frontend URL to `CORS_ORIGINS` in config.py

### "Token expired"
Increase `ACCESS_TOKEN_EXPIRE_MINUTES` in config

---

## 🚀 You've Got This!

Building a backend is challenging but rewarding. Take it step by step, understand each concept, and don't rush. You'll learn:

✅ How APIs work
✅ Database design
✅ Authentication & security
✅ File handling
✅ Modern Python practices

**Start with Phase 1 and work your way through. Good luck!** 🎉
