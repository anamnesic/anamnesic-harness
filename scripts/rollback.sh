#!/bin/bash
# ==============================================================================
# ThinkCoffee - Rollback Script
# ==============================================================================
# Usage: ./scripts/rollback.sh <backup_dir>
# Example: ./scripts/rollback.sh backups/20240115_120000
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

BACKUP_DIR="${1:-}"
DATA_VOLUME="thinkcoffee_data"
COMPOSE_FILE="docker-compose.yml"

if [[ -z "$BACKUP_DIR" ]]; then
    log_error "Usage: ./rollback.sh <backup_dir>"
    log_info "Available backups:"
    ls -la backups/ 2>/dev/null || echo "No backups found"
    exit 1
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
    log_error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

log_info "=============================================="
log_info "ThinkCoffee Rollback"
log_info "=============================================="
log_info "Backup: $BACKUP_DIR"
log_info "=============================================="

log_warn "This will restore data from backup and restart services."
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Rollback cancelled"
    exit 0
fi

# Stop services
log_info "Stopping services..."
docker-compose -f $COMPOSE_FILE down

# Restore data
log_info "Restoring data from backup..."
docker run --rm \
    -v $DATA_VOLUME:/data \
    -v "$(pwd)/$BACKUP_DIR":/backup \
    alpine \
    sh -c "rm -rf /data/* && cp -r /backup/. /data/"

log_success "Data restored"

# Start services
log_info "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

log_success "=============================================="
log_success "Rollback completed!"
log_success "=============================================="
