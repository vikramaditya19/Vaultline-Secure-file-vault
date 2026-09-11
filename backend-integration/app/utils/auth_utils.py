"""
auth_utils.py

Authentication utilities for password hashing and verification.

Security Architecture:
======================
The frontend does PBKDF2 (600k iterations) to derive authProofB64.
We hash that AGAIN with bcrypt before storing.

Why Double Hashing?
===================
1. Client-side PBKDF2: Ensures password never sent over network
2. Server-side bcrypt: Protects against database compromise

Even if attacker gets database access:
- They see bcrypt(authProof), NOT authProof itself
- They can't use it to decrypt files (need the actual authProof)
- They can't derive wrapKey (it was derived client-side, never sent)

This is similar to Bitwarden's architecture:
https://bitwarden.com/help/bitwarden-security-white-paper/
"""

from passlib.context import CryptContext
from app.config import settings
import secrets


# ==================== PASSWORD CONTEXT ====================

# Configure argon2 password hasher
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
)

"""
Why switch from bcrypt to argon2?
- Argon2: Works with Python 3.14, memory-hard, winner of Password Hashing Competition
- Bcrypt: Has compatibility issues with Python 3.14 and newer versions of dependencies
- Argon2 is MORE secure than bcrypt anyway (memory-hard, resistant to GPU attacks)

Argon2 configuration:
- Uses sensible defaults for memory, time, and parallelism
- Future-proof: actively maintained
"""


# ==================== HASHING FUNCTIONS ====================

def hash_auth_proof(auth_proof_b64: str) -> str:
    """
    Hash the authProof from the client using argon2.
    
    This is the SECOND layer of hashing:
    - First layer: client does PBKDF2 (600k iterations)
    - Second layer: we do argon2 (memory-hard hashing)
    
    Args:
        auth_proof_b64: Base64-encoded authProof from client
    
    Returns:
        Argon2 hash string (includes salt, ready to store in database)
        
    Security Note:
        Argon2 is memory-hard, resistant to GPU/ASIC attacks
        Much stronger than bcrypt and works with Python 3.14+
    """
    return pwd_context.hash(auth_proof_b64)


def verify_auth_proof(auth_proof_b64: str, hashed_auth_proof: str) -> bool:
    """
    Verify an authProof against the stored hash.
    
    This is used during login:
    1. Client sends authProofB64 (derived from password + salt)
    2. We fetch user's hashed_auth_proof from database
    3. We verify: does hash(authProofB64) == hashed_auth_proof?
    
    Args:
        auth_proof_b64: Fresh authProof from client (login attempt)
        hashed_auth_proof: Stored hash from database (registration)
    
    Returns:
        True if authProof matches, False otherwise
        
    Security Note:
        This is constant-time comparison (resistant to timing attacks).
        Passlib handles this automatically with argon2.
    """
    return pwd_context.verify(auth_proof_b64, hashed_auth_proof)


# ==================== SALT GENERATION ====================

def generate_salt() -> str:
    """
    Generate a cryptographically secure random salt for PBKDF2.
    
    The salt is used client-side during password derivation:
    - Makes rainbow table attacks impossible
    - Ensures same password → different keys for different users
    - Not secret, stored in plaintext in database
    
    Returns:
        Hex-encoded salt string (32 hex chars = 16 random bytes)
        
    Example:
        salt = generate_salt()
        # Returns: "a3f5d8c2e9b1f4d6c8a5e7b9d3f1c8a4"
    
    Why 16 bytes?
        - NIST recommends minimum 16 bytes (128 bits)
        - More bytes = more entropy = harder to attack
        - 16 bytes = 2^128 possible values
    """
    return secrets.token_hex(16)  # 16 bytes = 32 hex characters


# ==================== VALIDATION ====================

def validate_auth_proof_format(auth_proof_b64: str) -> bool:
    """
    Validate that authProof is properly formatted base64.
    
    Basic sanity check before hashing.
    Doesn't verify correctness, just format.
    
    Args:
        auth_proof_b64: Base64 string to validate
    
    Returns:
        True if valid base64 format, False otherwise
    """
    import base64
    
    try:
        # Try to decode - if it fails, it's not valid base64
        base64.b64decode(auth_proof_b64, validate=True)
        return True
    except Exception:
        return False


# ==================== PASSWORD STRENGTH (FUTURE) ====================

def check_password_strength(password: str) -> dict:
    """
    Check password strength (future enhancement).
    
    NOTE: We never receive the actual password on the server!
    This function is for documentation - the check would happen client-side.
    
    Password Requirements:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    
    Returns:
        Dictionary with strength assessment
    """
    return {
        "strong": True,
        "message": "Password strength checking happens client-side"
    }


# ==================== DEBUGGING ====================

def hash_comparison_demo():
    """
    Demonstration of the double-hashing process.
    For educational/debugging purposes only.
    """
    print("=== Double Hashing Demo ===\n")
    
    # Simulate client-side PBKDF2
    plaintext_password = "MySecurePassword123!"
    print(f"1. User enters password: {plaintext_password}")
    print("   (This NEVER leaves the client!)\n")
    
    # Simulate PBKDF2 result (normally done in browser)
    simulated_auth_proof = "dGVzdF9hdXRoX3Byb29mX2Zyb21fcGJrZGYy"
    print(f"2. Client does PBKDF2 (600k iterations):")
    print(f"   authProofB64 = {simulated_auth_proof}")
    print("   (This is sent to server)\n")
    
    # Server-side bcrypt
    hashed = hash_auth_proof(simulated_auth_proof)
    print(f"3. Server does bcrypt (12 rounds):")
    print(f"   hashed_auth_proof = {hashed}")
    print("   (This is stored in database)\n")
    
    # Verification
    is_valid = verify_auth_proof(simulated_auth_proof, hashed)
    print(f"4. Verification: {is_valid}\n")
    
    print("=== Security Benefits ===")
    print("✓ Password never sent to server")
    print("✓ authProof is hashed before storage")
    print("✓ Even with database access, attacker can't decrypt files")
    print("✓ Each user has unique salt → rainbow tables useless")


# ==================== EXPORTS ====================

__all__ = [
    "hash_auth_proof",
    "verify_auth_proof",
    "generate_salt",
    "validate_auth_proof_format",
    "pwd_context",
]
