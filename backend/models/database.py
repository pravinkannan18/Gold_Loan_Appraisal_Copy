import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from typing import Optional, List, Dict, Any
import json
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        """Initialize Database connection (Supabase/PostgreSQL)"""
        # Load environment variables explicitly
        load_dotenv(override=True)
        
        # Priority: Individual variables (easier to manage) -> DATABASE_URL
        host = os.getenv('DB_HOST', '').strip()
        database_url = os.getenv('DATABASE_URL', '').strip()
        
        print(f"\n--- Database Initialization Debug ---")
        
        if host:
            # Using individual parameters
            self.connection_string = None
            self.connection_params = {
                'host': host,
                'port': os.getenv('DB_PORT', '5432').strip(),
                'database': os.getenv('DB_NAME', 'postgres').strip(),
                'user': os.getenv('DB_USER', 'postgres').strip(),
                'password': os.getenv('DB_PASSWORD', '').strip(),
            }
            # Add SSL requirement for Supabase
            if "supabase" in host.lower():
                self.connection_params['sslmode'] = 'require'
                
            print(f"STATUS: Using individual parameters")
            print(f"DEBUG: Host={self.connection_params['host']}, User={self.connection_params['user']}")
        elif database_url:
            # Falling back to connection string
            self.connection_string = database_url.replace('postgresql+psycopg2://', 'postgresql://')
            if "supabase" in self.connection_string.lower() and "sslmode" not in self.connection_string:
                sep = "&" if "?" in self.connection_string else "?"
                self.connection_string += f"{sep}sslmode=require"
            
            import re
            masked = re.sub(r':([^@]+)@', ':****@', self.connection_string)
            print(f"STATUS: Using DATABASE_URL connection string")
            print(f"DEBUG: {masked}")
            self.connection_params = None
        else:
            # Default to local
            print("STATUS: No environment variables found, using local default")
            self.connection_string = "postgresql://postgres:admin@localhost:5432/gold_loan_appraisal"
            self.connection_params = None

        print(f"--------------------------------------\n")
        self.init_database()
    
    def _parse_database_url(self, url):
        """Parse DATABASE_URL into connection parameters"""
        import re
        # Format: postgresql://user:password@host:port/database
        # Use non-greedy match for password to handle @ in password
        pattern = r'postgresql(?:\+psycopg2)?://([^:]+):(.+?)@([^:]+):(\d+)/(.+)'
        match = re.match(pattern, url)
        if match:
            user, password, host, port, database = match.groups()
            self.connection_params = {
                'host': host,
                'port': port,
                'database': database,
                'user': user,
                'password': password,
            }
        else:
            raise ValueError(f"Invalid DATABASE_URL format: {url}")
    
    def get_connection(self):
        """Get database connection with SSL support and helpful error handling"""
        try:
            if self.connection_params:
                # psycopg2 handles special characters in password automatically when passed via dict
                return psycopg2.connect(**self.connection_params)
            elif self.connection_string:
                return psycopg2.connect(self.connection_string)
            else:
                raise ValueError("No connection parameters or string available")
        except psycopg2.OperationalError as e:
            error_msg = str(e)
            print(f"\n❌ Database Connection Error: {error_msg}")
            
            if "host name" in error_msg.lower() or "not known" in error_msg.lower():
                print("\n💡 POSSIBLE SOLUTIONS:")
                print("1. Your computer cannot find the Supabase server. Check your internet connection.")
                print("2. Ensure your Supabase project is NOT PAUSED. Go to Supabase Dashboard and Resume if needed.")
                print("3. Try using the 'Transaction Pooler' connection string from Supabase (port 6543) instead of direct connection.")
                current_host = self.connection_params.get('host') if self.connection_params else "Supabase"
                print(f"4. Double check your host: {current_host}")
            
            raise e
        except Exception as e:
            print(f"❌ Unexpected connection failed: {e}")
            raise e
    
    def init_database(self):
        """Initialize database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Appraisers table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS appraisers (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    appraiser_id TEXT UNIQUE NOT NULL,
                    image_data TEXT,
                    face_encoding TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Add face_encoding column if it doesn't exist (for existing databases)
            try:
                cursor.execute('''
                    ALTER TABLE appraisers 
                    ADD COLUMN IF NOT EXISTS face_encoding TEXT
                ''')
                print("Added face_encoding column to appraisers table")
            except Exception as e:
                print(f"Face encoding column already exists or error: {e}")
            
            # Appraisals table
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
            
            # Jewellery items table
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
            
            # RBI compliance table
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
            
            # Purity tests table
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
            
            conn.commit()
            print("PostgreSQL database initialized successfully")
        except Exception as e:
            conn.rollback()
            print(f"Error initializing database: {e}")
            raise
        finally:
            cursor.close()
            conn.close()
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            conn = self.get_connection()
            conn.close()
            return True
        except Exception as e:
            print(f"Database connection error: {e}")
            return False
    
    # Appraiser operations
    def insert_appraiser(self, name: str, appraiser_id: str, image_data: str, timestamp: str, face_encoding: str = None) -> int:
        """Insert or update appraiser details"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Check if appraiser already exists
            cursor.execute("SELECT id FROM appraisers WHERE appraiser_id = %s", (appraiser_id,))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing appraiser
                cursor.execute('''
                    UPDATE appraisers 
                    SET name = %s, image_data = %s, face_encoding = %s
                    WHERE appraiser_id = %s
                    RETURNING id
                ''', (name, image_data, face_encoding, appraiser_id))
                result = cursor.fetchone()
                appraiser_db_id = result['id']
            else:
                # Insert new appraiser
                cursor.execute('''
                    INSERT INTO appraisers (name, appraiser_id, image_data, face_encoding)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                ''', (name, appraiser_id, image_data, face_encoding))
                result = cursor.fetchone()
                appraiser_db_id = result['id']
            
            conn.commit()
            return appraiser_db_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def get_appraiser_by_id(self, appraiser_id: str) -> Optional[Dict[str, Any]]:
        """Get appraiser by appraiser_id"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("SELECT * FROM appraisers WHERE appraiser_id = %s", (appraiser_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            cursor.close()
            conn.close()
    
    def get_all_appraisers_with_face_encoding(self) -> List[Dict[str, Any]]:
        """Get all appraisers that have face encodings for recognition"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("SELECT * FROM appraisers WHERE face_encoding IS NOT NULL")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            cursor.close()
            conn.close()
    
    # Appraisal operations
    def create_appraisal(self, appraiser_id: int, appraiser_name: str, 
                        total_items: int, purity: str, testing_method: str) -> int:
        """Create a new appraisal record"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute('''
                INSERT INTO appraisals (appraiser_id, appraiser_name, total_items, purity, testing_method)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            ''', (appraiser_id, appraiser_name, total_items, purity, testing_method))
            
            result = cursor.fetchone()
            appraisal_id = result['id']
            conn.commit()
            return appraisal_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def get_appraisal_by_id(self, appraisal_id: int) -> Optional[Dict[str, Any]]:
        """Get complete appraisal details with all related data"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Get appraisal
            cursor.execute("SELECT * FROM appraisals WHERE id = %s", (appraisal_id,))
            appraisal_row = cursor.fetchone()
            
            if not appraisal_row:
                return None
            
            appraisal = dict(appraisal_row)
            
            # Get appraiser details
            cursor.execute("SELECT * FROM appraisers WHERE id = %s", (appraisal['appraiser_id'],))
            appraiser_row = cursor.fetchone()
            if appraiser_row:
                appraisal['appraiser'] = dict(appraiser_row)
            
            # Get jewellery items
            cursor.execute("SELECT * FROM jewellery_items WHERE appraisal_id = %s", (appraisal_id,))
            items_rows = cursor.fetchall()
            appraisal['jewellery_items'] = [dict(row) for row in items_rows]
            
            # Get RBI compliance
            cursor.execute("SELECT * FROM rbi_compliance WHERE appraisal_id = %s", (appraisal_id,))
            rbi_row = cursor.fetchone()
            if rbi_row:
                appraisal['rbi_compliance'] = dict(rbi_row)
            
            # Get purity test
            cursor.execute("SELECT * FROM purity_tests WHERE appraisal_id = %s", (appraisal_id,))
            purity_row = cursor.fetchone()
            if purity_row:
                appraisal['purity_test'] = dict(purity_row)
            
            return appraisal
        finally:
            cursor.close()
            conn.close()
    
    def get_all_appraisals(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all appraisal records with pagination"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute('''
                SELECT id, appraiser_name, appraiser_id, total_items, purity, 
                       testing_method, status, created_at
                FROM appraisals
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            ''', (limit, skip))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            cursor.close()
            conn.close()
    
    def delete_appraisal(self, appraisal_id: int) -> bool:
        """Delete an appraisal and all related records"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("DELETE FROM appraisals WHERE id = %s", (appraisal_id,))
            affected = cursor.rowcount
            conn.commit()
            return affected > 0
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    # Jewellery item operations
    def insert_jewellery_item(self, appraisal_id: int, item_number: int, 
                             image_data: str, description: str,
                             weight: Optional[str] = None, 
                             category: Optional[str] = None) -> int:
        """Insert jewellery item"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute('''
                INSERT INTO jewellery_items 
                (appraisal_id, item_number, image_data, description, weight, category)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            ''', (appraisal_id, item_number, image_data, description, weight, category))
            
            result = cursor.fetchone()
            item_id = result['id']
            conn.commit()
            return item_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    # RBI compliance operations
    def insert_rbi_compliance(self, appraisal_id: int, customer_photo: str,
                             id_proof: str, appraiser_with_jewellery: str) -> int:
        """Insert RBI compliance images"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute('''
                INSERT INTO rbi_compliance 
                (appraisal_id, customer_photo, id_proof, appraiser_with_jewellery)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            ''', (appraisal_id, customer_photo, id_proof, appraiser_with_jewellery))
            
            result = cursor.fetchone()
            compliance_id = result['id']
            conn.commit()
            return compliance_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    # Purity test operations
    def insert_purity_test(self, appraisal_id: int, testing_method: str,
                          purity: str, remarks: Optional[str] = None) -> int:
        """Insert purity test results"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute('''
                INSERT INTO purity_tests 
                (appraisal_id, testing_method, purity, remarks)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            ''', (appraisal_id, testing_method, purity, remarks))
            
            result = cursor.fetchone()
            test_id = result['id']
            conn.commit()
            return test_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    # Statistics
    def get_statistics(self) -> Dict[str, Any]:
        """Get appraisal statistics"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Total appraisals
            cursor.execute("SELECT COUNT(*) as total FROM appraisals")
            total_appraisals = cursor.fetchone()['total']
            
            # Total items
            cursor.execute("SELECT SUM(total_items) as total FROM appraisals")
            result = cursor.fetchone()
            total_items = result['total'] if result['total'] else 0
            
            # Total appraisers
            cursor.execute("SELECT COUNT(*) as total FROM appraisers")
            total_appraisers = cursor.fetchone()['total']
            
            # Recent appraisals (last 10)
            cursor.execute('''
                SELECT id, appraiser_name, total_items, purity, created_at
                FROM appraisals
                ORDER BY created_at DESC
                LIMIT 10
            ''')
            recent = cursor.fetchall()
            
            return {
                "total_appraisals": total_appraisals,
                "total_items": total_items,
                "total_appraisers": total_appraisers,
                "recent_appraisals": [dict(row) for row in recent]
            }
        finally:
            cursor.close()
            conn.close()
    
    def close(self):
        """Close database connection (placeholder for cleanup)"""
        # PostgreSQL connections are managed per-request
        # This method exists for compatibility with the main.py shutdown event
        pass
