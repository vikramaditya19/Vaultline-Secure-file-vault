import uuid , secrets

from fastapi import APIRouter, HTTPException
from app.schemas.auth import (
    RegisterRequest, FetchSaltRequest, FetchSaltResponse, LoginRequest, LogoutResponse, AuthResponse , LookupPublicKeyRequest, LookupPublicKeyResponse , UserPublic
)
router = APIRouter()
fake_users_db = {}  # Simulated in-memory database for demonstration purposes
@router.post("/register", response_model=AuthResponse)
def register_user(body: RegisterRequest):
    user_id = str(uuid.uuid4())
    token = secrets.token_urlsafe(16)
    salt=secrets.token_hex(16)  # Simulated salt for demonstration
    if body.email in fake_users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Proceed with user registration logic
    fake_users_db[body.email] = {
        "id": user_id,
        "token": token,
        "wrappedPrivateKeyB64": body.wrappedPrivateKeyB64,
        "salt": salt    
    }
    return AuthResponse(
        user=UserPublic(id=user_id, email=body.email),
        token=token,
        wrappedPrivateKeyB64=body.wrappedPrivateKeyB64,
        salt=salt  # Simulated salt for demonstration
    )