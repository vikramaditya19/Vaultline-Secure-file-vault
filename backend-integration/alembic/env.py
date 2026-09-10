"""
Alembic Environment Configuration

This file is run whenever Alembic migrations are executed.
It connects Alembic to our database and SQLAlchemy models.

What is Alembic?
================
Alembic is a database migration tool for SQLAlchemy.
It tracks changes to your database schema over time.

Why Use Migrations?
===================
Without migrations:
- Manually run CREATE TABLE / ALTER TABLE commands
- Hard to track what changed
- Difficult to update production databases
- Can't easily roll back changes

With migrations:
- Automatic schema tracking
- Version control for database
- Safe production updates
- Easy rollback capability

How Migrations Work:
====================
1. You change a model in models.py
2. Run: alembic revision --autogenerate -m "Added user table"
3. Alembic compares models to current database
4. Generates migration script with upgrade/downgrade
5. Run: alembic upgrade head
6. Database is updated
"""

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Import our config and models
from app.config import settings
from app.models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the SQLAlchemy URL from our settings
# This overrides whatever is in alembic.ini
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

"""
What is target_metadata?
=========================
This tells Alembic what the database SHOULD look like.
Alembic compares this to the actual database to generate migrations.

Base.metadata contains all our SQLAlchemy models:
- User
- File
- Share

When you import new models, they're automatically included!
"""


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    
    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well. By skipping the Engine creation
    we don't even need a DBAPI to be available.
    
    Calls to context.execute() here emit the given string to the
    script output.
    
    Use Case:
    ---------
    Generate SQL scripts without database connection.
    Useful for review before applying.
    
    Example:
    --------
    alembic upgrade head --sql > migration.sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    
    In this scenario we need to create an Engine
    and associate a connection with the context.
    
    This is the normal mode - connects to database and applies changes.
    
    Use Case:
    ---------
    Actually modify the database.
    
    Example:
    --------
    alembic upgrade head
    """
    
    # Create engine from config
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # Don't use connection pooling in migrations
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


# Determine which mode to use
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
