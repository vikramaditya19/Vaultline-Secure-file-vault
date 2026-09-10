"""
jwt_utils.py

JWT (JSON Web Token) utilities for authentication.

What is JWT?
============
A JWT is a token that contains user information, signed by the server.
Format: header.payload.signature

Example:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIn0.Xm8... 

Parts:
1. Header: {"alg": "HS256", "typ": "JWT"}
2. Payload: {"user_id": "123", "email": "user@example.com", "exp": 1234567890}
3. Signature: HMAC-SHA256(header + payload, secret_key)

Why JWT?
========
- Stateless: Server doesn't store sessions
- Scalable: No shared session storage needed
- Cross-domain: Works across microservices
- Self-contained: Token includes all user info

Security:
=========
- Signature prevents tampering
- Expiration prevents replay attacks
- Secret key must be kept secure
- Use HTTPS in production (prevents token theft)
"""

from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from app.config import settings
from app.schemas.auth import TokenData
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


# ==================== SECURITY SCHEME ====================

# HTTP Bearer token scheme (Authorization: Bearer <token>)
security = HTTPBearer()

"""
What is HTTPBearer?
- Tells FastAPI to expect: Authorization: Bearer <token>
- Automatically extracts the token from the header
- Returns HTTPException(401) if header is missing
"""


# ==================== TOKEN CREATION ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    The token contains:
    - User ID
    - Email
    - Expiration timestamp
    
    Args:
        data: Dictionary to encode in token (usually {"user_id": "...", "email": "..."})
        expires_delta: How long until token expires (default: from config)
    
    Returns:
        JWT token string
        
    Example:
        token = create_access_token({"user_id": "123", "email": "user@example.com"})
        # Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    
    Usage in routes:
        @router.post("/login")
        def login(credentials):
            user = verify_credentials(credentials)
            token = create_access_token({"user_id": user.id, "email": user.email})
            return {"token": token}
    """
    # Copy data to avoid mutating the original
    to_encode = data.copy()
    
    # Calculate expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default: from config (usually 24 hours)
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add expiration to payload
    to_encode.update({"exp": expire})
    
    # Create JWT token
    encoded_jwt = jwt.encode(
        to_encode,                    # Payload (user data + expiration)
        settings.SECRET_KEY,          # Secret key (for signing)
        algorithm=settings.ALGORITHM  # HS256 (HMAC-SHA256)
    )
    
    return encoded_jwt


# ==================== TOKEN VERIFICATION ====================

def verify_token(token: str) -> TokenData:
    """
    Verify and decode a JWT token.
    
    Checks:
    1. Signature is valid (token not tampered with)
    2. Token hasn't expired
    3. Token structure is correct
    
    Args:
        token: JWT token string
    
    Returns:
        TokenData object with user_id and email
        
    Raises:
        HTTPException(401): If token is invalid, expired, or malformed
        
    Example:
        try:
            token_data = verify_token("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
            print(f"User ID: {token_data.user_id}")
        except HTTPException:
            print("Invalid token!")
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode and verify token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        # Extract user data from payload
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")
        
        # Validate required fields are present
        if user_id is None or email is None:
            raise credentials_exception
        
        # Create TokenData object
        token_data = TokenData(user_id=user_id, email=email)
        
    except JWTError as e:
        # Token is invalid, expired, or tampered with
        print(f"JWT Error: {e}")
        raise credentials_exception
    
    return token_data


# ==================== DEPENDENCY INJECTION ====================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    FastAPI dependency to extract current user from JWT token.
    
    This is used in protected routes to:
    1. Ensure user is authenticated
    2. Get user ID and email from token
    
    Usage in routes:
        @router.get("/files")
        def list_files(current_user: TokenData = Depends(get_current_user)):
            # current_user.user_id is automatically extracted from token!
            files = db.query(File).filter_by(owner_id=current_user.user_id).all()
            return files
    
    How it works:
    1. FastAPI calls security() dependency first
       - Extracts token from Authorization header
       - Returns HTTPAuthorizationCredentials object
    2. Then calls this function with the credentials
       - Verifies the token
       - Returns TokenData with user info
    3. If ANY step fails, returns 401 Unauthorized
    
    Args:
        credentials: Automatically injected by FastAPI from Authorization header
    
    Returns:
        TokenData with user_id and email
        
    Raises:
        HTTPException(401): If token is missing, invalid, or expired
    """
    # credentials.credentials contains the actual token
    # (credentials.scheme contains "Bearer")
    token = credentials.credentials
    
    # Verify and decode token
    return verify_token(token)


# ==================== OPTIONAL AUTHENTICATION ====================

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[TokenData]:
    """
    Optional authentication - doesn't fail if token is missing.
    
    Used for routes that work differently for authenticated vs anonymous users.
    
    Example:
        @router.get("/public-files")
        def list_public_files(current_user: Optional[TokenData] = Depends(get_current_user_optional)):
            if current_user:
                # Show user's private files too
                return get_all_files(current_user.user_id)
            else:
                # Show only public files
                return get_public_files()
    """
    if credentials is None:
        return None
    
    try:
        return verify_token(credentials.credentials)
    except HTTPException:
        return None


# ==================== TOKEN INSPECTION (DEBUG) ====================

def decode_token_without_verification(token: str) -> dict:
    """
    Decode JWT token WITHOUT verifying signature.
    
    ⚠️ WARNING: For debugging only! NEVER use for authentication!
    
    This lets you inspect token contents even if signature is invalid
    or token is expired. Useful for debugging.
    
    Args:
        token: JWT token string
    
    Returns:
        Dictionary with token payload
        
    Example:
        payload = decode_token_without_verification("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        print(f"User ID: {payload['user_id']}")
        print(f"Expires: {payload['exp']}")
    """
    return jwt.decode(
        token,
        options={"verify_signature": False}  # ⚠️ DANGEROUS!
    )


def is_token_expired(token: str) -> bool:
    """
    Check if a token has expired without full verification.
    
    Args:
        token: JWT token string
    
    Returns:
        True if expired, False otherwise
    """
    try:
        payload = decode_token_without_verification(token)
        exp = payload.get("exp")
        if exp is None:
            return True
        return datetime.fromtimestamp(exp) < datetime.utcnow()
    except Exception:
        return True


# ==================== TOKEN REFRESH (FUTURE) ====================

def create_refresh_token(data: dict) -> str:
    """
    Create a refresh token (future enhancement).
    
    Refresh tokens are long-lived tokens used to get new access tokens.
    
    Flow:
    1. User logs in → get access token (24h) + refresh token (30 days)
    2. Access token expires → use refresh token to get new access token
    3. Refresh token expires → user must log in again
    
    Benefits:
    - Short-lived access tokens (more secure)
    - Less frequent logins (better UX)
    - Can revoke refresh tokens (logout all devices)
    
    Not implemented yet - returns same as access token for now.
    """
    # TODO: Implement refresh token with longer expiration
    # and store in database for revocation capability
    return create_access_token(data, expires_delta=timedelta(days=30))


# ==================== EXPORTS ====================

__all__ = [
    "create_access_token",
    "verify_token",
    "get_current_user",
    "get_current_user_optional",
    "decode_token_without_verification",
    "is_token_expired",
    "security",
]
