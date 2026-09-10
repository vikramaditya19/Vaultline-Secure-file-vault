"""
database.py

Database connection and session management for SQLAlchemy.

Key Concepts:
=============
1. Engine: The connection pool to the database
   - Created once at startup
   - Manages multiple connections efficiently
   - Thread-safe

2. SessionLocal: Factory for creating database sessions
   - Each request gets its own session
   - Sessions are NOT thread-safe
   - Must be closed after use

3. Dependency Injection: get_db() function
   - FastAPI calls this for each request
   - Provides a database session
   - Automatically closes the session when done (even if error occurs)

Why This Pattern?
=================
- Separation of concerns: database logic separate from business logic
- Connection pooling: reuse connections instead of creating new ones
- Automatic cleanup: sessions always closed, preventing memory leaks
- Easy testing: can swap out the database for tests
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.config import settings


# ==================== ENGINE SETUP ====================

# Create the database engine
# This is the core connection to PostgreSQL
engine = create_engine(
    settings.DATABASE_URL,
    
    # Connection pool settings
    pool_pre_ping=True,          # Verify connections before using them
    pool_size=10,                 # Keep 10 connections open
    max_overflow=20,              # Allow up to 20 additional connections if needed
    
    # Logging
    echo=settings.DATABASE_ECHO,  # Log all SQL queries (for debugging)
)

"""
What is pool_pre_ping?
- Before using a connection, test if it's still alive
- If connection died (database restarted), create a new one
- Prevents "connection already closed" errors

What is pool_size and max_overflow?
- pool_size=10: Always keep 10 connections open
- max_overflow=20: If all 10 are busy, create up to 20 more
- Total max connections = pool_size + max_overflow = 30
"""


# ==================== SESSION FACTORY ====================

# Create a session factory
# This is a CLASS that creates session instances
SessionLocal = sessionmaker(
    bind=engine,              # Connect to our engine
    autocommit=False,         # Don't auto-commit changes (we control it)
    autoflush=False,          # Don't auto-flush before queries (we control it)
    expire_on_commit=False,   # Keep objects usable after commit
)

"""
Why autocommit=False and autoflush=False?
- We want explicit control over when changes are saved
- Prevents accidental database writes
- Makes code more predictable

What is expire_on_commit=False?
- Normally, after session.commit(), all objects become "expired"
- You'd need to re-fetch them from the database
- expire_on_commit=False keeps objects usable after commit
- Useful when we return objects from functions
"""


# ==================== DEPENDENCY INJECTION ====================

def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI routes.
    
    Usage in a route:
    -----------------
    @router.get("/users")
    def get_users(db: Session = Depends(get_db)):
        users = db.query(User).all()
        return users
    
    How it works:
    -------------
    1. FastAPI calls get_db() before executing the route
    2. Creates a new database session
    3. Passes it to the route function as the 'db' parameter
    4. After the route finishes, closes the session (in the 'finally' block)
    5. Even if an error occurs, the session is still closed properly
    
    Why Generator?
    --------------
    - 'yield' pauses the function and returns the session
    - FastAPI uses the session in the route
    - After the route finishes, execution resumes after 'yield'
    - The 'finally' block always runs to close the session
    
    Returns:
    --------
    Generator that yields a database Session
    """
    
    # Create a new session
    db = SessionLocal()
    
    try:
        # Yield the session to the route
        # The route uses it to query/modify the database
        yield db
        
    finally:
        # This ALWAYS runs, even if the route raised an exception
        # Close the session to return the connection to the pool
        db.close()


# ==================== DATABASE INITIALIZATION ====================

def init_db() -> None:
    """
    Initialize the database by creating all tables.
    
    This function should be called once at application startup.
    In production, you'd use Alembic migrations instead.
    
    Note:
    -----
    - This creates tables if they don't exist
    - Does NOT drop existing tables
    - Does NOT migrate existing tables to new schemas
    """
    from app.models import Base
    
    # Create all tables defined in models.py
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")


def drop_db() -> None:
    """
    Drop all tables from the database.
    
    ⚠️ WARNING: This deletes ALL data!
    Only use this for testing or development reset.
    
    Never call this in production!
    """
    from app.models import Base
    
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    print("🗑️ All database tables dropped")


# ==================== UTILITY FUNCTIONS ====================

def get_db_session() -> Session:
    """
    Get a database session for use outside of FastAPI routes.
    
    ⚠️ IMPORTANT: You must manually close this session!
    
    Usage:
    ------
    db = get_db_session()
    try:
        # Use the session
        user = db.query(User).first()
    finally:
        db.close()
    
    For FastAPI routes, use get_db() with Depends() instead.
    This function is for scripts, background tasks, etc.
    
    Returns:
    --------
    Database Session (must be manually closed!)
    """
    return SessionLocal()


def test_connection() -> bool:
    """
    Test if the database connection is working.
    
    Returns:
    --------
    True if connection successful, False otherwise
    
    Usage:
    ------
    if test_connection():
        print("Database is ready!")
    else:
        print("Cannot connect to database")
    """
    try:
        # Try to connect
        db = SessionLocal()
        
        # Execute a simple query
        db.execute("SELECT 1")
        
        # Close the session
        db.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


# ==================== SESSION CONTEXT MANAGER ====================

class DatabaseSession:
    """
    Context manager for database sessions.
    
    Provides a clean way to use database sessions with automatic cleanup.
    
    Usage:
    ------
    with DatabaseSession() as db:
        user = db.query(User).filter_by(email="test@example.com").first()
        # Session automatically closed when exiting the 'with' block
    
    This is equivalent to:
    ----------------------
    db = get_db_session()
    try:
        user = db.query(User).filter_by(email="test@example.com").first()
    finally:
        db.close()
    """
    
    def __enter__(self) -> Session:
        """Called when entering the 'with' block."""
        self.db = SessionLocal()
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Called when exiting the 'with' block."""
        self.db.close()
        # Return False to propagate any exception that occurred
        return False


# ==================== EXPORT ====================

# These are the main things other modules will import
__all__ = [
    "engine",
    "SessionLocal",
    "get_db",
    "init_db",
    "drop_db",
    "test_connection",
    "DatabaseSession",
]
