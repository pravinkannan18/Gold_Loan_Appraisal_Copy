"""
Database Setup Script for PostgreSQL
This script creates the database and all required tables
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Parse DATABASE_URL if provided
database_url = os.getenv('DATABASE_URL')
if database_url:
    import re
    # Format: postgresql://user:password@host:port/database
    # Use non-greedy match for password to handle @ in password
    pattern = r'postgresql(?:\+psycopg2)?://([^:]+):(.+?)@([^:]+):(\d+)/(.+)'
    match = re.match(pattern, database_url)
    if match:
        POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB = match.groups()
    else:
        raise ValueError(f"Invalid DATABASE_URL format: {database_url}")
else:
    # Use individual parameters
    POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
    POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')
    POSTGRES_DB = os.getenv('POSTGRES_DB', 'gold_loan_appraisal')
    POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
    POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'admin')

def create_database():
    """Create the database if it doesn't exist"""
    print("=" * 60)
    print("STEP 1: Creating Database")
    print("=" * 60)
    
    try:
        # Connect to PostgreSQL server (default 'postgres' database)
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            database='postgres'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (POSTGRES_DB,)
        )
        exists = cursor.fetchone()
        
        if exists:
            print(f"✓ Database '{POSTGRES_DB}' already exists")
        else:
            # Create database
            cursor.execute(f'CREATE DATABASE {POSTGRES_DB}')
            print(f"✓ Database '{POSTGRES_DB}' created successfully")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Error creating database: {e}")
        return False

def create_tables():
    """Create all required tables"""
    print("\n" + "=" * 60)
    print("STEP 2: Creating Tables")
    print("=" * 60)
    
    try:
        # Connect to the gold_loan_appraisal database
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            database=POSTGRES_DB
        )
        cursor = conn.cursor()
        
        # Create appraisers table
        print("\nCreating 'appraisers' table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS appraisers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                appraiser_id TEXT UNIQUE NOT NULL,
                image_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("✓ Table 'appraisers' created")
        
        # Create appraisals table
        print("Creating 'appraisals' table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS appraisals (
                id SERIAL PRIMARY KEY,
                appraiser_id INTEGER NOT NULL,
                appraiser_name TEXT NOT NULL,
                total_items INTEGER DEFAULT 0,
                purity TEXT,
                testing_method TEXT,
                status TEXT DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (appraiser_id) REFERENCES appraisers (id)
            )
        ''')
        print("✓ Table 'appraisals' created")
        
        # Create jewellery_items table
        print("Creating 'jewellery_items' table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS jewellery_items (
                id SERIAL PRIMARY KEY,
                appraisal_id INTEGER NOT NULL,
                item_number INTEGER NOT NULL,
                image_data TEXT,
                description TEXT,
                weight TEXT,
                category TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (appraisal_id) REFERENCES appraisals (id) ON DELETE CASCADE
            )
        ''')
        print("✓ Table 'jewellery_items' created")
        
        # Create rbi_compliance table
        print("Creating 'rbi_compliance' table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rbi_compliance (
                id SERIAL PRIMARY KEY,
                appraisal_id INTEGER NOT NULL,
                customer_photo TEXT,
                id_proof TEXT,
                appraiser_with_jewellery TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (appraisal_id) REFERENCES appraisals (id) ON DELETE CASCADE
            )
        ''')
        print("✓ Table 'rbi_compliance' created")
        
        # Create purity_tests table
        print("Creating 'purity_tests' table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS purity_tests (
                id SERIAL PRIMARY KEY,
                appraisal_id INTEGER NOT NULL,
                testing_method TEXT NOT NULL,
                purity TEXT NOT NULL,
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (appraisal_id) REFERENCES appraisals (id) ON DELETE CASCADE
            )
        ''')
        print("✓ Table 'purity_tests' created")
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        return False

def create_indexes():
    """Create indexes for better performance"""
    print("\n" + "=" * 60)
    print("STEP 3: Creating Indexes")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            database=POSTGRES_DB
        )
        cursor = conn.cursor()
        
        indexes = [
            ("idx_appraisers_appraiser_id", "appraisers(appraiser_id)"),
            ("idx_appraisals_appraiser_id", "appraisals(appraiser_id)"),
            ("idx_appraisals_created_at", "appraisals(created_at DESC)"),
            ("idx_jewellery_items_appraisal_id", "jewellery_items(appraisal_id)"),
            ("idx_rbi_compliance_appraisal_id", "rbi_compliance(appraisal_id)"),
            ("idx_purity_tests_appraisal_id", "purity_tests(appraisal_id)"),
        ]
        
        for index_name, index_def in indexes:
            print(f"Creating index '{index_name}'...")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {index_name} ON {index_def}")
            print(f"✓ Index '{index_name}' created")
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Error creating indexes: {e}")
        return False

def verify_setup():
    """Verify the database setup"""
    print("\n" + "=" * 60)
    print("STEP 4: Verifying Setup")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            database=POSTGRES_DB
        )
        cursor = conn.cursor()
        
        # List all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        print("\nTables created:")
        for table in tables:
            print(f"  ✓ {table[0]}")
        
        # Count records in each table
        print("\nRecord counts:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"  {table[0]}: {count} records")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Error verifying setup: {e}")
        return False

def main():
    """Main setup function"""
    print("\n" + "=" * 60)
    print("PostgreSQL Database Setup for Gold Loan Appraisal")
    print("=" * 60)
    print(f"\nConfiguration:")
    print(f"  Host: {POSTGRES_HOST}")
    print(f"  Port: {POSTGRES_PORT}")
    print(f"  Database: {POSTGRES_DB}")
    print(f"  User: {POSTGRES_USER}")
    print()
    
    # Step 1: Create database
    if not create_database():
        print("\n✗ Setup failed at database creation")
        return False
    
    # Step 2: Create tables
    if not create_tables():
        print("\n✗ Setup failed at table creation")
        return False
    
    # Step 3: Create indexes
    if not create_indexes():
        print("\n✗ Setup failed at index creation")
        return False
    
    # Step 4: Verify setup
    if not verify_setup():
        print("\n✗ Setup verification failed")
        return False
    
    # Success
    print("\n" + "=" * 60)
    print("✓ DATABASE SETUP COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print("\nYou can now start the backend server:")
    print("  python main.py")
    print()
    
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nSetup cancelled by user")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
