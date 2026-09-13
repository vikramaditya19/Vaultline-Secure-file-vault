"""
auth.py - Authentication Router (SIMPLIFIED)

Implements all authentication endpoints matching the mock service exactly:
- POST /register: Create new user account
- POST /fetch-salt: Get salt for login (step 1)
- POST /login: Authenticate user (step 2)
- POST /logout: Logout
- POST /lookup-public-key: Get user's public key for sharing

Security Model (SIMPLIFIED - IN-MEMORY FOR NOW):
================================================
For now: in-memory dict, authProofB64 direct comparison (no hashing)
The client already sends authProofB64 (pre-hashed with PBKDF2 client-side)
Server stores it as-is and compares directly

Later: Can migrate to SQLite or Postgres with same logic
"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    FetchSaltRequest,
    FetchSaltResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    LookupPublicKeyRequest,
    LookupPublicKeyResponse,
    UserPublic,
)
from app.utils.auth_utils import generate_salt
import uuid


# ==================== IN-MEMORY STORE ====================
# Temporary in-memory store (matches mock service)
# Key: email, Value: user dict with {id, email, salt, authProofB64, publicKeyB64, wrappedPrivateKeyB64}
_users_db = {}


def _next_id(prefix: str) -> str:
    """Generate unique ID"""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# Create router with prefix and tags
router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)


# ==================== REGISTER ENDPOINT ====================

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_user(body: RegisterRequest):
    """
    Register a new user account.
    
    Matches mock service behavior exactly.
    Stores authProofB64 as-is (no hashing - client already did PBKDF2).
    """
    
    # Check if email already exists
    if body.email in _users_db:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )
    
    # Generate salt (for client to re-derive authProof during login)
    salt = generate_salt()
    
    # Create user
    user_id = _next_id("user")
    _users_db[body.email] = {
        "id": user_id,
        "email": body.email,
        "salt": salt,
        "authProofB64": body.authProofB64,
        "publicKeyB64": body.publicKeyB64,
        "wrappedPrivateKeyB64": body.wrappedPrivateKeyB64,
    }
    
    # Return response matching mock service
    return RegisterResponse(
        user=UserPublic(id=user_id, email=body.email),
        token=f"mock.{user_id}.token",
        wrappedPrivateKeyB64=body.wrappedPrivateKeyB64,
        salt=salt,
    )


# ==================== FETCH SALT ENDPOINT ====================

@router.post("/fetch-salt", response_model=FetchSaltResponse)
def fetch_salt(body: FetchSaltRequest):
    """
    Fetch salt for a user (Login Step 1).
    
    Matches mock service behavior exactly.
    """
    
    if body.email not in _users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for this email."
        )
    
    user = _users_db[body.email]
    return FetchSaltResponse(salt=user["salt"])


# ==================== LOGIN ENDPOINT ====================

@router.post("/login", response_model=LoginResponse)
def login_user(body: LoginRequest):
    """
    Authenticate user and issue token (Login Step 2).
    
    Matches mock service behavior exactly.
    Direct authProofB64 comparison (no hashing).
    """
    
    if body.email not in _users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    user = _users_db[body.email]
    
    # Direct comparison (authProofB64 is already PBKDF2-hashed client-side)
    if user["authProofB64"] != body.authProofB64:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    # Return response matching mock service
    return LoginResponse(
        user=UserPublic(id=user["id"], email=user["email"]),
        token=f"mock.{user['id']}.token",
        wrappedPrivateKeyB64=user["wrappedPrivateKeyB64"],
        salt=user["salt"],
    )


# ==================== LOGOUT ENDPOINT ====================

@router.post("/logout", response_model=LogoutResponse)
def logout_user():
    """
    Logout endpoint.
    
    For now, just returns success (in-memory, no session state).
    Later: can invalidate JWT tokens.
    """
    return LogoutResponse(success=True)


# ==================== LOOKUP PUBLIC KEY ENDPOINT ====================

@router.post("/lookup-public-key", response_model=LookupPublicKeyResponse)
def lookup_public_key(body: LookupPublicKeyRequest):
    """
    Lookup a user's public key by email.
    
    Used when sharing files - need recipient's public key to wrap the DEK.
    Matches mock service behavior exactly.
    """
    
    if body.email not in _users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with that email."
        )
    
    user = _users_db[body.email]
    return LookupPublicKeyResponse(
        userId=user["id"],
        email=user["email"],
        publicKeyB64=user["publicKeyB64"],
    )
