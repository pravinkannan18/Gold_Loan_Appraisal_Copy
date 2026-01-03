"""Appraisal API routes"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/appraisal", tags=["appraisal"])

# ============================================================================
# Pydantic Models (Request/Response Schemas)
# ============================================================================

class JewelleryItem(BaseModel):
    itemNumber: int
    image: str
    description: str
    weight: Optional[str] = None
    category: Optional[str] = None

class RBICompliance(BaseModel):
    customer_photo: str
    id_proof: str
    appraiser_with_jewellery: str

class PurityTest(BaseModel):
    testing_method: str
    purity: str
    remarks: Optional[str] = None

class AppraiserDetails(BaseModel):
    name: str
    id: str
    image: str
    timestamp: str

class AppraisalCreate(BaseModel):
    appraiser: AppraiserDetails
    jewellery_items: List[JewelleryItem]
    rbi_compliance: RBICompliance
    purity_test: PurityTest

class AppraisalResponse(BaseModel):
    id: int
    appraiser_name: str
    appraiser_id: str
    total_items: int
    purity: str
    created_at: str
    status: str

# ============================================================================
# Dependency Injection
# ============================================================================

db = None

def set_database(database):
    global db
    db = database

# ============================================================================
# POST Endpoints (Create Operations)
# ============================================================================

@router.post("", response_model=None, status_code=201)
async def create_appraisal(appraisal: AppraisalCreate):
    """
    Create a new appraisal
    
    - **appraisal**: Complete appraisal data including appraiser, jewellery items, RBI compliance, and purity test
    
    Returns the created appraisal ID
    """
    # TODO: Implement full appraisal creation logic
    # This should:
    # 1. Validate appraiser exists
    # 2. Store jewellery items
    # 3. Store RBI compliance data
    # 4. Store purity test results
    # 5. Return created appraisal ID
    return {"success": True, "message": "Appraisal created", "id": None}

# ============================================================================
# GET Endpoints (Read Operations)
# ============================================================================

@router.get("s", response_model=None)
async def get_all_appraisals(skip: int = 0, limit: int = 100):
    """
    Get all appraisals with pagination
    
    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum number of records to return (default: 100, max: 1000)
    
    Returns list of appraisals with total count
    """
    if limit > 1000:
        raise HTTPException(status_code=400, detail="Limit cannot exceed 1000")
    
    appraisals = db.get_all_appraisals(skip=skip, limit=limit)
    return {"total": len(appraisals), "appraisals": appraisals}

@router.get("/{appraisal_id}", response_model=None)
async def get_appraisal_by_id(appraisal_id: int):
    """
    Get a specific appraisal by ID
    
    - **appraisal_id**: Unique identifier for the appraisal
    
    Returns complete appraisal details including all related data
    """
    appraisal = db.get_appraisal_by_id(appraisal_id)
    if not appraisal:
        raise HTTPException(status_code=404, detail=f"Appraisal with ID {appraisal_id} not found")
    return appraisal

# ============================================================================
# DELETE Endpoints (Delete Operations)
# ============================================================================

@router.delete("/{appraisal_id}", status_code=200)
async def delete_appraisal(appraisal_id: int):
    """
    Delete an appraisal by ID
    
    - **appraisal_id**: Unique identifier for the appraisal to delete
    
    Returns success message
    """
    success = db.delete_appraisal(appraisal_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Appraisal with ID {appraisal_id} not found")
    return {"success": True, "message": f"Appraisal {appraisal_id} deleted successfully"}
