# Gold Loan Appraisal System - Docker Setup

This repository contains a complete Gold Loan Appraisal System with frontend, backend, and database components, all containerized using Docker.

## 🏗️ Architecture

- **Frontend**: React + Vite + TypeScript (Port 80/3000)
- **Backend**: FastAPI + Python (Port 8000)
- **Database**: PostgreSQL (Port 5432)
- **Containerization**: Docker + Docker Compose

## 📋 Prerequisites

Before running the application, ensure you have the following installed:

- [Docker](https://docs.docker.com/get-docker/) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)

## 🚀 Quick Start

### Production Mode

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Gold Loan Appraisal"
   ```

2. **Run the build script**
   
   **Linux/macOS:**
   ```bash
   chmod +x build.sh
   ./build.sh
   ```
   
   **Windows:**
   ```cmd
   build.bat
   ```

3. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Development Mode

1. **Run the development script**
   
   **Linux/macOS:**
   ```bash
   chmod +x dev.sh
   ./dev.sh
   ```
   
   **Windows:**
   ```cmd
   dev.bat
   ```

2. **Access the development environment**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🔧 Manual Docker Commands

### Production Build

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v
```

### Development Build

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

## 📁 Project Structure

```
Gold Loan Appraisal/
├── frontend/                 # React frontend application
│   ├── src/                 # Source code
│   ├── Dockerfile           # Production frontend container
│   ├── Dockerfile.dev       # Development frontend container
│   ├── nginx.conf           # Nginx configuration
│   └── package.json         # Node.js dependencies
├── backend/                 # FastAPI backend application
│   ├── main.py             # Main application file
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile          # Backend container
│   └── .dockerignore       # Docker ignore file
├── database/               # Database initialization
│   └── init.sql           # Database schema and initial data
├── docker-compose.yml      # Production Docker Compose
├── docker-compose.dev.yml  # Development Docker Compose
├── build.sh/.bat          # Production build scripts
└── dev.sh/.bat            # Development build scripts
```

## 🛠️ Services Configuration

### Frontend Service
- **Base Image**: nginx:alpine (production), node:18-alpine (development)
- **Port**: 80 (production), 3000 (development)
- **Features**: 
  - Optimized build with multi-stage Docker build
  - Nginx with gzip compression and security headers
  - Client-side routing support

### Backend Service
- **Base Image**: python:3.11-slim
- **Port**: 8000
- **Features**:
  - FastAPI with automatic API documentation
  - Computer vision libraries (OpenCV, insightface)
  - PostgreSQL database integration
  - File upload support

### Database Service
- **Base Image**: postgres:15-alpine
- **Port**: 5432
- **Features**:
  - Persistent data storage
  - Automatic schema initialization
  - Health checks

## 🔒 Environment Variables

### Backend Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `PYTHONPATH`: Python path configuration
- `PYTHONUNBUFFERED`: Python output buffering

### Frontend Environment Variables
- `VITE_API_URL`: Backend API URL
- `CHOKIDAR_USEPOLLING`: File watching for development

## 📊 Health Checks

All services include health checks:
- **Database**: PostgreSQL ready check
- **Backend**: HTTP health endpoint
- **Frontend**: Nginx service check

## 🧪 Development Features

The development environment includes:
- **Hot Reload**: Automatic restart on code changes
- **Volume Mounting**: Source code mounted for live editing
- **Debug Mode**: Development optimizations and verbose logging

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep :80
   netstat -tulpn | grep :8000
   netstat -tulpn | grep :5432
   ```

2. **Permission Issues**
   ```bash
   # Make scripts executable (Linux/macOS)
   chmod +x build.sh dev.sh
   ```

3. **Docker Space Issues**
   ```bash
   # Clean up Docker
   docker system prune -a
   docker volume prune
   ```

4. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose logs database
   
   # Restart database service
   docker-compose restart database
   ```

### Useful Commands

```bash
# View all running containers
docker ps

# View service logs
docker-compose logs [service-name]

# Execute commands inside containers
docker-compose exec backend bash
docker-compose exec frontend sh

# Rebuild specific service
docker-compose up --build [service-name]

# View resource usage
docker stats
```

## 📝 Database Management

### Backup Database
```bash
docker-compose exec database pg_dump -U postgres gold_loan_db > backup.sql
```

### Restore Database
```bash
docker-compose exec -T database psql -U postgres gold_loan_db < backup.sql
```

### Access Database
```bash
docker-compose exec database psql -U postgres -d gold_loan_db
```

## 🚀 Production Deployment

For production deployment, consider:

1. **Environment Variables**: Use proper environment files
2. **SSL/TLS**: Configure HTTPS with reverse proxy
3. **Monitoring**: Add logging and monitoring solutions
4. **Scaling**: Use Docker Swarm or Kubernetes for scaling
5. **Security**: Implement proper security measures and secrets management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test using the development environment
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.