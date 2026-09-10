"""
files.py - File Operation Schemas

Pydantic schemas for file upload, download, list, and delete operations.

Security Model:
===============
- ciphertext: Encrypted file bytes (server treats as opaque binary)
- encryptedMetadataB64: Encrypted {filename, mimeType, size} JSON
- wrappedKeyB64: File's DEK wrapped with user's RSA public key
- Server NEVER sees plaintext filenames or content!

File Upload Flow:
=================
1. Frontend encrypts file with fresh AES-256-GCM key (DEK)
2. Frontend encrypts metadata (filename, MIME type) with same DEK
3. Frontend wraps DEK with user's RSA public key
4. Frontend uploads: ciphertext + encrypted metadata + wrapped key
5. Backend stores everything without ever decrypting
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ==================== UPLOAD ENDPOINT ====================

class FileUploadRequest(BaseModel):
    """
    File upload request.
    
    Note: This is typically sent as multipart/form-data, not JSON.
    The actual request will use FormData with:
    - ciphertext: binary file
    - encryptedMetadata: string field
    - wrappedKey: string field
    - sizeBytes: number field
    
    This schema documents the structure, but FastAPI will parse it from form fields.
    """
    # These will come from multipart form fields
    # ownerId is extracted from JWT token, not sent by client
    pass  # Actual parsing happens in route with UploadFile


class FileUploadResponse(BaseModel):
    """Response after successful file upload."""
    id: str = Field(..., description="Unique file identifier (UUID)")
    sizeBytes: int = Field(..., description="File size in bytes", ge=0)
    createdAt: datetime = Field(..., description="Upload timestamp")


# ==================== LIST ENDPOINT ====================

class FileListItem(BaseModel):
    """
    Single file in the list response.
    
    Note: Metadata stays encrypted! Client decrypts it locally.
    The 'isOwner' flag tells client if they can delete/manage the file.
    """
    id: str = Field(..., description="File identifier")
    ownerId: str = Field(..., description="User who uploaded the file")
    isOwner: bool = Field(..., description="Is the current user the owner?")
    encryptedMetadataB64: str = Field(
        ..., 
        description="Encrypted metadata blob (client decrypts)"
    )
    wrappedKeyB64: str = Field(
        ..., 
        description="File's DEK wrapped for this user"
    )
    sizeBytes: int = Field(..., description="File size in bytes", ge=0)
    createdAt: datetime = Field(..., description="Upload timestamp")


class FileListResponse(BaseModel):
    """
    Response for listing files.
    Includes both owned files and files shared with the user.
    """
    files: List[FileListItem] = Field(default=[], description="List of accessible files")


# ==================== DETAIL ENDPOINT ====================

class FileDetailResponse(BaseModel):
    """
    Detailed file information.
    Includes everything from list, plus sharing statistics.
    """
    id: str = Field(..., description="File identifier")
    ownerId: str = Field(..., description="User who uploaded the file")
    isOwner: bool = Field(..., description="Is the current user the owner?")
    encryptedMetadataB64: str = Field(
        ..., 
        description="Encrypted metadata blob"
    )
    wrappedKeyB64: str = Field(
        ..., 
        description="File's DEK wrapped for this user"
    )
    sizeBytes: int = Field(..., description="File size in bytes", ge=0)
    createdAt: datetime = Field(..., description="Upload timestamp")
    sharedWithCount: int = Field(
        ..., 
        description="Number of users this file is shared with (excluding owner)",
        ge=0
    )


# ==================== DOWNLOAD ENDPOINT ====================

class FileDownloadResponse(BaseModel):
    """
    Response for file download.
    
    Note: In practice, this will be a binary response (StreamingResponse)
    with the ciphertext as the body and metadata in headers.
    This schema documents what data is involved.
    """
    ciphertext: bytes = Field(..., description="Encrypted file bytes")
    encryptedMetadataB64: str = Field(..., description="Encrypted metadata")
    wrappedKeyB64: str = Field(..., description="Wrapped DEK for decryption")


# ==================== DELETE ENDPOINT ====================

class FileDeleteResponse(BaseModel):
    """Response after successful file deletion."""
    success: bool = Field(default=True, description="Deletion successful")
    message: str = Field(default="File deleted successfully", description="Status message")


# ==================== QUERY PARAMETERS ====================

class FileQueryParams(BaseModel):
    """
    Optional query parameters for filtering file lists.
    
    Future enhancements could include:
    - Filter by upload date
    - Filter by size
    - Sort order
    - Pagination (limit/offset)
    """
    limit: Optional[int] = Field(default=100, ge=1, le=1000, description="Max files to return")
    offset: Optional[int] = Field(default=0, ge=0, description="Number of files to skip")
    
    
# ==================== FILE METADATA STRUCTURE ====================

class DecryptedMetadata(BaseModel):
    """
    Structure of metadata AFTER client-side decryption.
    
    This is NOT sent over the wire - it's what the encrypted blob contains.
    Documented here for reference and type safety in client code.
    """
    filename: str = Field(..., description="Original filename", example="document.pdf")
    mimeType: str = Field(..., description="MIME type", example="application/pdf")
    sizeBytes: int = Field(..., description="Original file size", ge=0)
