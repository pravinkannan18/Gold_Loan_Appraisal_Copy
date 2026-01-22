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
        load_dotenv(override=True)
        
        host = os.getenv('DB_HOST', '').strip()
        database_url = os.getenv('DATABASE_URL', '').strip()
        
        if host:
            self.connection_string = None
            self.connection_params = {
                'host': host,
                'port': os.getenv('DB_PORT', '5432').strip(),
                'database': os.getenv('DB_NAME', 'postgres').strip(),
                'user': os.getenv('DB_USER', 'postgres').strip(),
                'password': os.getenv('DB_PASSWORD', '').strip(),
            }
            if "supabase" in host.lower():
                self.connection_params['sslmode'] = 'require'
        elif database_url:
            self.connection_string = database_url.replace('postgresql+psycopg2://', 'postgresql://')
            if "supabase" in self.connection_string.lower() and "sslmode" not in self.connection_string:
                sep = "&" if "?" in self.connection_string else "?"
                self.connection_string += f"{sep}sslmode=require"
            self.connection_params = None
        else:
            self.connection_string = "postgresql://postgres:admin@localhost:5432/gold_loan_appraisal"
            self.connection_params = None

        self.init_database()
    
    def get_connection(self):
        try:
            if self.connection_params:
                return psycopg2.connect(**self.connection_params)
            elif self.connection_string:
                return psycopg2.connect(self.connection_string)
            else:
                raise ValueError("No connection parameters or string available")
        except Exception as e:
            raise e
    
    def reset_database(self):
        """Reset database by dropping all known tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            tables = [
                "appraiser_details", "customer_details", "rbi_compliance_details", 
                "purity_test_details", "overall_sessions", 
                "appraisers", "appraisals", "appraisal_sessions" 
            ]
            for table in tables:
                cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
            conn.commit()
            print("Database reset successfully.")
            self.init_database() # Re-init
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

    def init_database(self):
        """Initialize database tables with new schema"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 1. Overall Sessions (Master Table)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS overall_sessions (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'in_progress',
                    
                    /* Common Fields (Redundant) */
                    name TEXT,
                    bank TEXT,
                    branch TEXT,
                    email TEXT,
                    phone TEXT,
                    appraiser_id TEXT,
                    image_data TEXT,
                    face_encoding TEXT  /* For persistent recognition */
                )
            ''')

            # 2. Appraiser Details
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS appraiser_details (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL REFERENCES overall_sessions(session_id) ON DELETE CASCADE,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    /* Redundant Fields */
                    name TEXT,
                    bank TEXT,
                    branch TEXT,
                    email TEXT,
                    phone TEXT,
                    appraiser_id TEXT,
                    image_data TEXT,
                    face_encoding TEXT
                )
            ''')

            # 3. Customer Details
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS customer_details (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL REFERENCES overall_sessions(session_id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    /* Specific Fields */
                    customer_image TEXT,
                    
                    /* Redundant Fields */
                    name TEXT,
                    bank TEXT,
                    branch TEXT,
                    email TEXT,
                    phone TEXT,
                    appraiser_id TEXT,
                    image_data TEXT
                )
            ''')

            # 4. RBI Compliance Details
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS rbi_compliance_details (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL REFERENCES overall_sessions(session_id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    /* Specific Fields */
                    total_items INTEGER DEFAULT 0,
                    overall_images TEXT, 
                    item_images TEXT,    
                    gps_coords TEXT,    
                    
                    /* Redundant Fields */
                    name TEXT,
                    bank TEXT,
                    branch TEXT,
                    email TEXT,
                    phone TEXT,
                    appraiser_id TEXT,
                    image_data TEXT
                )
            ''')

            # 5. Purity Test Details
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS purity_test_details (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL REFERENCES overall_sessions(session_id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    /* Specific Fields */
                    total_items INTEGER DEFAULT 0,
                    results TEXT,        
                    
                    /* Redundant Fields */
                    name TEXT,
                    bank TEXT,
                    branch TEXT,
                    email TEXT,
                    phone TEXT,
                    appraiser_id TEXT,
                    image_data TEXT
                )
            ''')
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    def test_connection(self) -> bool:
        try:
            conn = self.get_connection()
            conn.close()
            return True
        except Exception:
            return False

    # =========================================================================
    # New Workflow Methods
    # =========================================================================

    def create_session(self) -> str:
        """Create a new session in overall_sessions"""
        import uuid
        session_id = str(uuid.uuid4())
        
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO overall_sessions (session_id)
                VALUES (%s)
                RETURNING session_id
            ''', (session_id,))
            result = cursor.fetchone()
            conn.commit()
            return result[0]
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

    def _get_common_info(self, cursor, session_id):
        cursor.execute('''
            SELECT name, bank, branch, email, phone, appraiser_id, image_data 
            FROM overall_sessions WHERE session_id = %s
        ''', (session_id,))
        return cursor.fetchone()

    def save_appraiser_details(self, session_id: str, data: Dict[str, Any]) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Update overall_sessions
            cursor.execute('''
                UPDATE overall_sessions
                SET name = %s, bank = %s, branch = %s, email = %s, phone = %s, 
                    appraiser_id = %s, image_data = %s
                WHERE session_id = %s
            ''', (
                data.get('name'), data.get('bank'), data.get('branch'), 
                data.get('email'), data.get('phone'), data.get('id'), 
                data.get('image'), session_id
            ))
            
            # Insert into appraiser_details
            cursor.execute('''
                INSERT INTO appraiser_details (
                    session_id, name, bank, branch, email, phone, appraiser_id, image_data, timestamp
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                session_id, data.get('name'), data.get('bank'), data.get('branch'), 
                data.get('email'), data.get('phone'), data.get('id'), 
                data.get('image'), data.get('timestamp') or datetime.now()
            ))
            
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

    def save_customer_details(self, session_id: str, data: Dict[str, Any]) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            common = self._get_common_info(cursor, session_id)
            if not common:
                raise ValueError("Session not found or Appraiser data missing")

            cursor.execute('''
                INSERT INTO customer_details (
                    session_id, customer_image,
                    name, bank, branch, email, phone, appraiser_id, image_data
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                session_id, data.get('customer_front_image'), 
                common['name'], common['bank'], common['branch'], common['email'], 
                common['phone'], common['appraiser_id'], common['image_data']
            ))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

    def save_rbi_compliance(self, session_id: str, data: Dict[str, Any]) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            common = self._get_common_info(cursor, session_id)
            if not common:
                raise ValueError("Session not found")

            overall_images = json.dumps(data.get('overall_images') or []) if isinstance(data.get('overall_images'), list) else data.get('overall_images')
            item_images = json.dumps(data.get('jewellery_items') or []) if isinstance(data.get('jewellery_items'), list) else data.get('jewellery_items')
            
            cursor.execute('''
                INSERT INTO rbi_compliance_details (
                    session_id, total_items, overall_images, item_images,
                    name, bank, branch, email, phone, appraiser_id, image_data
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                session_id, data.get('total_items'), overall_images, item_images,
                common['name'], common['bank'], common['branch'], common['email'], 
                common['phone'], common['appraiser_id'], common['image_data']
            ))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

    def save_purity_details(self, session_id: str, data: Dict[str, Any]) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            common = self._get_common_info(cursor, session_id)
            if not common:
                raise ValueError("Session not found")

            results = json.dumps(data) if isinstance(data, (dict, list)) else data

            cursor.execute('''
                INSERT INTO purity_test_details (
                    session_id, results,
                    name, bank, branch, email, phone, appraiser_id, image_data
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                session_id, results,
                common['name'], common['bank'], common['branch'], common['email'], 
                common['phone'], common['appraiser_id'], common['image_data']
            ))
            
            cursor.execute("UPDATE overall_sessions SET status = 'purity_completed' WHERE session_id = %s", (session_id,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
            
    # =========================================================================
    # Compatibility Layer
    # =========================================================================
    
    def update_session_field(self, session_id: str, field: str, data: Any) -> bool:
        if field == 'appraiser_data':
            return self.save_appraiser_details(session_id, data)
        elif field == 'purity_results':
            return self.save_purity_details(session_id, data)
        elif field == 'status':
            conn = self.get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("UPDATE overall_sessions SET status = %s WHERE session_id = %s", (data, session_id))
                conn.commit()
                return True
            finally:
                cursor.close()
                conn.close()
        return True

    def update_session_multiple(self, session_id: str, updates: Dict[str, Any]) -> bool:
        if 'customer_front_image' in updates:
            data = {'customer_front_image': updates.get('customer_front_image')}
            return self.save_customer_details(session_id, data)
        
        if 'rbi_compliance' in updates:
            rbi_data = updates.get('rbi_compliance', {})
            rbi_data['total_items'] = updates.get('total_items')
            rbi_data['jewellery_items'] = updates.get('jewellery_items')
            return self.save_rbi_compliance(session_id, rbi_data)
        return True

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute("SELECT * FROM overall_sessions WHERE session_id = %s", (session_id,))
            overall = cursor.fetchone()
            if not overall:
                return None
            result = dict(overall)
            
            cursor.execute("SELECT customer_image FROM customer_details WHERE session_id = %s ORDER BY created_at DESC LIMIT 1", (session_id,))
            cust = cursor.fetchone()
            if cust:
                result['customer_front_image'] = cust['customer_image']
            
            cursor.execute("SELECT * FROM rbi_compliance_details WHERE session_id = %s ORDER BY created_at DESC LIMIT 1", (session_id,))
            rbi = cursor.fetchone()
            if rbi:
                # Always set total_items first (integer, no parsing needed)
                result['total_items'] = rbi['total_items'] or 0
                
                # Parse JSON fields separately with individual error handling
                try:
                    result['rbi_compliance'] = {
                        'overall_images': json.loads(rbi['overall_images']) if rbi['overall_images'] else [],
                        'total_items': rbi['total_items'] or 0
                    }
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"Warning: Failed to parse overall_images: {e}")
                    result['rbi_compliance'] = {'overall_images': [], 'total_items': rbi['total_items'] or 0}
                
                try:
                    result['jewellery_items'] = json.loads(rbi['item_images']) if rbi['item_images'] else []
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"Warning: Failed to parse item_images: {e}")
                    result['jewellery_items'] = []

            cursor.execute("SELECT results, total_items FROM purity_test_details WHERE session_id = %s ORDER BY created_at DESC LIMIT 1", (session_id,))
            pure = cursor.fetchone()
            if pure:
                try:
                    result['purity_results'] = json.loads(pure['results']) if pure['results'] else {}
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"Warning: Failed to parse purity_results: {e}")
                    result['purity_results'] = {}
            
            result['appraiser_data'] = {
                'name': overall['name'],
                'id': overall['appraiser_id'],
                'bank': overall['bank'],
                'branch': overall['branch'],
                'email': overall['email'],
                'phone': overall['phone'],
                'image': overall['image_data']
            }
            return result
        finally:
            cursor.close()
            conn.close()

    def delete_session(self, session_id: str) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM overall_sessions WHERE session_id = %s", (session_id,))
            conn.commit()
            return True
        finally:
            cursor.close()
            conn.close()

    def close(self):
        pass

    # =========================================================================
    # Face Recognition & Appraiser Registration
    # =========================================================================
    
    def insert_appraiser(self, name, appraiser_id, image_data, timestamp, face_encoding=None, 
                         bank=None, branch=None, email=None, phone=None):
        """
        Store 'Registered' Appraiser in overall_sessions with a special session_id prefix.
        This serves as the Master Appraiser List.
        """
        pseudo_session_id = f"registration_{appraiser_id}"
        
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Upsert logic
            cursor.execute("SELECT id FROM overall_sessions WHERE session_id = %s", (pseudo_session_id,))
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute('''
                    UPDATE overall_sessions 
                    SET name = %s, image_data = %s, face_encoding = %s, status = 'registered', created_at = %s,
                        bank = %s, branch = %s, email = %s, phone = %s
                    WHERE session_id = %s
                    RETURNING id
                ''', (name, image_data, face_encoding, timestamp, 
                      bank, branch, email, phone,
                      pseudo_session_id))
            else:
                cursor.execute('''
                    INSERT INTO overall_sessions (
                        session_id, name, appraiser_id, image_data, face_encoding, status, created_at,
                        bank, branch, email, phone
                    ) VALUES (%s, %s, %s, %s, %s, 'registered', %s, %s, %s, %s, %s)
                    RETURNING id
                ''', (pseudo_session_id, name, appraiser_id, image_data, face_encoding, timestamp,
                      bank, branch, email, phone))
            
            result = cursor.fetchone()
            conn.commit()
            return result['id']
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

    def get_all_appraisers_with_face_encoding(self) -> List[Dict[str, Any]]:
        """Fetch registered appraisers for facial recognition"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Only fetch 'registered' status rows to avoid confusion with actual sessions
            cursor.execute('''
                SELECT id, name, appraiser_id, image_data, face_encoding, created_at
                FROM overall_sessions 
                WHERE face_encoding IS NOT NULL AND status = 'registered'
            ''')
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            cursor.close()
            conn.close()
            
    def get_appraiser_by_id(self, appraiser_id: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            pseudo_session_id = f"registration_{appraiser_id}"
            cursor.execute("SELECT * FROM overall_sessions WHERE session_id = %s", (pseudo_session_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            cursor.close()
            conn.close()

    def get_statistics(self) -> Dict[str, Any]:
        """Get stats from overall_sessions"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute("SELECT COUNT(*) as total FROM overall_sessions WHERE status != 'registered'")
            total_appraisals = cursor.fetchone()['total']
            
            # This is tricky because item counts are in other tables.
            # We can sum from rbi_compliance_details
            cursor.execute("SELECT SUM(total_items) as total FROM rbi_compliance_details")
            items = cursor.fetchone()
            total_items = items['total'] if items['total'] else 0
            
            return {
                "total_appraisals": total_appraisals,
                "total_items": total_items,
                "total_appraisers": 0, # Placeholder
                "recent_appraisals": []
            }
        finally:
            cursor.close()
            conn.close()
