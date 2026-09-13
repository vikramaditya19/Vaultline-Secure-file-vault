"""
config.py

Centralized configuration management using Pydantic Settings.
All sensitive values (database credentials, JWT secret) are loaded from 
environment variables, never hardcoded in the source code.

Why Pydantic Settings?
- Type validation: ensures DATABASE_URL is a string, JWT_EXPIRE_MINUTES is an int, etc.
- Environment variable loading: automatically reads from .env file
- Default values: provides sensible defaults for development
- Clear documentation: all config in one place
"""

from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file.
    
    To override any setting, create a .env file in backend-integration/ with:
    DATABASE_URL=postgresql://user:password@localhost:5432/vaultline
    SECRET_KEY=your-super-secret-key-here
    """
    
    # ==================== DATABASE SETTINGS ====================
    
    # PostgreSQL connection string
    # Format: postgresql://username:password@host:port/database_name
    # Example: postgresql://vaultuser:securepass@localhost:5432/vaultline_db
    # SQLite keeps the classroom demo zero-setup. Production can override this
    # with postgresql+psycopg://user:password@host/database.
    DATABASE_URL: str = f"sqlite:///{(BASE_DIR / 'vaultline.db').as_posix()}"
    
    # Enable SQL query logging (set to False in production for performance)
    DATABASE_ECHO: bool = False
    
    
    # ==================== JWT SETTINGS ====================
    
    # Secret key for signing JWT tokens - MUST be changed in production!
    # Generate a secure key with: openssl rand -hex 32
    SECRET_KEY: str = "vaultline-development-key-change-before-production"
    
    # Algorithm used to sign JWT tokens (HS256 = HMAC with SHA-256)
    ALGORITHM: str = "HS256"
    
    # Token expiration time in minutes (24 hours = 1440 minutes)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    
    # ==================== FILE STORAGE SETTINGS ====================
    
    # Directory where encrypted files will be stored
    # This stores the CIPHERTEXT only - server never sees plaintext
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    
    # Maximum file size in bytes (100 MB)
    # Frontend encrypts files, so ciphertext is slightly larger than plaintext
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100 MB
    
    
    # ==================== SECURITY SETTINGS ====================
    
    # Bcrypt rounds for password hashing (higher = slower but more secure)
    # 12 rounds is a good balance between security and performance
    BCRYPT_ROUNDS: int = 12
    
    
    # ==================== CORS SETTINGS ====================
    
    # Allowed origins for CORS (Cross-Origin Resource Sharing)
    # Frontend runs on localhost:5173 during development
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative frontend port
        "http://127.0.0.1:5173",
    ]
    
    
    # ==================== APPLICATION SETTINGS ====================
    
    # Application name (used in API docs)
    APP_NAME: str = "Vaultline Secure File Vault"
    
    # API version
    API_VERSION: str = "1.0.0"
    
    # Debug mode (disable in production)
    DEBUG: bool = False

    # Production startup refuses the shared development signing key.
    ENVIRONMENT: Literal["development", "test", "production"] = "development"
    
    
    # Pydantic Settings configuration
    model_config = SettingsConfigDict(
        # Look for .env file in backend-integration/ directory
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        # Allow extra fields without validation errors
        extra="ignore",
        # Make settings case-insensitive
        case_sensitive=False,
    )

    @model_validator(mode="after")
    def validate_production_secret(self):
        if self.ENVIRONMENT == "production" and self.SECRET_KEY == "vaultline-development-key-change-before-production":
            raise ValueError("SECRET_KEY must be set to a unique value in production")
        if self.ENVIRONMENT == "production" and len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY must contain at least 32 characters in production")
        return self


# ==================== SINGLETON INSTANCE ====================

# Create a single instance to be imported throughout the app
# This ensures all modules use the same configuration
settings = Settings()


# ==================== INITIALIZATION ====================

# Create upload directory if it doesn't exist
# This runs once when the app starts
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ==================== HELPER FUNCTIONS ====================

def get_database_url() -> str:
    """
    Returns the database URL for SQLAlchemy.
    Useful if we need to modify the URL (e.g., for async drivers).
    """
    return settings.DATABASE_URL


def get_upload_path(file_id: str) -> Path:
    """
    Returns the full path where a file should be stored.
    
    Args:
        file_id: Unique identifier for the file (UUID)
    
    Returns:
        Path object pointing to the file location
        
    Example:
        get_upload_path("abc-123") -> Path("uploads/abc-123.enc")
    """
    return settings.UPLOAD_DIR / f"{file_id}.enc"
