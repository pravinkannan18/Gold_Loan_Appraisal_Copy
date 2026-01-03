# Backend Project Structure

## Overview
The backend follows a clean architecture pattern with clear separation of concerns:

```
backend/
├── main.py                          # FastAPI app initialization and router registration
├── main_old.py                      # Backup of original monolithic file
├── config.py                        # Configuration settings
├── requirements.txt                 # Python dependencies
├── .env                            # Environment variables (local only, not in git)
├── .env.example                    # Environment template
├── .gitignore                      # Git ignore rules
├── Dockerfile                      # Docker container configuration
├── README.md                       # Project documentation
│
├── routers/                        # 🎯 API Endpoints (HTTP Layer)
│   ├── __init__.py
│   ├── appraiser.py                # POST/GET appraiser endpoints
│   ├── appraisal.py                # CRUD appraisal endpoints
│   ├── camera.py                   # Camera operation endpoints
│   ├── face.py                     # Facial recognition endpoints
│   ├── purity.py                   # Purity testing endpoints
│   └── gps.py                      # GPS location endpoints
│
├── services/                       # 💼 Business Logic Layer
│   ├── __init__.py
│   ├── camera_service.py           # Camera capture and preview operations
│   ├── facial_recognition_service.py  # Face detection and recognition
│   ├── purity_testing_service.py   # YOLO analysis and purity testing
│   └── gps_service.py              # GPS device and IP geolocation
│
├── models/                         # 💾 Data Layer
│   ├── __init__.py
│   ├── database.py                 # PostgreSQL database operations
│   └── schemas.py                  # Pydantic models (data validation)
│
├── utils/                          # 🔧 Utility Functions
│   ├── __init__.py
│   ├── setup_database.py           # Database initialization script
│   └── test_connection.py          # Connection testing utility
│
├── ml_models/                      # 🤖 Machine Learning Models
│   ├── __init__.py
│   ├── README.md                   # Model documentation
│   ├── best_rub2_1.pt             # YOLO model for acid testing
│   ├── best_rub2_2.pt             # YOLO model for rubbing testing
│   └── dbcnn.pth                  # 1D CNN model for serial data
│
└── data/                           # 📊 Data Files and Outputs
    ├── __init__.py
    ├── README.md                   # Data documentation
    ├── task_sequence.csv           # Rubbing test task definitions
    ├── task_sequence_main.csv      # Acid test task definitions
    ├── result.txt                  # Processing results (gitignored)
    └── model_results.txt           # Model outputs (gitignored)
```

## Layer Responsibilities

### 🎯 Routers (HTTP Layer)
- Handle HTTP requests and responses
- Input validation using Pydantic schemas
- Call service layer for business logic
- Return formatted JSON responses

### 💼 Services (Business Logic Layer)
- Core application logic
- Coordinate between routers and data layer
- Handle camera operations, ML inference, GPS
- Manage external integrations

### 💾 Models (Data Layer)
- Database connection and operations
- Data validation schemas
- CRUD operations
- Query builders

### 🔧 Utils (Utilities)
- Setup scripts
- Testing utilities
- Helper functions

### 🤖 ML Models
- Trained YOLO models for purity testing
- PyTorch CNN models
- Organized separately from code

### 📊 Data
- CSV task definitions
- Processing results
- Model outputs
- Temporary files

## Benefits of This Structure

1. **Separation of Concerns** - Each layer has a single responsibility
2. **Easy Testing** - Each component can be tested independently
3. **Maintainability** - Clear organization makes code easy to find and modify
4. **Scalability** - Easy to add new features without touching existing code
5. **Professional** - Follows industry-standard patterns

## File Statistics

- **Total Lines Reduced**: From 994 lines (main.py) to 178 lines
- **Number of Routers**: 6
- **Number of Services**: 4
- **Number of Models**: 2
- **Number of Utils**: 2
- **ML Models**: 3
- **Data Files**: 4
