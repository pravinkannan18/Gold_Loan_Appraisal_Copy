# Gold Loan Appraisal - Backend API

FastAPI backend with PostgreSQL database for the Gold Loan Appraisal system.

---

## 📁 Project Structure

```
backend/
├── main.py                      # FastAPI application & API endpoints
├── database_postgresql.py       # PostgreSQL database operations
├── camera_service.py           # Camera capture functionality
├── config.py                   # Configuration settings
├── setup_database.py           # Database setup script
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (your config)
├── .env.example               # Environment template
├── SETUP_DATABASE.bat         # Easy database setup
└── README_POSTGRESQL.md       # PostgreSQL detailed guide
```

---

## 🚀 Quick Start

### 1. Install PostgreSQL

**Docker (Recommended):**
```bash
docker run --name gold-loan-postgres ^
  -e POSTGRES_PASSWORD=admin@123 ^
  -e POSTGRES_DB=gold_loan_appraisal ^
  -p 5432:5432 ^
  -d postgres:15
```

**Or install from:** https://www.postgresql.org/download/

---

### 2. Setup Database

**Easy way - Double-click:**
```
SETUP_DATABASE.bat
```

**Or manually:**
```bash
pip install -r requirements.txt
python setup_database.py
```

---

### 3. Start Backend

```bash
python main.py
```

**You should see:**
```
Using PostgreSQL database
PostgreSQL database initialized successfully
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## 📋 Requirements

- Python 3.8+
- PostgreSQL 12+
- pip (Python package manager)

---

## 🔧 Configuration

Edit `.env` file:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=gold_loan_appraisal
POSTGRES_USER=postgres
POSTGRES_PASSWORD=admin@123
```

---

## 📡 API Endpoints

### Health Check
- `GET /` - API info
- `GET /health` - Health check & database status

### Appraiser
- `POST /api/appraiser` - Save appraiser details
- `GET /api/appraiser/{id}` - Get appraiser by ID

### Appraisal
- `POST /api/appraisal` - Create complete appraisal
- `GET /api/appraisal/{id}` - Get appraisal details
- `GET /api/appraisals` - List all appraisals
- `DELETE /api/appraisal/{id}` - Delete appraisal

### Camera
- `POST /api/camera/check` - Check camera availability
- `POST /api/camera/capture` - Capture image
- `POST /api/camera/preview` - Show camera preview

### Statistics
- `GET /api/statistics` - Get appraisal statistics

---

## 🗄️ Database Schema

### Tables:
1. **appraisers** - Appraiser information
2. **appraisals** - Appraisal records
3. **jewellery_items** - Individual items
4. **rbi_compliance** - RBI compliance data
5. **purity_tests** - Purity test results

See `README_POSTGRESQL.md` for detailed schema.

---

## 🧪 Testing

### Test API Health:
```bash
curl http://localhost:8000/health
```

### Test in Browser:
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

---

## 🐛 Troubleshooting

### Backend won't start
```bash
pip install -r requirements.txt
python main.py
```

### Database connection error
- Check PostgreSQL is running
- Verify `.env` credentials
- Run `python setup_database.py`

### Port 8000 already in use
- Stop other services on port 8000
- Or change port in `main.py` (line 309)

---

## 📦 Dependencies

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0
python-multipart==0.0.6
opencv-python==4.9.0.80
numpy==1.26.3
python-dotenv==1.0.0
psycopg2-binary==2.9.9
```

---

## 🔐 Security Notes

For production:
- Change default password in `.env`
- Use environment variables for sensitive data
- Enable HTTPS/SSL
- Set up proper authentication
- Use connection pooling

---

## 📖 Documentation

- **PostgreSQL Guide:** `README_POSTGRESQL.md`
- **API Docs:** http://localhost:8000/docs (when running)
- **Setup Script:** `setup_database.py`

---

## 🎯 Development

### Run in development mode:
```bash
python main.py
```

### Run with auto-reload:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## ✅ Success Checklist

- [ ] PostgreSQL installed and running
- [ ] Database setup completed
- [ ] Backend starts successfully
- [ ] API health check passes
- [ ] Can create appraisals
- [ ] Data persists in PostgreSQL

---

**Backend is ready! Start the server and begin using the API.** 🚀
