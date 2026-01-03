import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_TITLE: str = "Gold Loan Appraisal API"
    API_VERSION: str = "1.0.0"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    
    # Database Settings
    DATABASE_PATH: str = "gold_loan_appraisal.db"
    
    # Camera Settings
    CAMERA_INDEX: int =0
    CAMERA_RESOLUTION_WIDTH: int = 1920
    CAMERA_RESOLUTION_HEIGHT: int = 1080
    CAMERA_FPS: int = 30
    
    # Image Settings
    IMAGE_QUALITY: int = 85
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
