"""Appraiser API routes"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/appraiser", tags=["appraiser"])

# Pydantic models
class AppraiserDetails(BaseModel):
    name: str
    id: str
    image: str
    timestamp: str

# Dependency injection (will be set in main.py)
db = None

def set_database(database):
    global db
    db = database

@router.post("")
async def create_appraiser(appraiser: AppraiserDetails):
    """Create a new appraiser"""
    appraiser_db_id = db.insert_appraiser(
        name=appraiser.name,
        appraiser_id=appraiser.id,
        image_data=appraiser.image,
        timestamp=appraiser.timestamp
    )
    return {"success": True, "id": appraiser_db_id, "message": "Appraiser saved"}

@router.get("/{appraiser_id}")
async def get_appraiser(appraiser_id: str):
    """Get appraiser by ID"""
    appraiser = db.get_appraiser_by_id(appraiser_id)
    if not appraiser:
        raise HTTPException(status_code=404, detail="Appraiser not found")
    return appraiser
