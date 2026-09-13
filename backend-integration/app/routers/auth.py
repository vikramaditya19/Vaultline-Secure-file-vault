"""Persistent authentication routes for Vaultline."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.auth import (
    FetchSaltRequest,
    FetchSaltResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    LookupPublicKeyRequest,
    LookupPublicKeyResponse,
    RegisterRequest,
    RegisterResponse,
    TokenData,
    UserPublic,
)
from app.utils.auth_utils import hash_auth_proof, verify_auth_proof
from app.utils.jwt_utils import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])


def normalized_email(email: str) -> str:
    return email.strip().lower()


def auth_response(user: User, response_type):
    return response_type(
        user=UserPublic(id=user.id, email=user.email),
        token=create_access_token({"user_id": user.id, "email": user.email}),
        wrappedPrivateKeyB64=user.wrapped_private_key,
        salt=user.salt,
    )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_user(body: RegisterRequest, db: Session = Depends(get_db)):
    email = normalized_email(body.email)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        email=email,
        hashed_auth_proof=hash_auth_proof(body.authProofB64),
        salt=body.saltB64,
        public_key=body.publicKeyB64,
        wrapped_private_key=body.wrappedPrivateKeyB64,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return auth_response(user, RegisterResponse)


@router.post("/fetch-salt", response_model=FetchSaltResponse)
def fetch_salt(body: FetchSaltRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == normalized_email(body.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email.")
    return FetchSaltResponse(salt=user.salt)


@router.post("/login", response_model=LoginResponse)
def login_user(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == normalized_email(body.email)).first()
    if not user or not verify_auth_proof(body.authProofB64, user.hashed_auth_proof):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return auth_response(user, LoginResponse)


@router.post("/logout", response_model=LogoutResponse)
def logout_user(current_user: TokenData = Depends(get_current_user)):
    return LogoutResponse(success=True)


@router.post("/lookup-public-key", response_model=LookupPublicKeyResponse)
def lookup_public_key(
    body: LookupPublicKeyRequest,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == normalized_email(body.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found with that email.")
    return LookupPublicKeyResponse(userId=user.id, email=user.email, publicKeyB64=user.public_key)


@router.get("/me", response_model=UserPublic)
def current_user_profile(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")
    return UserPublic(id=user.id, email=user.email)
