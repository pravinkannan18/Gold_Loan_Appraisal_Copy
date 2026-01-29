# Production Backend Structure - Visual Guide

## 🏗️ New Production-Level Directory Structure

This document provides a visual guide to the new production-level backend structure.

---

## Directory Tree

```
backend/
│
├── 📄 main.py                      # ← Entry point (minimal, imports from app.main)
├── 📄 requirements.txt             # Python dependencies
├── 📄 .env                         # Environment variables (gitignored)
├── 📄 .env.example                 # Environment template
├── 📄 Dockerfile                   # Docker configuration
├── 📄 docker-compose.yml           # Production deployment setup
├── 📄 alembic.ini                  # Database migration configuration
├── 📄 pytest.ini                   # Testing configuration
├── 📄 README.md                    # Project documentation
│
├── 📦 app/                         # ← MAIN APPLICATION PACKAGE
│   │
│   ├── 📄 __init__.py
│   ├── 📄 main.py                  # FastAPI app factory
│   │
│   ├── 🎯 api/                     # API Layer (HTTP endpoints)
│   │   ├── 📄 __init__.py
│   │   ├── 📄 deps.py              # Dependency injection functions
│   │   │
│   │   └── 📁 v1/                  # API Version 1
│   │       ├── 📄 __init__.py
│   │       ├── 📄 router.py        # Main router aggregator
│   │       │
│   │       └── 📁 endpoints/       # All API endpoints
│   │           ├── 📄 __init__.py
│   │           ├── 🔐 auth.py      # Authentication (login, logout, refresh)
│   │           ├── 👨‍💼 admin.py     # Admin operations (banks, branches)
│   │           ├── 👤 appraisers.py # Appraiser management
│   │           ├── 📋 appraisals.py # Appraisal CRUD operations
│   │           ├── 🗂️ sessions.py   # Session management
│   │           ├── 📸 camera.py     # Camera operations
│   │           ├── 😀 face.py       # Facial recognition
│   │           ├── 📍 gps.py        # GPS location services
│   │           ├── 🏷️ classification.py # Jewellery classification
│   │           └── 📹 webrtc.py     # WebRTC streaming
│   │
│   ├── ⚙️ core/                    # Core application configuration
│   │   ├── 📄 __init__.py
│   │   ├── 📄 config.py            # Centralized configuration (Pydantic Settings)
│   │   ├── 🔒 security.py          # JWT, password hashing, device fingerprinting
│   │   ├── ⚠️ exceptions.py        # Custom exception classes
│   │   ├── 📝 logging.py           # Logging configuration
│   │   └── 📄 constants.py         # Application constants
│   │
│   ├── 🔐 middleware/              # Request/Response middleware
│   │   ├── 📄 __init__.py
│   │   ├── 🔑 auth.py              # JWT authentication middleware
│   │   ├── 🏢 tenant.py            # Tenant context extraction
│   │   ├── ❌ error_handler.py     # Global error handling
│   │   └── 📝 logging.py           # Request logging
│   │
│   ├── 💾 models/                  # Data models & database
│   │   ├── 📄 __init__.py
│   │   ├── 🗄️ database.py          # PostgreSQL operations
│   │   └── 🏢 tenant_context.py    # Tenant context manager
│   │
│   ├── 📋 schemas/                 # Pydantic data validation schemas
│   │   ├── 📄 __init__.py
│   │   ├── 📄 base.py              # Base schemas
│   │   ├── 🏦 tenant.py            # Bank, Branch, Device schemas
│   │   ├── 🔐 auth.py              # Login, Token, Refresh schemas
│   │   ├── 👤 appraiser.py         # Appraiser data schemas
│   │   ├── 📋 appraisal.py         # Appraisal data schemas
│   │   ├── 🗂️ session.py           # Session data schemas
│   │   ├── 👨‍👩‍👧 customer.py         # Customer data schemas
│   │   ├── 📜 rbi.py               # RBI compliance schemas
│   │   ├── 🧪 purity.py            # Purity test schemas
│   │   └── 📄 common.py            # Shared/common schemas
│   │
│   ├── 💼 services/                # Business logic services
│   │   ├── 📄 __init__.py
│   │   ├── 🔐 auth_service.py      # Authentication logic
│   │   ├── 👨‍💼 admin_service.py     # Admin operations
│   │   ├── 🏢 tenant_service.py    # Tenant management
│   │   ├── 👤 appraiser_service.py # Appraiser business logic
│   │   ├── 📋 appraisal_service.py # Appraisal business logic
│   │   ├── 📜 audit_service.py     # Immutable audit logging
│   │   ├── 🗄️ evidence_service.py  # Evidence file storage
│   │   ├── 📸 camera_service.py    # Camera operations
│   │   ├── 😀 facial_recognition_service.py # Face recognition
│   │   ├── 🏷️ classification_service.py # Jewellery classification
│   │   └── 📍 gps_service.py       # GPS location
│   │
│   ├── 🤖 ai/                      # AI/ML components
│   │   ├── 📄 __init__.py
│   │   │
│   │   ├── 📁 inference/           # AI inference logic
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 🔍 inference_worker.py # Purity testing worker
│   │   │   └── 📦 model_manager.py # Model loading/caching
│   │   │
│   │   └── 📁 models/              # ML model files
│   │       ├── 📄 __init__.py
│   │       ├── 📁 yolo/            # YOLO detection models
│   │       │   ├── best_rub2_1.pt  # Acid test model
│   │       │   └── best_rub2_2.pt  # Rubbing test model
│   │       └── 📁 classification/ # Classification models
│   │           ├── resnet50_local.pth # ResNet50 model
│   │           └── class_names.json   # Class labels
│   │
│   ├── 📹 webrtc/                  # WebRTC video streaming
│   │   ├── 📄 __init__.py
│   │   ├── 📡 signaling.py         # WebRTC signaling server
│   │   └── 🎥 video_processor.py   # Video transformation track
│   │
│   └── 🔧 utils/                   # Utility functions
│       ├── 📄 __init__.py
│       ├── 🛠️ helpers.py            # General helpers
│       ├── ✅ validators.py         # Custom validators
│       └── 📊 formatters.py        # Data formatters
│
├── 📊 migrations/                  # Database migrations (Alembic)
│   ├── 📁 versions/
│   │   ├── 001_tenant_schema.py
│   │   ├── 002_row_level_security.py
│   │   └── 003_performance_indexes.py
│   ├── 📄 env.py
│   └── 📄 script.py.mako
│
├── ✅ tests/                       # Automated tests
│   ├── 📄 __init__.py
│   ├── 📄 conftest.py              # Pytest configuration
│   ├── 📁 unit/                    # Unit tests
│   │   ├── test_services/
│   │   ├── test_models/
│   │   └── test_utils/
│   ├── 📁 integration/             # Integration tests
│   │   ├── test_api/
│   │   ├── test_auth/
│   │   └── test_tenant_isolation/
│   └── 📁 fixtures/
│       └── test_data.py
│
├── 🔨 scripts/                     # Utility scripts
│   ├── 💾 seed_database.py         # Database seeding
│   ├── 👨‍💼 create_admin.py          # Create admin user
│   └── 🔄 migrate_old_data.py      # Data migration
│
└── 📁 data/                        # Data files
    ├── task_sequence.csv
    └── task_sequence_main.csv
```

---

## 📊 Architecture Layers

```mermaid
graph TB
    subgraph "External"
        Client[Frontend Client]
        Admin[Admin Interface]
    end

    subgraph "API Layer (app/api/)"
        Router[API Router v1]
        Endpoints[Endpoints]
        Deps[Dependencies]
    end

    subgraph "Middleware Layer (app/middleware/)"
        Auth[Auth Middleware]
        Tenant[Tenant Middleware]
        ErrorHandler[Error Handler]
        Logger[Request Logger]
    end

    subgraph "Business Logic (app/services/)"
        AuthSvc[Auth Service]
        AdminSvc[Admin Service]
        TenantSvc[Tenant Service]
        AppraiserSvc[Appraiser Service]
        AppraisalSvc[Appraisal Service]
        AuditSvc[Audit Service]
        EvidenceSvc[Evidence Service]
        OtherSvc[Other Services]
    end

    subgraph "Core (app/core/)"
        Config[Configuration]
        Security[Security Utils]
        Exceptions[Custom Exceptions]
    end

    subgraph "Data Layer (app/models/)"
        Database[(PostgreSQL Database)]
        TenantCtx[Tenant Context]
    end

    subgraph "AI/ML (app/ai/)"
        Inference[Inference Worker]
        Models[ML Models]
    end

    Client --> Router
    Admin --> Router
    Router --> Endpoints
    Endpoints --> Deps
    Deps --> Auth
    Auth --> Tenant
    Tenant --> ErrorHandler
    ErrorHandler --> Logger
    Logger --> AuthSvc
    Logger --> AdminSvc
    Logger --> TenantSvc
    Logger --> AppraiserSvc
    Logger --> AppraisalSvc
    AuthSvc --> Security
    AuthSvc --> Database
    AdminSvc --> Database
    TenantSvc --> Database
    TenantSvc --> TenantCtx
    AppraiserSvc --> Database
    AppraiserSvc --> AuditSvc
    AppraisalSvc --> Database
    AppraisalSvc --> AuditSvc
    AppraisalSvc --> EvidenceSvc
    AppraisalSvc --> Inference
    AuditSvc --> Database
    EvidenceSvc --> Database
    Inference --> Models
```

---

## 🔄 Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as API Endpoint
    participant Auth as Auth Middleware
    participant Tenant as Tenant Middleware
    participant Service as Business Service
    participant Audit as Audit Service
    participant DB as Database

    Client->>API: HTTP Request (with JWT)
    API->>Auth: Validate JWT
    Auth->>Auth: Decode token
    Auth->>Tenant: Set tenant context
    Tenant->>Tenant: Extract bank_id, branch_id
    Tenant->>API: Context set
    API->>Service: Call business logic
    Service->>Service: Validate business rules
    Service->>DB: Query with tenant filter
    DB-->>Service: Return tenant-scoped data
    Service->>Audit: Log operation
    Audit->>DB: Insert audit log
    Service-->>API: Return result
    API-->>Client: JSON Response
```

---

## 🏢 Multi-Tenant Data Flow

```mermaid
graph LR
    subgraph "Bank A"
        B1[Branch 1]
        B2[Branch 2]
    end
    
    subgraph "Bank B"
        B3[Branch 1]
        B4[Branch 2]
    end
    
    subgraph "Database with RLS"
        D1[(Appraisals)]
        D2[(Audit Logs)]
        D3[(Evidence)]
    end
    
    B1 -->|bank_id=A, branch_id=1| D1
    B1 -->|bank_id=A, branch_id=1| D2
    B1 -->|bank_id=A, branch_id=1| D3
    
    B2 -->|bank_id=A, branch_id=2| D1
    B2 -->|bank_id=A, branch_id=2| D2
    B2 -->|bank_id=A, branch_id=2| D3
    
    B3 -->|bank_id=B, branch_id=1| D1
    B3 -->|bank_id=B, branch_id=1| D2
    B3 -->|bank_id=B, branch_id=1| D3
    
    B4 -->|bank_id=B, branch_id=2| D1
    B4 -->|bank_id=B, branch_id=2| D2
    B4 -->|bank_id=B, branch_id=2| D3
    
    style D1 fill:#e1f5ff
    style D2 fill:#e1f5ff
    style D3 fill:#e1f5ff
```

---

## 📝 Key Improvements

### 1. **Separation of Concerns**
- **API Layer**: Only handles HTTP requests/responses
- **Services Layer**: Contains all business logic
- **Models Layer**: Database operations only
- **Core**: Shared utilities and configuration

### 2. **Better Organization**
- All code under `app/` package
- Clear directory structure
- Versioned API (v1, v2 in future)
- Dedicated schemas directory

### 3. **Production Ready**
- Middleware for auth, tenant isolation, error handling
- Centralized configuration
- Custom exceptions
- Comprehensive logging
- Database migrations with Alembic
- Testing structure

### 4. **Scalability**
- Easy to add new API versions
- Services can be extracted to microservices
- Clear dependencies make testing easier
- Tenant isolation at multiple layers

### 5. **Security**
- JWT authentication
- Tenant context enforcement
- Audit logging
- Row-level security
- Device binding

---

## 🚀 Migration Benefits

### Before (Current Structure)
```python
# Imports are messy
from models.database import Database
from services.camera_service import CameraService

# Everything at root level
backend/
├── main.py (178 lines)
├── routers/
├── services/
└── models/
```

### After (Production Structure)
```python
# Clean, organized imports
from app.models.database import Database
from app.services.camera_service import CameraService
from app.core.config import settings
from app.core.security import create_access_token

# Professional structure
backend/
└── app/
    ├── api/
    ├── core/
    ├── middleware/
    ├── models/
    ├── schemas/
    ├── services/
    ├── ai/
    └── webrtc/
```

---

## 📦 Dependencies to Add

After restructuring, these packages will be added to `requirements.txt`:

```txt
# Core
pydantic-settings>=2.0.0          # Configuration management

# Authentication & Security
python-jose[cryptography]>=3.3.0  # JWT tokens
passlib[bcrypt]>=1.7.4           # Password hashing

# Database
alembic>=1.12.0                  # Database migrations

# File handling
python-multipart>=0.0.6          # File uploads

# Testing
pytest>=7.4.0                    # Testing framework
pytest-asyncio>=0.21.0           # Async testing
httpx>=0.24.0                    # Test client
```

---

## 🔧 Configuration Example

### `.env.example`
```env
# Application
APP_NAME="Gold Loan Appraisal API"
APP_VERSION="3.0.0"
ENVIRONMENT="development"  # development, staging, production

# API
API_V1_PREFIX="/api/v1"
DEBUG=True
LOG_LEVEL="info"

# Security
SECRET_KEY="your-secret-key-change-in-production"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database
DB_HOST="localhost"
DB_PORT=5432
DB_NAME="gold_loan_appraisal"
DB_USER="postgres"
DB_PASSWORD="your-password"
DATABASE_URL="postgresql://postgres:your-password@localhost:5432/gold_loan_appraisal"

# CORS
CORS_ORIGINS=["http://localhost:5173", "http://localhost:8080"]

# File Storage
UPLOAD_DIR="./uploads"
MAX_UPLOAD_SIZE_MB=10

# AI Models
YOLO_RUBBING_MODEL="app/ai/models/yolo/best_rub2_2.pt"
YOLO_ACID_MODEL="app/ai/models/yolo/best_rub2_1.pt"
CLASSIFICATION_MODEL="app/ai/models/classification/resnet50_local.pth"

# WebRTC
WEBRTC_ICE_SERVERS='[{"urls": "stun:stun.l.google.com:19302"}]'
```

---

## 🛠️ Implementation Steps

### Phase 0: Code Restructuring (2-3 days)

#### Step 1: Create Directory Structure
```bash
# Create main app directory
mkdir -p backend/app/{api/v1/endpoints,core,middleware,models,schemas,services,ai/{inference,models/{yolo,classification}},webrtc,utils}

# Create supporting directories
mkdir -p backend/{migrations/versions,tests/{unit,integration,fixtures},scripts}

# Create __init__.py files
touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/api/v1/__init__.py
touch backend/app/api/v1/endpoints/__init__.py
# ... (create all __init__.py files)
```

#### Step 2: Create Core Files
```bash
# Core configuration files
touch backend/app/core/{__init__.py,config.py,security.py,exceptions.py,logging.py,constants.py}

# Middleware files
touch backend/app/middleware/{__init__.py,auth.py,tenant.py,error_handler.py,logging.py}

# Schema files
touch backend/app/schemas/{__init__.py,base.py,tenant.py,auth.py,appraiser.py,appraisal.py,session.py,customer.py,rbi.py,purity.py,common.py}
```

#### Step 3: Move Existing Files
```bash
# Move routers to endpoints
mv backend/routers/appraiser.py backend/app/api/v1/endpoints/appraisers.py
mv backend/routers/appraisal.py backend/app/api/v1/endpoints/appraisals.py
mv backend/routers/session.py backend/app/api/v1/endpoints/sessions.py
# ... (move all routers)

# Move services
mv backend/services/* backend/app/services/

# Move models
mv backend/models/database.py backend/app/models/database.py

# Move WebRTC
mv backend/webrtc/* backend/app/webrtc/

# Move AI/Inference
mv backend/inference/* backend/app/ai/inference/
```

#### Step 4: Update Imports
Update all import statements from:
```python
from models.database import Database
from services.camera_service import CameraService
```

To:
```python
from app.models.database import Database
from app.services.camera_service import CameraService
```

#### Step 5: Create New main.py
```python
# backend/main.py
from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="warning"
    )
```

#### Step 6: Test
```bash
# Start the server
uvicorn main:app --reload

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/session/create
```



## 📚 Resources

- [FastAPI Best Practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [Pydantic Settings Documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [Alembic Tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [FastAPI Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/multi-tenancy)

