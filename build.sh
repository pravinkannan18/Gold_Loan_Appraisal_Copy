#!/bin/bash

# Gold Loan Appraisal - Build Script for Production

echo "🚀 Building Gold Loan Appraisal System for Production..."

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
docker-compose down

# Remove old images (optional)
read -p "🗑️  Do you want to remove old images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing old images..."
    docker-compose down --rmi all
fi

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service status
echo "📊 Service Status:"
docker-compose ps

# Show logs
echo "📝 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Gold Loan Appraisal System is ready!"
echo "🌐 Frontend: http://localhost"
echo "🔗 Backend API: http://localhost:8000"
echo "🔗 API Documentation: http://localhost:8000/docs"
echo "🐘 Database: localhost:5432"
echo ""
echo "📋 Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"