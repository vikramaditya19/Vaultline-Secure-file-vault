from sqlalchemy import create_engine, text

try:
    engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT").execute(text('CREATE DATABASE vaultline'))
    print('✅ Database created!')
except Exception as e:
    if 'already exists' in str(e):
        print('✅ Database already exists')
    else:
        print(f'❌ Error: {e}')
