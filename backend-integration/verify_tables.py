from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:postgres@localhost:5432/vaultline')

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """))
    
    tables = result.fetchall()
    print("Tables in vaultline database:")
    for table in tables:
        print(f"  - {table[0]}")
    
    if not tables:
        print("  (No tables found)")
