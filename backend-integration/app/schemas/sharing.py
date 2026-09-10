"""
sharing.py - File Sharing Schemas

Pydantic schemas for file sharing operations.

Sharing Model Explained:
========================
When User A shares a file with User B:

1. NO file content moves or gets re-encrypted
2. Frontend fetches B's public key (via lookup endpoint)
3. Frontend wraps the file's DEK with B's public key (client-side!)
4. Frontend sends the wrapped key to backend
5. Backend stores: (file_id, recipient_id, wrapped_key_for_recipient)
6. B can now download and decrypt the same ciphertext

Security Properties:
====================
- Server never sees the unwrapped DEK
- B cannot decrypt files shared with other users (different wrapped keys)
- Revoking a share prevents future downloads (but can't delete B's local copy)
- True revocation requires DEK rotation (roadmap item)

Why This Is Secure:
===================
- Even if the database is compromised, attacker gets:
  ✓ Ciphertext (useless without key)
  ✓ Wrapped keys (useless without recipient's private key)
  ✗ NO unwrapped DEKs
  ✗ NO private keys (they're wrapped too!)
"""

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


# ==================== SHARE FILE ENDPOINT ====================

class ShareFileRequest(BaseModel):
    """
    Request to share a file with another user.
    
    Flow:
    1. User A (owner) wants to share file with User B
    2. Frontend looks up B's email → gets B's public key
    3. Frontend wraps file's DEK with B's public key
    4. Frontend sends this request
    5. Backend creates Share record
    
    Note: recipientEmail is used to identify the recipient.
    Backend will look up the user ID from the email.
    """
    fileId: str = Field(..., description="ID of file to share")
    recipientEmail: EmailStr = Field(
        ..., 
        description="Email of user to share with",
        example="friend@example.com"
    )
    wrappedKeyForRecipient: str = Field(
        ..., 
        description="File's DEK wrapped with recipient's RSA public key",
        min_length=100
    )


class ShareFileResponse(BaseModel):
    """Response after successfully sharing a file."""
    success: bool = Field(default=True, description="Share created successfully")
    message: str = Field(
        default="File shared successfully", 
        description="Status message"
    )
    recipientId: str = Field(..., description="ID of user file was shared with")
    sharedAt: datetime = Field(..., description="Timestamp of share creation")


# ==================== LIST SHARES ENDPOINT ====================

class ShareListItem(BaseModel):
    """
    Information about one user a file is shared with.
    
    Only the file owner can see this list.
    """
    recipientId: str = Field(..., description="User ID of recipient")
    recipientEmail: str = Field(..., description="Email of recipient")
    sharedAt: datetime = Field(..., description="When the share was created")
    # Note: We don't expose the wrapped key in the list for privacy
    # Only the recipient gets their wrapped key when they download


class ListSharesResponse(BaseModel):
    """
    Response listing all users a file is shared with.
    
    Only accessible by file owner.
    """
    fileId: str = Field(..., description="The file being queried")
    shares: List[ShareListItem] = Field(
        default=[], 
        description="List of users this file is shared with"
    )


# ==================== REVOKE SHARE ENDPOINT ====================

class RevokeShareRequest(BaseModel):
    """
    Request to revoke a file share.
    
    Effects:
    - Recipient can no longer download the file from server
    - Recipient's existing local copy is NOT affected
    - For true revocation (deleting local copies), DEK rotation is needed
    
    Only the file owner can revoke shares.
    """
    fileId: str = Field(..., description="ID of shared file")
    recipientEmail: EmailStr = Field(
        ..., 
        description="Email of user to revoke access from"
    )


class RevokeShareResponse(BaseModel):
    """Response after revoking a share."""
    success: bool = Field(default=True, description="Share revoked successfully")
    message: str = Field(
        default="Share revoked successfully", 
        description="Status message"
    )


# ==================== SHARED WITH ME ====================

class SharedWithMeItem(BaseModel):
    """
    File that has been shared with the current user.
    
    Similar to FileListItem, but specifically for shared files.
    """
    fileId: str = Field(..., description="File identifier")
    ownerId: str = Field(..., description="User who owns the file")
    ownerEmail: str = Field(..., description="Email of file owner")
    encryptedMetadataB64: str = Field(
        ..., 
        description="Encrypted metadata (client decrypts)"
    )
    wrappedKeyB64: str = Field(
        ..., 
        description="File's DEK wrapped for current user"
    )
    sizeBytes: int = Field(..., description="File size in bytes", ge=0)
    sharedAt: datetime = Field(..., description="When it was shared with you")


class SharedWithMeResponse(BaseModel):
    """
    Response listing files shared with the current user.
    
    This is separate from owned files for clarity in the UI.
    """
    files: List[SharedWithMeItem] = Field(
        default=[], 
        description="Files shared with you"
    )


# ==================== BULK SHARE ====================

class BulkShareRequest(BaseModel):
    """
    Request to share a file with multiple users at once.
    
    Future enhancement - not required for MVP.
    Would reduce round-trips when sharing with a team.
    """
    fileId: str = Field(..., description="ID of file to share")
    recipients: List[dict] = Field(
        ..., 
        description="List of {email, wrappedKey} objects"
    )


class BulkShareResponse(BaseModel):
    """Response after bulk sharing."""
    success: bool = Field(default=True)
    message: str = Field(default="File shared with all recipients")
    sharedCount: int = Field(..., description="Number of users shared with", ge=0)
    failedEmails: List[str] = Field(
        default=[], 
        description="Emails that couldn't be shared with (user not found, etc.)"
    )
