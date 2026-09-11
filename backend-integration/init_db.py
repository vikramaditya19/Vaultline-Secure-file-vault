#!/usr/bin/env python
"""
Initialize the database by creating all tables.
Run this ONCE after setting up PostgreSQL and the vaultline database.

Usage:
    python init_db.py
"""

from app.database import init_db, test_connection
# Import all models to register them with SQLAlchemy
from app import models

if __name__ == "__main__":
    print("Testing database connection...")
    if not test_connection():
        print("\nERROR: Cannot connect to database!")
        print("Make sure:")
        print("1. PostgreSQL is running")
        print("2. The 'vaultline' database exists in pgAdmin")
        print("3. .env file has correct DATABASE_URL")
        exit(1)
    
    print("✅ Database connection successful!")
    print("\nCreating tables...")
    init_db()
    print("✅ All tables created successfully!")
    print("\nDatabase is ready to use!")
