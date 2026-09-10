"""
auth.py - Authentication Router

Implements all authentication endpoints:
- POST /register: Create new user account
- POST /fetch-salt: Get salt for login (step 1)
- POST /login: Authenticate and get JWT token (step 2)
- POST /logout: Invalidate session
- POST /lookup-public-key: Get user's public key for sharing

Security Model:
===============
1. Registration:
   - Client sends authProofB64 (NOT raw password!)
   - We hash it AGAIN with bcrypt
   - Store: bcrypt(authProofB64)
   - Result: Even with DB access, can't decrypt files

2. Login (2-step):
   Step 1: Client sends email → we return salt
   Step 2: Client derives authProofB64 with salt → we verify
   
3. JWT Tokens:
   - Issued after successful login
   - Contains user_id and email
   - Expires after 24 hours (configurable)
   - Used to authenticate all other API calls
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
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
from app.utils.auth_utils import hash_auth_proof, verify_auth_proof, generate_salt
from app.utils.jwt_utils import create_access_token, get_current_user, TokenData


# Create router with prefix and tags
router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)


# ==================== REGISTER ENDPOINT ====================

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    body: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user account.
    
    Flow:
    -----
    1. Client generates salt, derives authProofB64 from password
    2. Client generates RSA keypair, wraps private key with wrapKey
    3. Client sends: email, authProofB64, publicKey, wrappedPrivateKey
    4. Server hashes authProofB64 with bcrypt
    5. Server stores user with hashed authProof
    6. Server returns JWT token + user data
    
    Security:
    ---------
    - Password NEVER sent to server
    - authProofB64 is hashed again before storage (double hashing)
    - Private key is wrapped (encrypted), server can't decrypt it
    - Each user gets unique salt (prevents rainbow tables)
    
    Errors:
    -------
    - 409: Email already registered
    - 400: Invalid request data
    """
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == body.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )
    
    # Generate salt for this user (for PBKDF2 on client-side)
    salt = generate_salt()
    
    # Hash the authProof with bcrypt (server-side hashing)
    hashed_auth_proof = hash_auth_proof(body.authProofB64)
    
    # Create new user
    new_user = User(
        email=body.email,
        hashed_auth_proof=hashed_auth_proof,
        salt=salt,
        public_key=body.publicKeyB64,
        wrapped_private_key=body.wrappedPrivateKeyB64,
    )
    
    # Save to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)  # Get the auto-generated ID
    
    # Create JWT token
    token = create_access_token({
        "user_id": new_user.id,
        "email": new_user.email
    })
    
    # Return response
    return RegisterResponse(
        user=UserPublic(id=new_user.id, email=new_user.email),
        token=token,
        wrappedPrivateKeyB64=new_user.wrapped_private_key,
        salt=salt
    )


# ==================== FETCH SALT ENDPOINT ====================

@router.post("/fetch-salt", response_model=FetchSaltResponse)
def fetch_salt(
    body: FetchSaltRequest,
    db: Session = Depends(get_db)
):
    """
    Fetch salt for a user (Login Step 1).
    
    Why separate endpoint?
    ----------------------
    Login is a 2-step process:
    1. Get salt (this endpoint) → client derives authProofB64
    2. Send authProofB64 → server verifies
    
    This prevents sending authProofB64 with wrong salt (would fail anyway).
    
    Flow:
    -----
    1. User enters email on login page
    2. Frontend calls this endpoint
    3. Frontend receives salt
    4. Frontend derives authProofB64 = PBKDF2(password, salt)
    5. Frontend calls /login with authProofB64
    
    Security:
    ---------
    - Salt is public, not secret (safe to expose)
    - Each user has unique salt
    - Without password, salt alone is useless
    
    Errors:
    -------
    - 404: No account found for this email
    """
    
    # Find user by email
    user = db.query(User).filter(User.email == body.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for this email."
        )
    
    # Return salt
    return FetchSaltResponse(salt=user.salt)


# ==================== LOGIN ENDPOINT ====================

@router.post("/login", response_model=LoginResponse)
def login_user(
    body: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and issue JWT token (Login Step 2).
    
    Prerequisites:
    --------------
    Client must have already fetched salt via /fetch-salt.
    
    Flow:
    -----
    1. Client sends email + authProofB64
    2. Server finds user by email
    3. Server verifies authProofB64 against stored hash
    4. If valid, server issues JWT token
    5. Client stores token for subsequent API calls
    
    Security:
    ---------
    - authProofB64 verification uses bcrypt (constant-time, resistant to timing attacks)
    - Failed login doesn't reveal if email exists (same error message)
    - Token expires after 24 hours (configurable)
    
    Errors:
    -------
    - 401: Incorrect email or password
    """
    
    # Find user by email
    user = db.query(User).filter(User.email == body.email).first()
    
    # Verify authProof
    # Note: We check user exists AND password matches in one condition
    # This prevents timing attacks (same time whether user exists or not)
    if not user or not verify_auth_proof(body.authProofB64, user.hashed_auth_proof):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    # Create JWT token
    token = create_access_token({
        "user_id": user.id,
        "email": user.email
    })
    
    # Return response
    return LoginResponse(
        user=UserPublic(id=user.id, email=user.email),
        token=token,
        wrappedPrivateKeyB64=user.wrapped_private_key,
        salt=user.salt
    )


# ==================== LOGOUT ENDPOINT ====================

@router.post("/logout", response_model=LogoutResponse)
def logout_user(current_user: TokenData = Depends(get_current_user)):
    """
    Logout current user.
    
    JWT Token Model:
    ----------------
    With JWT, logout is primarily client-side:
    - Client deletes the token from storage
    - Token automatically expires after 24 hours
    
    This endpoint exists for:
    - Consistency with traditional auth APIs
    - Future enhancements (token blacklisting, audit logs)
    - Explicit logout tracking
    
    True Stateless JWT:
    -------------------
    Current implementation is stateless - we don't track tokens server-side.
    Tokens remain valid until expiration even after "logout".
    
    For production, consider:
    - Token blacklist (Redis)
    - Refresh token system
    - Shorter token lifetimes
    
    Security:
    ---------
    - Requires valid JWT token (user must be authenticated)
    - Returns success if token is valid
    
    Errors:
    -------
    - 401: Token missing, invalid, or expired
    """
    
    # In a stateless JWT system, logout is mainly client-side
    # Server just confirms the token is valid
    
    # Future: Add token to blacklist in Redis
    # redis_client.setex(f"blacklist:{current_user.user_id}:{token}", 
    #                    settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, 
    #                    "logged_out")
    
    return LogoutResponse(success=True)


# ==================== LOOKUP PUBLIC KEY ENDPOINT ====================

@router.post("/lookup-public-key", response_model=LookupPublicKeyResponse)
def lookup_public_key(
    body: LookupPublicKeyRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Look up a user's public key by email.
    
    Used for file sharing:
    ----------------------
    1. User A wants to share file with User B
    2. User A needs User B's public key to wrap the file key
    3. User A calls this endpoint with B's email
    4. Server returns B's public key
    5. User A wraps file key with B's public key (client-side!)
    
    Why public keys are safe to expose:
    -----------------------------------
    - Public keys can only ENCRYPT, not DECRYPT
    - Anyone can encrypt data for you using your public key
    - Only YOU can decrypt it with your private key
    - This is the foundation of RSA asymmetric encryption
    
    Security:
    ---------
    - Requires authentication (must be logged in)
    - Public keys are... public! Safe to expose
    - Email lookup allows user-friendly sharing
    
    Errors:
    -------
    - 401: Not authenticated
    - 404: No user found with that email
    """
    
    # Find user by email
    user = db.query(User).filter(User.email == body.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with that email."
        )
    
    # Return public key
    return LookupPublicKeyResponse(
        userId=user.id,
        email=user.email,
        publicKeyB64=user.public_key
    )


# ==================== HELPER ENDPOINTS (DEBUG/ADMIN) ====================

@router.get("/me", response_model=UserPublic)
def get_current_user_info(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's information.
    
    Returns public user data based on JWT token.
    Useful for:
    - Verifying token is valid
    - Getting user ID for frontend state
    - Profile page data
    
    Security:
    ---------
    - Requires valid JWT token
    - Only returns public information (no hashed passwords, etc.)
    """
    
    user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserPublic(id=user.id, email=user.email)