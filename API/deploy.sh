#!/bin/bash

# VAB Enterprise API - Server Deployment Script
# Run this script on your server after copying the project files

set -e

echo "=== VAB Enterprise API Deployment ==="

# Check if Docker is available
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "Docker found. Using Docker deployment..."
    
    # Create .env file if not exists
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "Created .env file from .env.example"
        echo "IMPORTANT: Edit .env with your production values!"
        exit 1
    fi
    
    # Start containers
    docker-compose up -d
    
    echo "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    echo "Running migrations..."
    docker-compose exec api npm run migration:run
    
    echo "=== Deployment Complete ==="
    echo "API running at: http://localhost:3001"
    echo "Swagger docs at: http://localhost:3001/docs"
    
else
    echo "Docker not found. Using manual deployment..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "Node.js is required. Please install Node.js 20+"
        exit 1
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        echo "PostgreSQL client not found. Please install PostgreSQL."
        exit 1
    fi
    
    # Install dependencies
    echo "Installing dependencies..."
    npm ci --production=false
    
    # Build the project
    echo "Building the project..."
    npm run build
    
    # Create .env file if not exists
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "Created .env file from .env.example"
        echo "IMPORTANT: Edit .env with your production values!"
        echo ""
        echo "After editing .env, run: npm run start:prod"
        exit 1
    fi
    
    echo "=== Setup Complete ==="
    echo "To start the server:"
    echo "  Development: npm run start:dev"
    echo "  Production:  npm run start:prod"
    echo ""
    echo "Swagger docs will be at: http://localhost:3001/docs"
fi
