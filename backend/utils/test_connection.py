"""
Quick test to verify DATABASE_URL parsing and connection
"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

def test_database_url_parsing():
    """Test DATABASE_URL parsing with @ in password"""
    import re
    
    test_urls = [
        "postgresql://postgres:admin@localhost:5432/gold_loan_appraisal",
        "postgresql://postgres:admin@123@localhost:5432/gold_loan_appraisal",
        "postgresql://user:p@ssw0rd@host.com:5432/mydb",
    ]
    
    pattern = r'postgresql(?:\+psycopg2)?://([^:]+):(.+?)@([^:]+):(\d+)/(.+)'
    
    print("Testing DATABASE_URL parsing:")
    print("=" * 60)
    
    for url in test_urls:
        print(f"\nURL: {url}")
        match = re.match(pattern, url)
        if match:
            user, password, host, port, database = match.groups()
            print(f"  ✓ User: {user}")
            print(f"  ✓ Password: {password}")
            print(f"  ✓ Host: {host}")
            print(f"  ✓ Port: {port}")
            print(f"  ✓ Database: {database}")
        else:
            print(f"  ✗ Failed to parse")
    
    print("\n" + "=" * 60)

def test_connection():
    """Test actual database connection"""
    print("\nTesting database connection:")
    print("=" * 60)
    
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("✗ DATABASE_URL not found in .env")
        return False
    
    print(f"DATABASE_URL: {database_url}")
    
    try:
        conn = psycopg2.connect(database_url)
        print("✓ Connection successful!")
        
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✓ PostgreSQL version: {version[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False

if __name__ == "__main__":
    test_database_url_parsing()
    test_connection()
