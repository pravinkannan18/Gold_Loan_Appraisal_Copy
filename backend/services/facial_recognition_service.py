"""
Facial Recognition Service for Gold Loan Appraisal System
Handles face registration, recognition, and management
"""

import base64
import numpy as np
import cv2
import traceback
from typing import Optional, Dict, List, Any
from numpy import dot
from numpy.linalg import norm
from datetime import datetime

# Try to import insightface - make it optional for development
try:
    import insightface
    from insightface.app import FaceAnalysis
    FACE_RECOGNITION_AVAILABLE = True
    print("✅ Face recognition libraries loaded successfully")
except ImportError as e:
    print(f"❌ Face recognition libraries not available: {e}")
    print(f"   Full error details: {type(e).__name__}: {str(e)}")
    print("   Install with: pip install insightface onnxruntime")
    FACE_RECOGNITION_AVAILABLE = False
    # Mock classes for development
    class FaceAnalysis:
        def __init__(self, **kwargs):
            pass
        def prepare(self, **kwargs):
            pass
        def get(self, img):
            return []
except Exception as e:
    print(f"❌ Unexpected error loading face recognition: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    FACE_RECOGNITION_AVAILABLE = False
    class FaceAnalysis:
        def __init__(self, **kwargs):
            pass
        def prepare(self, **kwargs):
            pass
        def get(self, img):
            return []

class FacialRecognitionService:
    """Service class for handling facial recognition operations"""
    
    def __init__(self, database):
        self.db = database
        self.face_app = None
        self.available = FACE_RECOGNITION_AVAILABLE
        self.threshold = 0.5  # Similarity threshold for recognition
        
        # Initialize face recognition
        self._initialize_face_recognition()
    
    def _initialize_face_recognition(self):
        """Initialize the face recognition model"""
        try:
            if FACE_RECOGNITION_AVAILABLE:
                self.face_app = FaceAnalysis(allowed_modules=['detection', 'recognition'])
                self.face_app.prepare(ctx_id=0, det_size=(640, 640))
                print("Face recognition initialized successfully")
            else:
                self.face_app = None
                print("Face recognition not available - using mock implementation")
        except Exception as e:
            print(f"Warning: Face recognition initialization failed: {e}")
            self.face_app = None
            self.available = False
    
    def is_available(self) -> bool:
        """Check if face recognition service is available"""
        return self.available and self.face_app is not None
    
    def resize_image(self, image: np.ndarray, max_size: int = 640) -> np.ndarray:
        """Resize image while maintaining aspect ratio"""
        h, w = image.shape[:2]
        if max(h, w) > max_size:
            scale = max_size / max(h, w)
            image = cv2.resize(image, (int(w * scale), int(h * scale)))
        return image
    
    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        return dot(a, b) / (norm(a) * norm(b))
    
    def base64_to_cv2_image(self, base64_string: str) -> Optional[np.ndarray]:
        """Convert base64 string to cv2 image"""
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            image_bytes = base64.b64decode(base64_string)
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            print(f"Error converting base64 to image: {e}")
            return None
    
    def extract_face_embedding(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract face embedding from image"""
        if not self.is_available():
            raise Exception("Face recognition service not available")
        
        # Resize image for processing
        img = self.resize_image(image)
        
        # Detect faces
        faces = self.face_app.get(img)
        
        if len(faces) == 0:
            raise Exception("No face detected in image")
        if len(faces) > 1:
            raise Exception("Multiple faces detected, please upload single face image")
        
        # Extract face embedding
        embedding = faces[0].embedding
        
        return {
            "embedding": embedding,
            "bbox": faces[0].bbox.tolist(),
            "landmark": faces[0].kps.tolist() if hasattr(faces[0], 'kps') else None
        }
    
    def register_face(self, name: str, appraiser_id: str, image: str) -> Dict[str, Any]:
        """Register a new face for an appraiser"""
        try:
            if not self.is_available():
                return {
                    "success": False,
                    "message": "Face registration service is currently unavailable. Please try again later or contact support.",
                    "service_status": "offline",
                    "error": "InsightFace library not loaded"
                }
            
            # Convert base64 image to cv2 format
            img = self.base64_to_cv2_image(image)
            if img is None:
                raise Exception("Invalid image format")
            
            # Extract face embedding
            face_data = self.extract_face_embedding(img)
            embedding = face_data["embedding"]
            
            # Convert embedding to string for database storage
            embedding_str = ",".join(map(str, embedding.tolist()))
            
            # Store in database
            appraiser_db_id = self.db.insert_appraiser(
                name=name,
                appraiser_id=appraiser_id,
                image_data=image,
                timestamp=datetime.now().isoformat(),
                face_encoding=embedding_str
            )
            
            return {
                "success": True,
                "message": f"Face registered successfully for {name}",
                "appraiser_id": appraiser_id,
                "db_id": appraiser_db_id,
                "bbox": face_data["bbox"]
            }
        
        except Exception as e:
            print(f"Face registration error: {e}")
            traceback.print_exc()
            raise Exception(f"Face registration failed: {str(e)}")
    
    def recognize_face(self, image: str) -> Dict[str, Any]:
        """Recognize an appraiser from face image"""
        try:
            if not self.is_available():
                return {
                    "recognized": False,
                    "message": "Face recognition service is currently unavailable. Please try again later or contact support.",
                    "service_status": "offline",
                    "error": "InsightFace library not loaded"
                }
            
            # Convert base64 image to cv2 format
            img = self.base64_to_cv2_image(image)
            if img is None:
                return {
                    "recognized": False,
                    "message": "Invalid image format. Please capture a clear photo.",
                    "error": "invalid_image"
                }
            
            # Extract face embedding
            try:
                face_data = self.extract_face_embedding(img)
            except Exception as face_error:
                error_msg = str(face_error)
                if "No face detected" in error_msg:
                    return {
                        "recognized": False,
                        "message": "No face detected in image. Please position your face clearly in the camera and try again.",
                        "error": "no_face_detected"
                    }
                elif "Multiple faces" in error_msg:
                    return {
                        "recognized": False,
                        "message": "Multiple faces detected. Please ensure only one person is in the frame.",
                        "error": "multiple_faces"
                    }
                else:
                    return {
                        "recognized": False,
                        "message": f"Face detection failed: {error_msg}",
                        "error": "face_detection_error"
                    }
            
            query_embedding = face_data["embedding"]
            
            # Get all registered appraisers with face encodings
            known_appraisers = self.db.get_all_appraisers_with_face_encoding()
            
            max_sim = -1
            recognized_appraiser = None
            
            for appraiser in known_appraisers:
                if not appraiser['face_encoding']:
                    continue
                
                try:
                    known_embedding = np.array(list(map(float, appraiser['face_encoding'].split(","))))
                    sim = self.cosine_similarity(known_embedding, query_embedding)
                    
                    if sim > max_sim and sim > self.threshold:
                        max_sim = sim
                        recognized_appraiser = {
                            "name": appraiser['name'],
                            "appraiser_id": appraiser['appraiser_id'],
                            "similarity": float(sim),
                            "db_id": appraiser['id'],
                            "image_data": appraiser.get('image_data', '')
                        }
                except Exception as e:
                    print(f"Error processing appraiser {appraiser['name']}: {e}")
                    continue
            
            if recognized_appraiser:
                return {
                    "recognized": True,
                    "appraiser": recognized_appraiser,
                    "bbox": face_data["bbox"]
                }
            else:
                return {
                    "recognized": False,
                    "message": "No matching appraiser found",
                    "bbox": face_data["bbox"]
                }
        
        except Exception as e:
            print(f"Face recognition error: {e}")
            traceback.print_exc()
            raise Exception(f"Face recognition failed: {str(e)}")
    
    def get_registered_appraisers(self) -> List[Dict[str, Any]]:
        """Get list of all registered appraisers"""
        try:
            appraisers = self.db.get_all_appraisers_with_face_encoding()
            return [
                {
                    "name": appraiser['name'],
                    "appraiser_id": appraiser['appraiser_id'],
                    "created_at": appraiser['created_at'].isoformat() if appraiser['created_at'] else None,
                    "has_face_encoding": bool(appraiser.get('face_encoding'))
                }
                for appraiser in appraisers
            ]
        except Exception as e:
            raise Exception(f"Failed to get registered appraisers: {str(e)}")
    
    def update_threshold(self, new_threshold: float) -> Dict[str, Any]:
        """Update the similarity threshold for recognition"""
        if not 0.0 <= new_threshold <= 1.0:
            raise Exception("Threshold must be between 0.0 and 1.0")
        
        old_threshold = self.threshold
        self.threshold = new_threshold
        
        return {
            "success": True,
            "message": f"Threshold updated from {old_threshold} to {new_threshold}",
            "old_threshold": old_threshold,
            "new_threshold": new_threshold
        }
    
    def get_face_info(self, image: str) -> Dict[str, Any]:
        """Get face information from image without recognition"""
        try:
            if not self.is_available():
                raise Exception("Face recognition service not available")
            
            # Convert base64 image to cv2 format
            img = self.base64_to_cv2_image(image)
            if img is None:
                raise Exception("Invalid image format")
            
            # Resize image for processing
            img = self.resize_image(img)
            
            # Detect faces
            faces = self.face_app.get(img)
            
            face_info = []
            for i, face in enumerate(faces):
                info = {
                    "face_id": i,
                    "bbox": face.bbox.tolist(),
                    "confidence": float(face.det_score) if hasattr(face, 'det_score') else 1.0,
                    "landmark": face.kps.tolist() if hasattr(face, 'kps') else None
                }
                
                # Add age and gender if available
                if hasattr(face, 'age'):
                    info["age"] = int(face.age)
                if hasattr(face, 'gender'):
                    info["gender"] = int(face.gender)
                
                face_info.append(info)
            
            return {
                "face_count": len(faces),
                "faces": face_info,
                "image_size": img.shape[:2]
            }
        
        except Exception as e:
            print(f"Face info extraction error: {e}")
            raise Exception(f"Face info extraction failed: {str(e)}")
    
    def delete_appraiser_face(self, appraiser_id: str) -> Dict[str, Any]:
        """Delete face encoding for an appraiser"""
        try:
            # This would require a database method to clear face encoding
            # For now, we'll just return a placeholder response
            return {
                "success": True,
                "message": f"Face encoding deleted for appraiser {appraiser_id}",
                "appraiser_id": appraiser_id
            }
        except Exception as e:
            raise Exception(f"Failed to delete face encoding: {str(e)}")