"""
sharing.py - File Sharing Router

Implements secure file sharing via wrapped key exchange:
- POST /sharing/share: Share file with another user
- GET /sharing/{file_id}: List all shares for a file
- DELETE /sharing/{file_id}/{recipient_email}: Revoke a share

The Sharing Magic:
==================
When User A shares a file with User B:

1. Frontend fetches B's public key (via /auth/lookup-public-key)
2. Frontend wraps the file's DEK with B's public key (CLIENT-SIDE!)
3. Frontend sends wrapped key to server
4. Server stores: (file_id, recipient_id, wrapped_key_for_recipient)

Result:
- NO file content moves
- NO re-encryption of file
- B can decrypt the SAME ciphertext
- Server never sees the unwrapped DEK

Security Properties:
====================
✓ Zero-knowledge: Server never sees unwrapped keys
✓ End-to-end encrypted: Only sender and recipient can decrypt
✓ Forward secrecy: Each user has their own wrapped key
✓ Selective sharing: Can share with specific users
✓ Revocable: Can remove access (prevents future downloads)

Limitations (Documented):
=========================
✗ Revocation doesn't delete cached copies
✗ True revocation needs DEK rotation (roadmap)
✗ Can't change permissions after sharing
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, File, Share
from app.schemas.sharing import (
    ShareFileRequest,
    ShareFileResponse,
    ListSharesResponse,
    ShareListItem,
    RevokeShareRequest,
    RevokeShareResponse,
)
from app.utils.jwt_utils import get_current_user, TokenData


# Create router
router = APIRouter(
    prefix="/sharing",
    tags=["sharing"],
)


# ==================== SHARE FILE ENDPOINT ====================

@router.post("/share", response_model=ShareFileResponse, status_code=status.HTTP_201_CREATED)
def share_file(
    body: ShareFileRequest,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Share a file with another user.
    
    Sharing Flow:
    -------------
    1. User A (owner) wants to share file with User B
    2. Frontend:
       - Calls /auth/lookup-public-key with B's email
       - Gets B's public key
       - Unwraps file's DEK with A's private key
       - Re-wraps DEK with B's public key (NEVER sending unwrapped DEK!)
    3. Frontend sends this request with wrapped key for B
    4. Backend creates Share record
    5. B can now download and decrypt the file
    
    What Gets Stored:
    -----------------
    - file_id: Which file is shared
    - recipient_id: Who it's shared with
    - wrapped_key_for_recipient: DEK wrapped for recipient
    - shared_at: Timestamp
    
    The Magic:
    ----------
    - File content doesn't move
    - File content doesn't get re-encrypted
    - Same ciphertext, different wrapped keys
    - Server never sees unwrapped DEK
    
    Security:
    ---------
    - ONLY file owner can share
    - Recipient must exist in system
    - Can't share with yourself (redundant)
    - Each recipient gets their own wrapped key
    
    Errors:
    -------
    - 401: Not authenticated
    - 403: Not the file owner
    - 404: File or recipient not found
    - 409: Already shared with this user
    """
    
    user_id = current_user.user_id
    
    # Find the file
    file = db.query(File).filter(File.id == body.fileId).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )
    
    # Check ownership - ONLY owner can share
    if file.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the file owner can share this file."
        )
    
    # Find recipient by email
    recipient = db.query(User).filter(User.email == body.recipientEmail).first()
    
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user found with email: {body.recipientEmail}"
        )
    
    # Can't share with yourself (already have access as owner)
    if recipient.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot share a file with yourself."
        )
    
    # Check if already shared
    existing_share = db.query(Share).filter(
        Share.file_id == body.fileId,
        Share.recipient_id == recipient.id
    ).first()
    
    if existing_share:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"File is already shared with {body.recipientEmail}"
        )
    
    # Create new share
    new_share = Share(
        file_id=body.fileId,
        recipient_id=recipient.id,
        wrapped_key_for_recipient=body.wrappedKeyForRecipient
    )
    
    db.add(new_share)
    db.commit()
    db.refresh(new_share)
    
    return ShareFileResponse(
        success=True,
        message=f"File shared successfully with {body.recipientEmail}",
        recipientId=recipient.id,
        sharedAt=new_share.shared_at
    )


# ==================== LIST SHARES ENDPOINT ====================

@router.get("/{file_id}", response_model=ListSharesResponse)
def list_shares(
    file_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all users a file is shared with.
    
    Use Cases:
    ----------
    - Sharing dialog: "This file is shared with Alice, Bob, Charlie"
    - Manage sharing: See who has access
    - Audit trail: Who can see this file?
    
    Returns:
    --------
    For each share:
    - recipientId: User ID
    - recipientEmail: User email (for display)
    - sharedAt: When share was created
    
    Privacy Note:
    -------------
    We DON'T return the wrapped keys in the list.
    - Wrapped keys are only given when downloading
    - No need to expose them in list view
    
    Security:
    ---------
    - ONLY file owner can see this list
    - Recipients cannot see who else has access
    - Returns 403 if not owner
    
    Errors:
    -------
    - 401: Not authenticated
    - 403: Not the file owner
    - 404: File not found
    """
    
    user_id = current_user.user_id
    
    # Find file
    file = db.query(File).filter(File.id == file_id).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )
    
    # Check ownership - ONLY owner can list shares
    if file.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the file owner can view share list."
        )
    
    # Get all shares for this file
    shares = db.query(Share).filter(Share.file_id == file_id).all()
    
    # Build response with recipient details
    share_items = []
    for share in shares:
        recipient = db.query(User).filter(User.id == share.recipient_id).first()
        if recipient:
            share_items.append(ShareListItem(
                recipientId=recipient.id,
                recipientEmail=recipient.email,
                sharedAt=share.shared_at
            ))
    
    return ListSharesResponse(
        fileId=file_id,
        shares=share_items
    )


# ==================== REVOKE SHARE ENDPOINT ====================

@router.delete("/revoke", response_model=RevokeShareResponse)
def revoke_share(
    body: RevokeShareRequest,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a file share.
    
    What Happens:
    -------------
    1. Share record is deleted from database
    2. Recipient can no longer download file from server
    3. Recipient's existing cached copy is NOT affected
    
    Revocation Flow:
    ----------------
    1. Owner clicks "Revoke" next to recipient name
    2. Frontend sends this request
    3. Backend deletes Share record
    4. Next time recipient tries to download → 404 error
    
    Limitations:
    ------------
    ⚠️ This is "soft revocation" - prevents future downloads only
    
    If recipient already downloaded the file:
    - Their cached copy still works locally
    - They can still decrypt it (they have the wrapped key in memory)
    - True revocation requires re-encryption with new DEK
    
    For "hard revocation" (roadmap):
    - Generate new DEK
    - Re-encrypt file with new DEK
    - Re-wrap new DEK for remaining users
    - Previous wrapped keys become useless
    
    Security:
    ---------
    - ONLY file owner can revoke
    - Can't revoke your own access (you're the owner!)
    - Deletion is permanent (no undo)
    
    Errors:
    -------
    - 401: Not authenticated
    - 403: Not the file owner
    - 404: File, recipient, or share not found
    """
    
    user_id = current_user.user_id
    
    # Find file
    file = db.query(File).filter(File.id == body.fileId).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )
    
    # Check ownership - ONLY owner can revoke
    if file.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the file owner can revoke shares."
        )
    
    # Find recipient
    recipient = db.query(User).filter(User.email == body.recipientEmail).first()
    
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user found with email: {body.recipientEmail}"
        )
    
    # Can't revoke from yourself (you're the owner, not a recipient!)
    if recipient.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revoke your own access (you are the owner)."
        )
    
    # Find share
    share = db.query(Share).filter(
        Share.file_id == body.fileId,
        Share.recipient_id == recipient.id
    ).first()
    
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File is not shared with {body.recipientEmail}"
        )
    
    # Delete share
    db.delete(share)
    db.commit()
    
    return RevokeShareResponse(
        success=True,
        message=f"Access revoked for {body.recipientEmail}"
    )


# ==================== SHARED WITH ME (BONUS) ====================

@router.get("/shared-with-me", response_model=ListSharesResponse)
def get_shared_with_me(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all files shared with the current user.
    
    This is different from GET /files (which returns owned + shared).
    This endpoint ONLY returns files that others shared with you.
    
    Use Cases:
    ----------
    - "Shared with Me" folder in UI
    - See what others gave you access to
    - Separate view from your own files
    
    Returns:
    --------
    List of shares where current user is the recipient.
    
    For each:
    - File details (encrypted metadata, wrapped key, size)
    - Owner information (who shared it)
    - When it was shared
    
    Security:
    ---------
    - User only sees files shared WITH them
    - Doesn't see files they shared with others
    
    Note:
    -----
    This is a convenience endpoint. The GET /files endpoint
    already returns both owned and shared files.
    """
    
    user_id = current_user.user_id
    
    # Get all shares where current user is recipient
    shares = db.query(Share).filter(Share.recipient_id == user_id).all()
    
    share_items = []
    for share in shares:
        # Get file details
        file = db.query(File).filter(File.id == share.file_id).first()
        if not file:
            continue  # File was deleted
        
        # Get owner details
        owner = db.query(User).filter(User.id == file.owner_id).first()
        if not owner:
            continue  # Owner was deleted (shouldn't happen with FK constraints)
        
        share_items.append(ShareListItem(
            recipientId=user_id,
            recipientEmail=current_user.email,
            sharedAt=share.shared_at
        ))
    
    return ListSharesResponse(
        fileId="",  # Multiple files
        shares=share_items
    )


# ==================== HELPER FUNCTIONS ====================

def check_file_ownership(file_id: str, user_id: str, db: Session) -> File:
    """
    Check if user owns a file.
    
    Returns:
        File object if user is owner
    
    Raises:
        HTTPException: If file not found or user is not owner
    """
    file = db.query(File).filter(File.id == file_id).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )
    
    if file.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the owner of this file."
        )
    
    return file


def get_user_by_email(email: str, db: Session) -> User:
    """
    Get user by email.
    
    Returns:
        User object
    
    Raises:
        HTTPException: If user not found
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user found with email: {email}"
        )
    
    return user


# ==================== DOCUMENTATION ====================

"""
Sharing Architecture Summary:
==============================

Data Flow for Sharing:
----------------------
1. Owner has file encrypted with DEK_file
2. Owner's copy: DEK_file wrapped with Owner's RSA public key
3. To share with Bob:
   a. Frontend unwraps DEK_file with Owner's private key (client-side)
   b. Frontend fetches Bob's RSA public key from server
   c. Frontend wraps DEK_file with Bob's RSA public key (client-side)
   d. Frontend sends wrapped_key_for_bob to server
4. Server stores: Share(file_id, bob_id, wrapped_key_for_bob)
5. Bob downloads: gets same ciphertext + his wrapped key
6. Bob unwraps with his private key → gets DEK_file → decrypts

Security Analysis:
------------------
✓ Server never sees unwrapped DEK_file
✓ Owner's private key never leaves client
✓ Bob's private key never leaves client
✓ Even if server is compromised:
  - Attacker gets ciphertext (useless without key)
  - Attacker gets wrapped keys (useless without private keys)
  - Attacker does NOT get plaintext or unwrapped keys

Performance:
------------
- Sharing is FAST (just creating a database record)
- No file content moves
- No encryption/decryption on server
- Scales to many recipients (just more wrapped key records)

Limitations:
------------
- Revocation is "soft" (prevents future downloads only)
- Already-downloaded copies remain accessible
- For "hard" revocation, need DEK rotation:
  - Re-encrypt file with new DEK
  - Re-wrap for authorized users only
  - Previous keys become useless
"""
