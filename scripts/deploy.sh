#!/bin/bash
# ==============================================================================
# ThinkCoffee - Deploy Script
# ==============================================================================
# Usage: ./scripts/deploy.sh <environment> [version]
# Example: ./scripts/deploy.sh staging v1.0.0
#          ./scripts/deploy.sh production latest
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
ENVIRONMENT="${1:-staging}"
VERSION="${2:-latest}"
REGISTRY="ghcr.io"
IMAGE_NAME="thinkcoffee/thinkcoffee"
COMPOSE_FILE="docker-compose.yml"
DATA_VOLUME="thinkcoffee_data"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    log_error "Usage: ./deploy.sh <staging|production> [version]"
    exit 1
fi

log_info "=============================================="
log_info "ThinkCoffee Deploy"
log_info "=============================================="
log_info "Environment: $ENVIRONMENT"
log_info "Version:     $VERSION"
log_info "Registry:    $REGISTRY"
log_info "=============================================="

# ------------------------------------------------------------------------------
# Pre-deploy checks
# ------------------------------------------------------------------------------
log_info "Running pre-deploy checks..."

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker not found. Please install Docker."
    exit 1
fi

# Check docker-compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose not found."
    exit 1
fi

log_success "Pre-deploy checks passed"

# ------------------------------------------------------------------------------
# Backup (production only)
# ------------------------------------------------------------------------------
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_info "Creating backup before deploy..."
    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup SQLite database
    if docker volume inspect $DATA_VOLUME &> /dev/null; then
        docker run --rm \
            -v $DATA_VOLUME:/data \
            -v "$(pwd)/$BACKUP_DIR":/backup \
            alpine \
            cp -r /data/. /backup/
        log_success "Backup created at $BACKUP_DIR"
    else
        log_warn "Data volume not found, skipping backup"
    fi
fi

# ------------------------------------------------------------------------------
# Pull latest image
# ------------------------------------------------------------------------------
log_info "Pulling image $REGISTRY/$IMAGE_NAME:$VERSION..."

docker pull "$REGISTRY/$IMAGE_NAME:$VERSION" || {
    log_error "Failed to pull image"
    exit 1
}

log_success "Image pulled successfully"

# ------------------------------------------------------------------------------
# Stop current containers
# ------------------------------------------------------------------------------
log_info "Stopping current containers..."

docker-compose -f $COMPOSE_FILE down --remove-orphans || true

log_success "Containers stopped"

# ------------------------------------------------------------------------------
# Start new containers
# ------------------------------------------------------------------------------
log_info "Starting new containers..."

# Export version for docker-compose
export THINKCOFFEE_VERSION="$VERSION"
export NODE_ENV="$ENVIRONMENT"

docker-compose -f $COMPOSE_FILE up -d

log_success "Containers started"

# ------------------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------------------
log_info "Running health check..."

MAX_RETRIES=30
RETRY_INTERVAL=2
HEALTH_URL="http://localhost:${MCP_PORT:-3000}/health"

for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log_success "Health check passed"
        break
    fi
    
    if [[ $i -eq $MAX_RETRIES ]]; then
        log_error "Health check failed after $MAX_RETRIES attempts"
        log_warn "Rolling back..."
        docker-compose -f $COMPOSE_FILE logs --tail=50
        docker-compose -f $COMPOSE_FILE down
        exit 1
    fi
    
    log_info "Waiting for service to be ready... ($i/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
done

# ------------------------------------------------------------------------------
# Cleanup
# ------------------------------------------------------------------------------
log_info "Cleaning up old images..."
docker image prune -f --filter "until=24h" || true

# ------------------------------------------------------------------------------
# Done
# ------------------------------------------------------------------------------
log_success "=============================================="
log_success "Deploy completed successfully!"
log_success "Environment: $ENVIRONMENT"
log_success "Version:     $VERSION"
log_success "=============================================="

# Show running containers
docker-compose -f $COMPOSE_FILE ps
