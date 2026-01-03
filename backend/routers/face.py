"""Facial Recognition API routes"""
from fastapi import APIRouter, Form

router = APIRouter(prefix="/api/face", tags=["facial-recognition"])

# Dependency injection
facial_service = None

def set_service(service):
    global facial_service
    facial_service = service

@router.post("/register")
async def register_face(
    name: str = Form(...),
    appraiser_id: str = Form(...),
    image: str = Form(...)
):
    """Register a new face for facial recognition"""
    result = facial_service.register_face(name, appraiser_id, image)
    return result

@router.post("/recognize")
async def recognize_face(image: str = Form(...)):
    """Recognize a face from image"""
    result = facial_service.recognize_face(image)
    return result

@router.get("/appraisers")
async def get_registered_appraisers():
    """Get list of registered appraisers"""
    return {"appraisers": facial_service.get_registered_appraisers()}

@router.post("/info")
async def get_face_info(image: str = Form(...)):
    """Get face information from image"""
    return facial_service.get_face_info(image)

@router.post("/threshold")
async def update_threshold(threshold: float = Form(...)):
    """Update recognition threshold"""
    return facial_service.update_threshold(threshold)

@router.get("/status")
async def get_face_service_status():
    """Get facial recognition service status"""
    return {
        "available": facial_service.is_available(),
        "threshold": facial_service.threshold,
        "service": "FacialRecognitionService"
    }
