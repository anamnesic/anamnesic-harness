#!/bin/bash
# ==============================================================================
# ThinkCoffee Health Check Script
# ==============================================================================
# Usage: ./scripts/health-check.sh
# ==============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

# Configuration
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:3000/health}"
MAX_RETRIES="${MAX_RETRIES:-5}"
DELAY="${DELAY:-2}"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

health_check() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log_info "Health check attempt $attempt/$MAX_RETRIES to $HEALTH_CHECK_URL"
        
        if curl -sf --connect-timeout 5 "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_success "Service is healthy"
            return 0
        fi
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            log_warn "Health check failed. Retrying in ${DELAY}s..."
            sleep "$DELAY"
        fi
        
        attempt=$((attempt + 1))
    done
    
    log_error "Service health check failed after $MAX_RETRIES attempts"
    return 1
}

# Run health check
health_check
