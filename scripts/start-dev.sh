#!/bin/bash

# ==============================================================================
# ThinkCoffee Development Startup Script
# ==============================================================================

set -e

echo "🚀 Starting ThinkCoffee Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if .env exists
if [ ! -f .env ]; then
    log_warning ".env not found, copying from .env.example"
    cp .env.example .env
    log_info "Please edit .env with your configuration"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    log_error "pnpm is not installed. Please install it first:"
    echo "npm install -g pnpm"
    exit 1
fi

# Install dependencies
log_info "Installing dependencies..."
pnpm install

# Start infrastructure services
log_info "Starting infrastructure services (PostgreSQL, Redis)..."
docker-compose up -d postgres redis

# Wait for database to be ready
log_info "Waiting for database to be ready..."
max_attempts=30
attempt=1
while ! docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    if [ $attempt -eq $max_attempts ]; then
        log_error "Database failed to start after $max_attempts attempts"
        exit 1
    fi
    echo -n "."
    sleep 1
    ((attempt++))
done
echo ""
log_success "Database is ready!"

# Run database migrations
log_info "Running database migrations..."
if [ -f "scripts/migrate.sh" ]; then
    ./scripts/migrate.sh
else
    log_warning "No migration script found, skipping migrations"
fi

# Build the project
log_info "Building the project..."
pnpm build

# Start development mode
case "${1:-full}" in
    "backend")
        log_info "Starting backend only..."
        pnpm run dev:backend
        ;;
    "frontend")
        log_info "Starting frontend only..."
        pnpm run dev:frontend
        ;;
    "mcp")
        log_info "Starting MCP server only..."
        pnpm run dev:mcp
        ;;
    "full")
        log_info "Starting full development environment..."
        
        # Start backend in background
        pnpm run dev:backend &
        BACKEND_PID=$!
        
        # Start frontend in background
        if [ -d "packages/frontend" ]; then
            pnpm run dev:frontend &
            FRONTEND_PID=$!
        fi
        
        # Trap SIGINT to cleanup background processes
        trap 'log_info "Shutting down..."; kill $BACKEND_PID 2>/dev/null; [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null; exit 0' INT
        
        log_success "Development environment started!"
        log_info "Backend: http://localhost:3000"
        [ -n "$FRONTEND_PID" ] && log_info "Frontend: http://localhost:3001"
        log_info "Press Ctrl+C to stop all services"
        
        # Wait for background processes
        wait
        ;;
    *)
        log_error "Usage: $0 [backend|frontend|mcp|full]"
        exit 1
        ;;
esac