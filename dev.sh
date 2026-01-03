#!/bin/bash

# Gold Loan Appraisal - Development Build Script

echo "🚀 Starting Gold Loan Appraisal System in Development Mode..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Stop any running containers
echo "🛑 Stopping any running containers..."
docker-compose -f docker-compose.dev.yml down

# Build and start services in development mode
echo "🏗️ Building and starting services in development mode..."
docker-compose -f docker-compose.dev.yml up --build

echo ""
echo "✅ Gold Loan Appraisal Development Environment is ready!"
echo "🌐 Frontend (Dev): http://localhost:3000"
echo "🔗 Backend API (Dev): http://localhost:8000"
echo "🔗 API Documentation: http://localhost:8000/docs"
echo "🐘 Database: localhost:5432"
echo ""
echo "📋 Development features:"
echo "  - Hot reload enabled for both frontend and backend"
echo "  - Source code is mounted for live editing"
echo "  - Development optimizations active"