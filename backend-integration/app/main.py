"""
main.py - FastAPI Application Entry Point

This is the main application file that:
1. Creates the FastAPI app instance
2. Configures CORS (Cross-Origin Resource Sharing)
3. Includes all API routers (auth, files, sharing)
4. Sets up database initialization
5. Provides health check and documentation endpoints

Application Structure:
======================
/api/auth/*          → Authentication endpoints
/api/files/*         → File operations
/api/sharing/*       → File sharing
/docs                → Interactive API documentation (Swagger UI)
/redoc               → Alternative API documentation (ReDoc)
/                    → Health check

Security Middleware:
====================
- CORS: Controls which domains can access the API
- Size limits: Prevents huge requests
- Timeout: Prevents long-running requests

Database:
=========
- Initialized on startup
- Connection pool managed by SQLAlchemy
- Automatic session cleanup via dependency injection
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import pathlib
import time

# Import configuration
from app.config import settings

# Import database initialization
from app.database import init_db, test_connection

# Import routers
from app.routers import auth, files, sharing


# ==================== CREATE APP ====================

app = FastAPI(
    title=settings.APP_NAME,
    description="""
    **Vaultline Secure File Vault API**
    
    A zero-knowledge encrypted file storage and sharing system.
    
    ## Security Features
    
    * 🔐 End-to-end encryption (client-side only)
    * 🔑 RSA-OAEP + AES-256-GCM encryption
    * 🚫 Server never sees plaintext files or filenames
    * 🔒 Double-hashed passwords (PBKDF2 + bcrypt)
    * 🎫 JWT authentication
    * 🤝 Secure file sharing via wrapped keys
    
    ## Authentication Flow
    
    1. **Register**: Create account with encrypted keys
    2. **Fetch Salt**: Get salt for login (step 1)
    3. **Login**: Authenticate and receive JWT token (step 2)
    4. **Use Token**: Include in Authorization header for all requests
    
    ## File Operations
    
    1. **Upload**: Encrypt file client-side, upload ciphertext
    2. **List**: View owned and shared files
    3. **Download**: Retrieve encrypted file, decrypt client-side
    4. **Share**: Share with other users via key wrapping
    5. **Delete**: Remove file (owner only)
    
    ## Architecture
    
    * Frontend: React + Vite + Web Crypto API
    * Backend: FastAPI + PostgreSQL
    * Encryption: All done client-side in browser
    * Storage: Encrypted blobs on disk
    """,
    version=settings.API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# ==================== CORS MIDDLEWARE ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,     # From config (localhost:5173 in dev)
    allow_credentials=True,                   # Allow cookies/auth headers
    allow_methods=["*"],                      # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],                      # Allow all headers
    expose_headers=[                          # Headers that frontend can read
        "X-Encrypted-Metadata",
        "X-Wrapped-Key",
        "X-File-Id",
        "Content-Disposition",
    ],
)

"""
CORS Explanation:
=================
CORS (Cross-Origin Resource Sharing) controls which domains can access our API.

Without CORS:
- Frontend at localhost:5173 tries to call API at localhost:8000
- Browser blocks the request (security measure)
- Error: "No 'Access-Control-Allow-Origin' header"

With CORS:
- We tell browser: "localhost:5173 is allowed"
- Browser allows the request
- API responses include CORS headers

Production Note:
- Add your production domain to settings.CORS_ORIGINS
- Remove localhost origins in production
- Consider more restrictive settings
"""


# ==================== MIDDLEWARE ====================

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """
    Measure request processing time.
    Adds X-Process-Time header to all responses.
    Useful for performance monitoring.
    """
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response


@app.middleware("http")
async def catch_errors_middleware(request: Request, call_next):
    """
    Global error handler.
    Catches unexpected errors and returns JSON instead of HTML.
    """
    try:
        return await call_next(request)
    except Exception as e:
        # Log the error (in production, use proper logging)
        print(f"Unexpected error: {e}")
        
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "type": "server_error"
            }
        )


# ==================== INCLUDE ROUTERS ====================

# Mount all API routers under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(sharing.router, prefix="/api")

"""
Router Structure:
=================
/api/auth/register           → Register new user
/api/auth/fetch-salt         → Get salt for login
/api/auth/login              → Authenticate
/api/auth/logout             → Logout
/api/auth/lookup-public-key  → Get user's public key
/api/auth/me                 → Get current user info

/api/files/upload            → Upload encrypted file
/api/files                   → List files
/api/files/{id}              → Get file details
/api/files/{id}/download     → Download file
/api/files/{id}              → Delete file (DELETE)

/api/sharing/share           → Share file with user
/api/sharing/{file_id}       → List shares for file
/api/sharing/revoke          → Revoke share
/api/sharing/shared-with-me  → Files shared with me
"""


# ==================== ROOT ENDPOINTS ====================

@app.get("/")
def root():
    """
    Health check endpoint.
    Returns basic API information.
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.API_VERSION,
        "status": "operational",
        "docs": "/docs",
        "message": "Vaultline Secure File Vault API is running"
    }


@app.get("/health")
def health_check():
    """
    Detailed health check.
    Verifies database connection.
    """
    db_status = "connected" if test_connection() else "disconnected"
    
    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "api": "operational"
    }


# ==================== STARTUP & SHUTDOWN ====================

@app.on_event("startup")
async def startup_event():
    """
    Run when application starts.
    
    Tasks:
    - Initialize database (create tables)
    - Verify database connection
    - Log startup message
    """
    print("=" * 60)
    print(f"🚀 Starting {settings.APP_NAME}")
    print("=" * 60)
    
    # Test database connection
    print("\n📊 Testing database connection...")
    if test_connection():
        print("✅ Database connection successful")
    else:
        print("❌ Database connection failed!")
        print("⚠️  Make sure PostgreSQL is running and DATABASE_URL is correct")
    
    # Initialize database (create tables)
    print("\n🗄️  Initializing database...")
    try:
        init_db()
        print("✅ Database tables ready")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
    
    # Show configuration
    print("\n⚙️  Configuration:")
    print(f"   - Debug Mode: {settings.DEBUG}")
    print(f"   - Upload Directory: {settings.UPLOAD_DIR}")
    print(f"   - Max File Size: {settings.MAX_FILE_SIZE / 1024 / 1024:.0f} MB")
    print(f"   - Token Expiry: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    print(f"   - CORS Origins: {', '.join(settings.CORS_ORIGINS)}")
    
    print("\n" + "=" * 60)
    print("✅ Application started successfully!")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("=" * 60 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Run when application shuts down.
    
    Tasks:
    - Close database connections
    - Clean up resources
    - Log shutdown message
    """
    print("\n" + "=" * 60)
    print("🛑 Shutting down application...")
    print("=" * 60)
    
    # Database connections are closed automatically by SQLAlchemy
    # No explicit cleanup needed with our current setup
    
    print("✅ Shutdown complete")
    print("=" * 60 + "\n")


# ==================== EXCEPTION HANDLERS ====================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors (e.g., missing fields, wrong types).
    Returns 422 with detailed error information.
    """
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "body": exc.body
        }
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Handle database errors.
    Returns 500 with generic message (don't expose DB details).
    """
    # Log the actual error (in production, use proper logging)
    print(f"Database error: {exc}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Database error occurred",
            "type": "database_error"
        }
    )


# ==================== FRONTEND SERVING (OPTIONAL) ====================

# Serve the built frontend from frontend/dist at the application root (if present).
# This makes the app a single origin in production/dev when you've run a frontend build.
BASE_DIR = pathlib.Path(__file__).resolve().parents[1]
DIST_DIR = BASE_DIR.parent / "dist"  # Fixed typo: fronted → dist

if DIST_DIR.exists():
    from fastapi.staticfiles import StaticFiles
    print(f"📁 Serving frontend from: {DIST_DIR}")
    app.mount("/app", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")


# ==================== DEVELOPMENT ====================

if __name__ == "__main__":
    """
    Run the application directly with Python (for development).
    
    For production, use:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    """
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,  # Auto-reload on code changes in debug mode
        log_level="info"
    )
