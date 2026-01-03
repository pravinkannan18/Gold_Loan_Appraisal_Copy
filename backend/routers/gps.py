"""GPS Location API routes"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/gps", tags=["gps"])

# Dependency injection
gps_service = None

def set_service(service):
    global gps_service
    gps_service = service

@router.get("/location")
async def api_gps_location():
    """Get current GPS location with map and address"""
    result = gps_service.get_location()
    if result.get("error"):
        return {
            "error": result["error"],
            "latitude": None,
            "longitude": None,
            "address": "Location unavailable",
            "source": "error"
        }
    return result

@router.get("/health")
async def api_gps_health():
    """Check GPS service health"""
    return {
        "service": "GPSService",
        "available": gps_service.available,
        "port": gps_service.GPS_PORT,
        "has_api_key": bool(gps_service.GEOAPIFY_KEY)
    }
