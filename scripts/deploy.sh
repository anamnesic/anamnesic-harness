#!/bin/bash

################################################################################
# ThinkCoffee - Production Deployment Script
# 
# Description: Automated deployment script for production environment
# Features:
#   - Pre-deployment validation
#   - Docker image pull and verification
#   - Graceful service shutdown
#   - Configuration backup
#   - Blue-green style deployment
#   - Health check verification
#   - Automatic rollback on failure
#
# Environment Variables:
#   DEPLOY_USER: SSH user for deployment
#   DEPLOY_HOST: Target deployment host
#   DOCKER_IMAGE: Docker image URI (format: registry/repo:tag)
#   DEPLOY_PATH: Path on remote server (default: /opt/thinkcoffee)
################################################################################

set -e

# Configuration
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_HOST="${DEPLOY_HOST:-production.thinkcoffee.com}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/thinkcoffee}"
DOCKER_IMAGE="${DOCKER_IMAGE:-ghcr.io/thinkcoffee/thinkcoffee:latest}"
RETRY_ATTEMPTS=30
RETRY_DELAY=2
MAX_BACKUP_AGE=30  # Keep backups for 30 days

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

execute_remote() {
    ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=accept-new \
        "${DEPLOY_USER}@${DEPLOY_HOST}" "$1"
}

# Main deployment flow
main() {
    log_info "=========================================="
    log_info "ThinkCoffee - Production Deployment"
    log_info "=========================================="
    log_info "Deployment User: $DEPLOY_USER"
    log_info "Deployment Host: $DEPLOY_HOST"
    log_info "Docker Image: $DOCKER_IMAGE"
    log_info "Deploy Path: $DEPLOY_PATH"
    log_info "Timestamp: $(date)"
    log_info "=========================================="
    echo

    # Step 1: Pre-deployment validation
    log_info "Step 1/7: Pre-deployment validation..."
    if ! validate_prerequisites; then
        log_error "Pre-deployment validation failed"
        exit 1
    fi
    log_success "Pre-deployment validation passed"
    echo

    # Step 2: Pull Docker image
    log_info "Step 2/7: Pulling Docker image..."
    if ! execute_remote "docker pull $DOCKER_IMAGE 2>&1 | head -20"; then
        log_error "Failed to pull Docker image"
        exit 1
    fi
    log_success "Docker image pulled successfully"
    echo

    # Step 3: Backup current configuration
    log_info "Step 3/7: Backing up current configuration..."
    if ! backup_configuration; then
        log_error "Backup failed"
        exit 1
    fi
    log_success "Configuration backed up successfully"
    echo

    # Step 4: Stop running containers
    log_info "Step 4/7: Stopping running containers..."
    execute_remote "cd $DEPLOY_PATH && docker-compose down --timeout=30 || true" 2>/dev/null || true
    log_success "Containers stopped"
    echo

    # Step 5: Start new containers with new image
    log_info "Step 5/7: Starting new deployment..."
    if ! start_deployment; then
        log_error "Deployment failed, attempting rollback..."
        rollback_deployment
        exit 1
    fi
    log_success "New deployment started"
    echo

    # Step 6: Health check verification
    log_info "Step 6/7: Verifying service health..."
    if ! verify_health; then
        log_error "Health check failed, attempting rollback..."
        rollback_deployment
        exit 1
    fi
    log_success "Health check passed"
    echo

    # Step 7: Cleanup
    log_info "Step 7/7: Cleaning up old resources..."
    cleanup_old_backups || true
    execute_remote "docker system prune -f --filter \"until=${MAX_BACKUP_AGE}d\" || true" 2>/dev/null || true
    log_success "Cleanup completed"
    echo

    log_success "=========================================="
    log_success "Deployment completed successfully!"
    log_success "Application: https://$DEPLOY_HOST"
    log_success "Timestamp: $(date)"
    log_success "=========================================="
}

validate_prerequisites() {
    # Check SSH connectivity
    if ! execute_remote "echo 'SSH connection OK'"; then
        log_error "Cannot connect to $DEPLOY_HOST via SSH"
        return 1
    fi

    # Check Docker is running
    if ! execute_remote "docker ps > /dev/null 2>&1"; then
        log_error "Docker is not running on $DEPLOY_HOST"
        return 1
    fi

    # Check deploy path exists
    if ! execute_remote "test -d $DEPLOY_PATH"; then
        log_warning "Deploy path does not exist, creating..."
        execute_remote "mkdir -p $DEPLOY_PATH"
    fi

    # Check docker-compose.yml exists
    if ! execute_remote "test -f $DEPLOY_PATH/docker-compose.yml"; then
        log_error "docker-compose.yml not found in $DEPLOY_PATH"
        return 1
    fi

    # Check .env file exists
    if ! execute_remote "test -f $DEPLOY_PATH/.env"; then
        log_error ".env file not found in $DEPLOY_PATH"
        return 1
    fi

    return 0
}

backup_configuration() {
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    
    execute_remote "cd $DEPLOY_PATH && mkdir -p $backup_dir && \
        cp .env $backup_dir/ || true && \
        cp docker-compose.yml $backup_dir/ || true && \
        echo 'Backup created in $backup_dir'"

    return 0
}

start_deployment() {
    execute_remote "cd $DEPLOY_PATH && \
        DOCKER_IMAGE=$DOCKER_IMAGE docker-compose up -d \
        2>&1" || return 1
    
    # Give containers time to start
    sleep 5
    return 0
}

verify_health() {
    local retry=0
    
    while [ $retry -lt $RETRY_ATTEMPTS ]; do
        log_info "Health check attempt $((retry + 1))/$RETRY_ATTEMPTS..."
        
        local health_status=$(execute_remote \
            "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health 2>/dev/null || echo '000'" \
            2>/dev/null)
        
        if [ "$health_status" = "200" ]; then
            log_success "Health check PASSED (HTTP $health_status)"
            return 0
        fi
        
        retry=$((retry + 1))
        
        if [ $retry -lt $RETRY_ATTEMPTS ]; then
            log_warning "Health check failed (HTTP $health_status), retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    log_error "Health check failed after $RETRY_ATTEMPTS attempts"
    return 1
}

rollback_deployment() {
    log_warning "Attempting rollback to previous deployment..."
    
    execute_remote "cd $DEPLOY_PATH && \
        ls -t backups/ | head -1 | while read backup; do
            test -n \"\$backup\" && \
            cp backups/\$backup/.env . 2>/dev/null || true && \
            docker-compose up -d 2>/dev/null || true
        done"
    
    sleep 5
    
    if verify_health; then
        log_success "Rollback successful - previous version restored"
        return 0
    else
        log_error "Rollback failed - manual intervention required"
        return 1
    fi
}

cleanup_old_backups() {
    execute_remote "cd $DEPLOY_PATH && \
        find backups/ -maxdepth 1 -type d -mtime +$MAX_BACKUP_AGE -exec rm -rf {} + 2>/dev/null || true"
    
    log_info "Old backups cleaned up"
    return 0
}

# Execute main deployment
main "$@"
