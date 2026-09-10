"""
models.py

SQLAlchemy ORM models that define our database schema.
Each class becomes a table in PostgreSQL.

DATABASE SCHEMA OVERVIEW:
========================

Users Table:
- Stores user accounts with authentication credentials
- Contains cryptographic keys (public key, wrapped private key)
- salt: used for PBKDF2 password derivation (client-side)
- hashed_auth_proof: bcrypt hash of the authProof (server-side verification)

Files Table:
- Stores encrypted file metadata (NOT the plaintext!)
- ciphertext_path: location on disk where encrypted bytes are stored
- encrypted_metadata: encrypted filename, MIME type, size
- wrapped_key: the file's DEK (Data Encryption Key) wrapped with owner's public key
- Owned by one user, can be shared with many

Shares Table:
- Junction table for many-to-many relationship between Users and Files
- Each share = one wrapped copy of the file's DEK for one recipient
- Allows file sharing without re-encrypting the file content
"""

from sqlalchemy import Column, String, Integer, LargeBinary, DateTime, ForeignKey, Text, BigInteger
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid


# Base class for all models
# All tables inherit from this
Base = declarative_base()


def generate_uuid() -> str:
    """Generate a unique ID for new records."""
    return str(uuid.uuid4())


class User(Base):
    """
    User Model - Stores user accounts and cryptographic keys.
    
    Security Architecture:
    =====================
    1. Client derives TWO keys from password via PBKDF2 + HKDF:
       - authProof: sent to server, proves user knows password
       - wrapKey: NEVER sent to server, used to encrypt private key
    
    2. Server receives authProof and hashes it AGAIN with bcrypt
       - Double hashing: client does PBKDF2, server does bcrypt
       - Even if database is compromised, attacker can't decrypt files
    
    3. User has RSA keypair:
       - public_key: stored in plaintext (it's public!)
       - wrapped_private_key: encrypted with wrapKey, server can't decrypt it
    
    4. salt: Random value for PBKDF2, ensures same password → different keys
    """
    
    __tablename__ = "users"
    
    # Primary key - unique identifier for each user
    id = Column(String, primary_key=True, default=generate_uuid)
    
    # Authentication fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    # NOTE: We do NOT store the plain password!
    # We store bcrypt(authProof), where authProof = PBKDF2(password, salt)
    hashed_auth_proof = Column(String(255), nullable=False)
    
    # Cryptographic fields
    # Salt for PBKDF2 - sent to client during login so they can derive keys
    salt = Column(String(64), nullable=False)
    
    # RSA-OAEP public key (base64-encoded SPKI format)
    # Used by others to encrypt file keys when sharing
    public_key = Column(Text, nullable=False)
    
    # RSA-OAEP private key, encrypted with user's wrapKey
    # Server stores it but can NEVER decrypt it without the password
    wrapped_private_key = Column(Text, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    # One user can own many files
    owned_files = relationship("File", back_populates="owner", cascade="all, delete-orphan")
    
    # Many-to-many: users can have access to many files through shares
    shared_files = relationship("Share", back_populates="recipient", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"


class File(Base):
    """
    File Model - Stores encrypted file metadata and ciphertext location.
    
    What Gets Stored:
    =================
    - Encrypted file content (ciphertext) → saved to disk at ciphertext_path
    - Encrypted metadata (filename, MIME type, size) → encrypted_metadata field
    - Wrapped DEK for owner → wrapped_key field
    - File size for display purposes → size_bytes field
    
    What NEVER Gets Stored:
    =======================
    - Plaintext file content ❌
    - Plaintext filename ❌
    - Unwrapped DEK (encryption key) ❌
    
    Sharing Model:
    ==============
    When user A shares a file with user B:
    1. NO file content moves or gets re-encrypted
    2. Server just creates a Share record with the DEK wrapped for B's public key
    3. B can now decrypt the SAME ciphertext with their own wrapped key
    """
    
    __tablename__ = "files"
    
    # Primary key
    id = Column(String, primary_key=True, default=generate_uuid)
    
    # Owner relationship
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # File storage
    # Path where the encrypted file bytes are stored on disk
    # Example: "uploads/abc-123-def.enc"
    ciphertext_path = Column(String(512), nullable=False)
    
    # Encrypted metadata blob (base64)
    # Contains: {filename: "...", mimeType: "...", sizeBytes: 123}
    # All encrypted with the file's DEK, so server can't read it
    encrypted_metadata = Column(Text, nullable=False)
    
    # File's DEK (Data Encryption Key) wrapped with owner's RSA public key
    # Owner uses this to decrypt the file
    wrapped_key = Column(Text, nullable=False)
    
    # Original file size in bytes (for display/UI purposes)
    # This is NOT sensitive - it's just the size
    size_bytes = Column(BigInteger, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="owned_files")
    
    # One file can be shared with many users
    shares = relationship("Share", back_populates="file", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<File(id={self.id}, owner_id={self.owner_id}, size={self.size_bytes})>"


class Share(Base):
    """
    Share Model - Junction table for file sharing.
    
    How File Sharing Works:
    =======================
    1. User A (owner) wants to share file with User B (recipient)
    2. Frontend fetches B's public key from server
    3. Frontend wraps the file's DEK with B's public key (client-side!)
    4. Frontend sends wrapped key to server
    5. Server creates this Share record
    
    Result: B can now decrypt the file without:
    - Re-encrypting the file content
    - Giving B access to A's private key
    - The server ever seeing the unwrapped DEK
    
    Security Note:
    ==============
    Revoking a share (deleting this record) prevents FUTURE downloads,
    but can't force-delete a copy B already downloaded and cached locally.
    True revocation requires DEK rotation (not implemented yet).
    """
    
    __tablename__ = "shares"
    
    # Composite primary key (file_id + recipient_id)
    # One file can be shared with one user only once
    file_id = Column(String, ForeignKey("files.id", ondelete="CASCADE"), primary_key=True)
    recipient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    
    # The file's DEK wrapped with recipient's public key
    # Recipient uses their private key to unwrap this and decrypt the file
    wrapped_key_for_recipient = Column(Text, nullable=False)
    
    # Timestamp
    shared_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    file = relationship("File", back_populates="shares")
    recipient = relationship("User", back_populates="shared_files")
    
    def __repr__(self):
        return f"<Share(file_id={self.file_id}, recipient_id={self.recipient_id})>"


# ==================== HELPER FUNCTIONS ====================

def create_tables(engine):
    """
    Create all tables in the database.
    This is called once during app initialization or by Alembic migrations.
    
    Args:
        engine: SQLAlchemy engine connected to the database
    """
    Base.metadata.create_all(bind=engine)


def drop_tables(engine):
    """
    Drop all tables from the database.
    WARNING: This deletes ALL data! Only use for testing or reset.
    
    Args:
        engine: SQLAlchemy engine connected to the database
    """
    Base.metadata.drop_all(bind=engine)
