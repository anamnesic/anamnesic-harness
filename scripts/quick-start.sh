#!/bin/bash
# ==============================================================================
# ThinkCoffee Quick Start Script
# ==============================================================================
# Initializes the development environment with all necessary infrastructure
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Main quick start
main() {
    log "Starting ThinkCoffee Quick Start..."
    
    cd "$PROJECT_ROOT"
    
    # Check for Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    fi
    
    log "Setting up infrastructure..."
    
    # Run setup script
    if [ -f "scripts/setup-infrastructure.js" ]; then
        node scripts/setup-infrastructure.js
    else
        log_error "Setup script not found"
        exit 1
    fi
    
    # Start containers
    log "Starting Docker containers..."
    docker-compose up -d
    
    log_success "ThinkCoffee is ready!"
    log "MCP Server: http://localhost:3000"
    
    # Show next steps
    log "Next steps:"
    echo "  1. Check status: docker-compose ps"
    echo "  2. View logs: docker-compose logs -f mcp-server"
    echo "  3. Stop: docker-compose down"
}

main "$@"