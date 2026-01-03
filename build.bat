@echo off
REM Gold Loan Appraisal - Build Script for Production (Windows)

echo 🚀 Building Gold Loan Appraisal System for Production...

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
docker-compose down

REM Build and start services
echo 🏗️ Building and starting services...
docker-compose up --build -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Check service status
echo 📊 Service Status:
docker-compose ps

REM Show logs
echo 📝 Recent logs:
docker-compose logs --tail=20

echo.
echo ✅ Gold Loan Appraisal System is ready!
echo 🌐 Frontend: http://localhost
echo 🔗 Backend API: http://localhost:8000
echo 🔗 API Documentation: http://localhost:8000/docs
echo 🐘 Database: localhost:5432
echo.
echo 📋 Useful commands:
echo   - View logs: docker-compose logs -f
echo   - Stop services: docker-compose down
echo   - Restart services: docker-compose restart

pause