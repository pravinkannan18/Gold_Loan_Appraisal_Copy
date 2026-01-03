@echo off
REM Gold Loan Appraisal - Development Build Script (Windows)

echo 🚀 Starting Gold Loan Appraisal System in Development Mode...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

REM Stop any running containers
echo 🛑 Stopping any running containers...
docker-compose -f docker-compose.dev.yml down

REM Build and start services in development mode
echo 🏗️ Building and starting services in development mode...
docker-compose -f docker-compose.dev.yml up --build

echo.
echo ✅ Gold Loan Appraisal Development Environment is ready!
echo 🌐 Frontend (Dev): http://localhost:3000
echo 🔗 Backend API (Dev): http://localhost:8000
echo 🔗 API Documentation: http://localhost:8000/docs
echo 🐘 Database: localhost:5432
echo.
echo 📋 Development features:
echo   - Hot reload enabled for both frontend and backend
echo   - Source code is mounted for live editing
echo   - Development optimizations active

pause