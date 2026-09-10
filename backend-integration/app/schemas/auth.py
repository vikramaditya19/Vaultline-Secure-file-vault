"""
auth.py - Authentication Schemas

Pydantic schemas for authentication endpoints.
These define the EXACT contract between frontend and backend.

Key Principles:
===============
1. Request schemas: What the frontend SENDS
2. Response schemas: What the backend RETURNS
3. Field names MUST match what frontend expects (check mockAuthService.js)
4. All crypto fields use base64 encoding for JSON transport

Security Note:
==============
- We NEVER receive the raw password from the frontend
- We receive authProofB64 (already hashed client-side via PBKDF2)
- We hash it AGAIN with bcrypt before storing
- This dual-hashing ensures server can't decrypt files even with DB access
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


# ==================== SHARED MODELS ====================

class UserPublic(BaseModel):
    """
    Public user information (safe to expose).
    Never includes passwords, hashed auth proofs, or private keys.
    """
    id: str = Field(..., description="Unique user identifier (UUID)")
    email: str = Field(..., description="User's email address")
    
    class Config:
        from_attributes = True  # Allow creating from SQLAlchemy models


# ==================== REGISTER ENDPOINT ====================

class RegisterRequest(BaseModel):
    """
    Registration request from frontend.
    
    Flow:
    1. User enters email + password
    2. Frontend generates salt, derives authProof via PBKDF2
    3. Frontend generates RSA keypair
    4. Frontend wraps private key with wrapKey (derived from password)
    5. Frontend sends this request (NEVER the raw password!)
    """
    email: EmailStr = Field(..., description="User's email address", example="user@example.com")
    authProofB64: str = Field(
        ..., 
        description="Base64-encoded auth proof from PBKDF2 (client-side)",
        min_length=32
    )
    publicKeyB64: str = Field(
        ..., 
        description="Base64-encoded RSA-OAEP public key (SPKI format)",
        min_length=100
    )
    wrappedPrivateKeyB64: str = Field(
        ..., 
        description="Base64-encoded wrapped (encrypted) private key",
        min_length=100
    )


class RegisterResponse(BaseModel):
    """
    Response after successful registration.
    Includes everything needed for the client to start using the app.
    """
    user: UserPublic = Field(..., description="Public user information")
    token: str = Field(..., description="JWT access token")
    wrappedPrivateKeyB64: str = Field(..., description="Wrapped private key (stored server-side)")
    salt: str = Field(..., description="Salt for PBKDF2 (used for future logins)")


# ==================== FETCH SALT ENDPOINT ====================

class FetchSaltRequest(BaseModel):
    """
    Request to fetch salt for a user.
    This is Step 1 of the login flow.
    
    Why separate endpoint?
    - Client needs salt BEFORE deriving keys
    - Can't send authProof without salt
    """
    email: EmailStr = Field(..., description="User's email address")


class FetchSaltResponse(BaseModel):
    """Response containing the user's salt."""
    salt: str = Field(..., description="Base64-encoded salt for PBKDF2", min_length=16)


# ==================== LOGIN ENDPOINT ====================

class LoginRequest(BaseModel):
    """
    Login request from frontend.
    This is Step 2 of the login flow (after fetching salt).
    
    Flow:
    1. Frontend calls /fetch-salt to get user's salt
    2. Frontend derives authProof using password + salt
    3. Frontend sends this request
    4. Backend verifies authProof against stored hash
    """
    email: EmailStr = Field(..., description="User's email address")
    authProofB64: str = Field(
        ..., 
        description="Base64-encoded auth proof (must match what was registered)",
        min_length=32
    )


class LoginResponse(BaseModel):
    """
    Response after successful login.
    Same structure as RegisterResponse - provides everything for the session.
    """
    user: UserPublic = Field(..., description="Public user information")
    token: str = Field(..., description="JWT access token")
    wrappedPrivateKeyB64: str = Field(..., description="User's wrapped private key")
    salt: str = Field(..., description="User's salt (for re-derivation if needed)")


# ==================== LOGOUT ENDPOINT ====================

class LogoutResponse(BaseModel):
    """
    Response after logout.
    
    Note: With JWT, logout is mostly client-side (delete token).
    This endpoint exists for consistency and potential future use
    (e.g., token blacklisting, session tracking).
    """
    success: bool = Field(default=True, description="Always true if endpoint reached")


# ==================== LOOKUP PUBLIC KEY ENDPOINT ====================

class LookupPublicKeyRequest(BaseModel):
    """
    Request to look up a user's public key by email.
    
    Used for file sharing:
    - User A wants to share file with User B
    - User A needs User B's public key to wrap the file key
    - User A calls this endpoint to get B's public key
    """
    email: EmailStr = Field(..., description="Email of user to look up")


class LookupPublicKeyResponse(BaseModel):
    """
    Response containing user's public key.
    
    Public keys are safe to expose - they can only ENCRYPT, not decrypt.
    """
    userId: str = Field(..., description="User's unique identifier")
    email: str = Field(..., description="User's email address")
    publicKeyB64: str = Field(..., description="Base64-encoded RSA public key")


# ==================== JWT TOKEN PAYLOAD ====================

class TokenData(BaseModel):
    """
    Data stored inside JWT tokens.
    
    This is NOT sent/received directly - it's encoded in the JWT.
    Used internally for token generation and verification.
    """
    user_id: str = Field(..., description="User ID from token")
    email: str = Field(..., description="Email from token")
    exp: Optional[int] = Field(None, description="Expiration timestamp")
    
    
# ==================== ERROR RESPONSES ====================

class ErrorResponse(BaseModel):
    """Standard error response format."""
    detail: str = Field(..., description="Error message", example="User not found")
    status_code: int = Field(..., description="HTTP status code", example=404)
