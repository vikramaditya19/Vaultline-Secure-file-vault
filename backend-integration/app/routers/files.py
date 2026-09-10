"""
files.py - File Operations Router

Implements encrypted file storage and retrieval:
- POST /files/upload: Upload encrypted file
- GET /files: List all files accessible to user
- GET /files/{file_id}: Get detailed file info
- GET /files/{file_id}/download: Download encrypted file
- DELETE /files/{file_id}: Delete file (owner only)

Security Model (Zero-Knowledge):
================================
Server stores:
✓ Encrypted file content (ciphertext)
✓ Encrypted metadata (filename, MIME type)
✓ Wrapped DEK (file encryption key)
✓ File size (not sensitive)

Server NEVER sees:
✗ Plaintext file content
✗ Plaintext filename
✗ Unwrapped DEK

File Upload Flow:
=================
1. Client encrypts file with fresh AES-256-GCM key (DEK)
2. Client encrypts metadata JSON with same DEK
3. Client wraps DEK with user's RSA public key
4. Client uploads: ciphertext + encrypted_metadata + wrapped_key
5. Server stores everything without decrypting

File Download Flow:
===================
1. Client requests file
2. Server sends: ciphertext + encrypted_metadata + wrapped_key
3. Client unwraps DEK with private key
4. Client decrypts metadata to get filename
5. Client decrypts file content
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File as FastAPIFile, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import aiofiles
import os
from datetime import datetime

from app.database import get_db
from app.models import User, File, Share
from app.schemas.files import (
    FileUploadResponse,
    FileListResponse,
    FileListItem,
    FileDetailResponse,
    FileDeleteResponse,
)
from app.utils.jwt_utils import get_current_user, TokenData
from app.config import settings, get_upload_path


# Create router
router = APIRouter(
    prefix="/files",
    tags=["files"],
)


# ==================== UPLOAD ENDPOINT ====================

@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    ciphertext: UploadFile = FastAPIFile(..., description="Encrypted file bytes"),
    encryptedMetadata: str = Form(..., description="Base64 encrypted metadata"),
    wrappedKey: str = Form(..., description="Wrapped DEK for owner"),
    sizeBytes: int = Form(..., description="Original file size", ge=0),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload an encrypted file.
    
    Request Format: multipart/form-data
    ------------------------------------
    - ciphertext: Binary file (the encrypted bytes)
    - encryptedMetadata: String (base64-encoded encrypted JSON)
    - wrappedKey: String (base64-encoded wrapped DEK)
    - sizeBytes: Integer (original file size)
    
    What Gets Stored:
    -----------------
    - Ciphertext → saved to disk at uploads/{file_id}.enc
    - Encrypted metadata → stored in database
    - Wrapped key → stored in database
    - Size → stored in database
    - Owner ID → from JWT token
    
    Security:
    ---------
    - All content is encrypted BEFORE reaching the server
    - Server treats ciphertext as opaque binary data
    - Even admin can't read filename or content
    - File is tied to owner via JWT authentication
    
    File Size Limits:
    -----------------
    - Maximum: 100MB (configurable in settings.MAX_FILE_SIZE)
    - Enforced by FastAPI's UploadFile
    
    Errors:
    -------
    - 401: Not authenticated
    - 413: File too large
    - 500: Disk write error
    """
    
    # Validate file size (FastAPI doesn't enforce this automatically)
    content = await ciphertext.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum of {settings.MAX_FILE_SIZE} bytes"
        )
    
    # Create new file record in database
    new_file = File(
        owner_id=current_user.user_id,
        encrypted_metadata=encryptedMetadata,
        wrapped_key=wrappedKey,
        size_bytes=sizeBytes,
        ciphertext_path="",  # Will be set after we know the file ID
    )
    
    db.add(new_file)
    db.commit()
    db.refresh(new_file)  # Get the generated ID
    
    # Save ciphertext to disk
    file_path = get_upload_path(new_file.id)
    
    try:
        # Write file asynchronously (non-blocking)
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Update file record with storage path
        new_file.ciphertext_path = str(file_path)
        db.commit()
        
    except Exception as e:
        # If disk write fails, delete the database record
        db.delete(new_file)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Return response
    return FileUploadResponse(
        id=new_file.id,
        sizeBytes=new_file.size_bytes,
        createdAt=new_file.created_at
    )


# ==================== LIST ENDPOINT ====================

@router.get("", response_model=FileListResponse)
def list_files(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all files accessible to the current user.
    
    Returns:
    --------
    - Files owned by the user
    - Files shared with the user
    
    Each file includes:
    -------------------
    - id: File identifier
    - ownerId: Who uploaded it
    - isOwner: Is current user the owner?
    - encryptedMetadataB64: Encrypted {filename, mimeType, size}
    - wrappedKeyB64: DEK wrapped for current user
    - sizeBytes: File size (not sensitive)
    - createdAt: Upload timestamp
    
    Client-Side Decryption:
    ----------------------
    For each file:
    1. Client unwraps DEK with their private key
    2. Client decrypts metadata to get filename/MIME type
    3. Client displays in file list UI
    
    Security:
    ---------
    - User only sees files they have access to (owned or shared)
    - Metadata stays encrypted in transit
    - Server doesn't know what files are called
    
    Errors:
    -------
    - 401: Not authenticated
    """
    
    user_id = current_user.user_id
    
    # Query for owned files
    owned_files = db.query(File).filter(File.owner_id == user_id).all()
    
    # Query for shared files (via Share table)
    shared_file_ids = db.query(Share.file_id).filter(Share.recipient_id == user_id).all()
    shared_file_ids = [row[0] for row in shared_file_ids]
    shared_files = db.query(File).filter(File.id.in_(shared_file_ids)).all() if shared_file_ids else []
    
    # Combine results
    all_files = []
    
    # Add owned files
    for file in owned_files:
        all_files.append(FileListItem(
            id=file.id,
            ownerId=file.owner_id,
            isOwner=True,
            encryptedMetadataB64=file.encrypted_metadata,
            wrappedKeyB64=file.wrapped_key,  # Owner's wrapped key
            sizeBytes=file.size_bytes,
            createdAt=file.created_at
        ))
    
    # Add shared files
    for file in shared_files:
        # Get the wrapped key for THIS user (not the owner's key!)
        share = db.query(Share).filter(
            Share.file_id == file.id,
            Share.recipient_id == user_id
        ).first()
        
        if share:
            all_files.append(FileListItem(
                id=file.id,
                ownerId=file.owner_id,
                isOwner=False,
                encryptedMetadataB64=file.encrypted_metadata,
                wrappedKeyB64=share.wrapped_key_for_recipient,  # Recipient's wrapped key!
                sizeBytes=file.size_bytes,
                createdAt=file.created_at
            ))
    
    # Sort by creation date (newest first)
    all_files.sort(key=lambda x: x.createdAt, reverse=True)
    
    return FileListResponse(files=all_files)


# ==================== DETAIL ENDPOINT ====================

@router.get("/{file_id}", response_model=FileDetailResponse)
def get_file_detail(
    file_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific file.
    
    Includes everything from list, plus:
    - sharedWithCount: How many users have access (excluding owner)
    
    Used for:
    ---------
    - File detail/preview pages
    - Sharing dialogs (to show who has access)
    - Metadata display
    
    Security:
    ---------
    - User must own the file OR have it shared with them
    - Returns 404 if user has no access
    
    Errors:
    -------
    - 401: Not authenticated
    - 404: File not found or no access
    """
    
    user_id = current_user.user_id
    
    # Find file
    file = db.query(File).filter(File.id == file_id).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )
    
    # Check access: is user the owner OR does user have a share?
    is_owner = file.owner_id == user_id
    share = db.query(Share).filter(
        Share.file_id == file_id,
        Share.recipient_id == user_id
    ).first()
    
    has_access = is_owner or share is not None
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."  # Don't reveal file exists but user has no access
        )
    
    # Get share count
    share_count = db.query(Share).filter(Share.file_id == file_id).count()
    
    # Get appropriate wrapped key
    if is_owner:
        wrapped_key = file.wrapped_key
    else:
        wrapped_key = share.wrapped_key_for_recipient
    
    return FileDetailResponse(
        id=file.id,
        ownerId=file.owner_id,
        isOwner=is_owner,
        encryptedMetadataB64=file.encrypted_metadata,
        wrappedKeyB64=wrapped_key,
        sizeBytes=file.size_bytes,
        createdAt=file.created_at,
        sharedWithCount=share_count
    )


# ==================== DOWNLOAD ENDPOINT ====================

@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download encrypted file content.
    
    Returns:
    --------
    Binary response with headers:
    - Content-Type: application/octet-stream
    - X-Encrypted-Metadata: Base64 encrypted metadata
    - X-Wrapped-Key: Base64 wrapped DEK
    - Content-Disposition: attachment
    
    Client-Side Decryption:
    ----------------------
    1. Client receives binary ciphertext + headers
    2. Client unwraps DEK from X-Wrapped-Key header
    3. Client decrypts metadata from X-Encrypted-Metadata
    4. Client decrypts file content
    5. Client creates File object with decrypted name
    6. Client triggers browser download
    
    Streaming:
    ----------
    Large files are streamed (not loaded into memory all at once).
    This prevents memory exhaustion on the server.
    
    Security:
    ---------
    - User must own file OR have it shared with them
    - Ciphertext streamed as-is (server doesn't decrypt)
    - Proper access control check before streaming
    
    Errors:
    -------
    - 401: Not authenticated
    - 404: File not found, deleted, or no access
    - 500: Disk read error
    """
    
    user_id = current_user.user_id
    
    # Find file
    file = db.query(File).filter(File.id == file_id).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )
    
    # Check access
    is_owner = file.owner_id == user_id
    share = db.query(Share).filter(
        Share.file_id == file_id,
        Share.recipient_id == user_id
    ).first()
    
    has_access = is_owner or share is not None
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )
    
    # Check if file exists on disk
    if not os.path.exists(file.ciphertext_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found on disk."
        )
    
    # Get appropriate wrapped key
    wrapped_key = file.wrapped_key if is_owner else share.wrapped_key_for_recipient
    
    # Stream file content
    async def file_stream():
        """Generator that yields file chunks."""
        async with aiofiles.open(file.ciphertext_path, 'rb') as f:
            while chunk := await f.read(8192):  # 8KB chunks
                yield chunk
    
    # Return streaming response with metadata in headers
    return StreamingResponse(
        file_stream(),
        media_type="application/octet-stream",
        headers={
            "X-Encrypted-Metadata": file.encrypted_metadata,
            "X-Wrapped-Key": wrapped_key,
            "Content-Disposition": f'attachment; filename="{file_id}.enc"',
            "X-File-Id": file.id,
        }
    )


# ==================== DELETE ENDPOINT ====================

@router.delete("/{file_id}", response_model=FileDeleteResponse)
def delete_file(
    file_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a file (owner only).
    
    Deletion Process:
    -----------------
    1. Verify user is the owner (not just someone who has it shared)
    2. Delete file from disk
    3. Delete database records (cascades to shares)
    4. Return success
    
    Cascade Deletion:
    -----------------
    When a file is deleted:
    - All Share records are automatically deleted (SQLAlchemy cascade)
    - Users who had the file shared can no longer access it
    - File ciphertext is removed from disk
    
    Security:
    ---------
    - ONLY the owner can delete
    - Recipients cannot delete files shared with them
    - Proper ownership check before deletion
    
    Revocation Note:
    ----------------
    Deleting the file prevents future downloads, but:
    - Recipients might have already downloaded it
    - Their local cached copies are NOT affected
    - True revocation requires DEK rotation (roadmap feature)
    
    Errors:
    -------
    - 401: Not authenticated
    - 403: Not the owner (only owner can delete)
    - 404: File not found
    - 500: Disk deletion error
    """
    
    user_id = current_user.user_id
    
    # Find file
    file = db.query(File).filter(File.id == file_id).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )
    
    # Check ownership (ONLY owner can delete, not shared users!)
    if file.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can delete this file."
        )
    
    # Delete file from disk
    try:
        if os.path.exists(file.ciphertext_path):
            os.remove(file.ciphertext_path)
    except Exception as e:
        print(f"Warning: Failed to delete file from disk: {e}")
        # Continue anyway - database cleanup is more important
    
    # Delete from database (cascades to Share table)
    db.delete(file)
    db.commit()
    
    return FileDeleteResponse(
        success=True,
        message="File deleted successfully"
    )


# ==================== HELPER FUNCTIONS ====================

def check_file_access(file_id: str, user_id: str, db: Session) -> tuple[File, bool, str]:
    """
    Check if user has access to a file.
    
    Returns:
        tuple: (file, is_owner, wrapped_key)
    
    Raises:
        HTTPException: If file not found or no access
    """
    file = db.query(File).filter(File.id == file_id).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )
    
    is_owner = file.owner_id == user_id
    
    if is_owner:
        return file, True, file.wrapped_key
    
    # Check for share
    share = db.query(Share).filter(
        Share.file_id == file_id,
        Share.recipient_id == user_id
    ).first()
    
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )
    
    return file, False, share.wrapped_key_for_recipient
