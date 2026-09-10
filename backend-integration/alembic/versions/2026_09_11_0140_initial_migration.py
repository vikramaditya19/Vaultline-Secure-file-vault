"""Initial migration - Create users, files, and shares tables

Revision ID: 001_initial
Revises: 
Create Date: 2026-09-11 01:40:00.000000

This is the initial migration that creates all tables for the Vaultline backend.

Tables Created:
===============
1. users - User accounts with authentication and crypto keys
2. files - Encrypted file storage with metadata
3. shares - File sharing relationships (junction table)

Security Note:
==============
All sensitive data in these tables is encrypted or hashed:
- Passwords → bcrypt(PBKDF2(password))
- Private keys → AES-encrypted with user's wrapKey
- File content → AES-256-GCM encrypted (stored on disk)
- Filenames → Encrypted in metadata blob
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create all tables for the application.
    
    This is run when: alembic upgrade head
    """
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_auth_proof', sa.String(length=255), nullable=False),
        sa.Column('salt', sa.String(length=64), nullable=False),
        sa.Column('public_key', sa.Text(), nullable=False),
        sa.Column('wrapped_private_key', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    # Create files table
    op.create_table(
        'files',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('owner_id', sa.String(), nullable=False),
        sa.Column('ciphertext_path', sa.String(length=512), nullable=False),
        sa.Column('encrypted_metadata', sa.Text(), nullable=False),
        sa.Column('wrapped_key', sa.Text(), nullable=False),
        sa.Column('size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_files_owner_id'), 'files', ['owner_id'], unique=False)
    
    # Create shares table
    op.create_table(
        'shares',
        sa.Column('file_id', sa.String(), nullable=False),
        sa.Column('recipient_id', sa.String(), nullable=False),
        sa.Column('wrapped_key_for_recipient', sa.Text(), nullable=False),
        sa.Column('shared_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['file_id'], ['files.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('file_id', 'recipient_id')
    )


def downgrade() -> None:
    """
    Drop all tables.
    
    This is run when: alembic downgrade -1
    
    ⚠️ WARNING: This deletes all data!
    """
    
    # Drop in reverse order (foreign keys first)
    op.drop_table('shares')
    op.drop_index(op.f('ix_files_owner_id'), table_name='files')
    op.drop_table('files')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
