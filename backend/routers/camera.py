"""Camera API routes"""
from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter(prefix="/api/camera", tags=["camera"])

# Dependency injection
camera_service = None

def set_service(service):
    global camera_service
    camera_service = service

@router.post("/check")
async def check_camera():
    """Check if camera is available"""
    available = camera_service.check_camera_available()
    return {
        "available": available,
        "message": "Camera is available" if available else "No camera found"
    }

@router.post("/capture")
async def capture_image():
    """Capture a single image from camera"""
    image_data = camera_service.capture_image()
    if image_data:
        return {
            "success": True,
            "image": image_data,
            "timestamp": datetime.now().isoformat()
        }
    raise HTTPException(status_code=500, detail="Failed to capture image")

@router.post("/preview")
async def show_camera_preview():
    """Show camera preview window and capture image"""
    image_data = camera_service.show_camera_preview(
        window_name="Gold Loan Appraisal - Camera"
    )
    if image_data:
        return {
            "success": True,
            "image": image_data,
            "message": "Image captured",
            "timestamp": datetime.now().isoformat()
        }
    return {
        "success": False,
        "image": None,
        "message": "Cancelled",
        "timestamp": datetime.now().isoformat()
    }

@router.post("/live")
async def show_live_feed(duration: int = 10):
    """Show live camera feed for specified duration"""
    camera_service.show_camera_live(
        duration_seconds=duration,
        window_name="Gold Loan Appraisal - Live Feed"
    )
    return {
        "success": True,
        "message": f"Live feed displayed for {duration}s"
    }
