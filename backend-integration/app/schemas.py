"""
schemas.py

Legacy file - kept for backwards compatibility.
All schemas are now organized in the schemas/ directory:
- schemas/auth.py: Authentication schemas
- schemas/files.py: File operation schemas
- schemas/sharing.py: File sharing schemas

Import from schemas/ instead:
    from app.schemas.auth import RegisterRequest, LoginRequest
    from app.schemas.files import FileUploadResponse, FileListResponse
    from app.schemas.sharing import ShareFileRequest
"""

# Re-export everything from schemas/ for convenience
from app.schemas.auth import *
from app.schemas.files import *
from app.schemas.sharing import *
