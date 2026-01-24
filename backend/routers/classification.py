"""
Classification API routes for jewellery classification
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict

router = APIRouter(prefix="/api/classification", tags=["classification"])

# ============================================================================
# Pydantic Models
# ============================================================================

class ClassificationRequest(BaseModel):
    image: str  # base64 encoded image
    item_number: Optional[int] = None

class PredictionResult(BaseModel):
    class_name: str = ""
    confidence: float

class ClassificationResponse(BaseModel):
    success: bool
    class_name: Optional[str] = None
    confidence: Optional[float] = None
    risk: Optional[str] = None
    all_predictions: Optional[List[Dict]] = None
    error: Optional[str] = None

# ============================================================================
# Dependency Injection
# ============================================================================

classification_service = None

def set_service(service):
    global classification_service
    classification_service = service

# ============================================================================
# Endpoints
# ============================================================================

@router.post("/analyze", response_model=ClassificationResponse)
async def analyze_jewellery(request: ClassificationRequest):
    """
    Analyze a jewellery item image and return classification results
    
    Args:
        request: ClassificationRequest with base64 encoded image
        
    Returns:
        ClassificationResponse with class, confidence, and risk level
    """
    if classification_service is None:
        raise HTTPException(
            status_code=503,
            detail="Classification service not available"
        )
    
    if not classification_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Classification model not loaded"
        )
    
    try:
        # Run classification
        result = classification_service.classify(request.image)
        
        if not result.get("success", False):
            return ClassificationResponse(
                success=False,
                error=result.get("error", "Classification failed")
            )
        
        return ClassificationResponse(
            success=True,
            class_name=result.get("class"),
            confidence=result.get("confidence"),
            risk=result.get("risk"),
            all_predictions=result.get("all_predictions", [])
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Classification error: {str(e)}"
        )

@router.get("/health")
async def classification_health():
    """Check if classification service is available"""
    if classification_service is None:
        return {
            "available": False,
            "error": "Service not initialized"
        }
    
    return {
        "available": classification_service.is_available(),
        "device": str(classification_service.device) if classification_service.is_available() else None,
        "classes": classification_service.class_names if classification_service.is_available() else []
    }

@router.post("/analyze-enhanced")
async def analyze_jewellery_enhanced(request: ClassificationRequest):
    """
    Enhanced analysis: Detect individual regions using SAM3 and classify each
    
    Returns array of detected regions with individual classifications
    """
    try:
        if classification_service is None:
            raise HTTPException(
                status_code=503,
                detail="Classification service not initialized"
            )
        
        if not classification_service.is_enhanced_available():
            raise HTTPException(
                status_code=503,
                detail="Enhanced classification not available (SAM3 or ResNet50 missing)"
            )
        
        # Run enhanced detection and classification
        result = classification_service.detect_and_classify_regions(request.image)
        
        if not result.get("success", False):
            return {
                "success": False,
                "error": result.get("error", "Enhanced classification failed"),
                "regions": []
            }
        
        return {
            "success": True,
            "regions": result.get("regions", []),
            "total_detected": result.get("total_detected", 0)
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Enhanced classification error: {str(e)}"
        )
