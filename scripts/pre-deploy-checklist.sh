#!/bin/bash
# ==============================================================================
# ThinkCoffee Pre-Deployment Checklist
# ==============================================================================
# Usage: ./scripts/pre-deploy-checklist.sh
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

ENVIRONMENT="${ENVIRONMENT:-staging}"
CHECKS_PASSED=0
CHECKS_FAILED=0

log_info() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo "=========================================="
echo "Pre-Deployment Checklist - $ENVIRONMENT"
echo "=========================================="

# Check Docker
log_info "Checking Docker installation..."
if command -v docker &> /dev/null; then
    log_pass "Docker is installed"
else
    log_fail "Docker is not installed"
fi

# Check Docker Compose
log_info "Checking Docker Compose installation..."
if command -v docker-compose &> /dev/null; then
    log_pass "Docker Compose is installed"
else
    log_fail "Docker Compose is not installed"
fi

# Check environment files
log_info "Checking environment files..."
if [ -f ".env" ]; then
    log_pass ".env file exists"
else
    log_warn ".env file not found (will use .env.example)"
fi

# Check compose files
log_info "Checking Docker Compose files..."
if [ -f "docker-compose.yml" ]; then
    log_pass "docker-compose.yml exists"
else
    log_fail "docker-compose.yml not found"
fi

if [ "$ENVIRONMENT" = "production" ] && [ ! -f "docker-compose.prod.yml" ]; then
    log_warn "docker-compose.prod.yml not found for production deployment"
fi

# Check Dockerfile
log_info "Checking Dockerfile..."
if [ -f "Dockerfile" ]; then
    log_pass "Dockerfile exists"
else
    log_fail "Dockerfile not found"
fi

# Check scripts
log_info "Checking deployment scripts..."
if [ -f "scripts/deploy.sh" ]; then
    log_pass "deploy.sh exists"
else
    log_fail "deploy.sh not found"
fi

# Check disk space
log_info "Checking disk space..."
AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -gt 1048576 ]; then  # More than 1GB
    log_pass "Sufficient disk space available ($(($AVAILABLE_SPACE / 1024 / 1024))GB)"
else
    log_warn "Low disk space: $(($AVAILABLE_SPACE / 1024 / 1024))GB available"
fi

# Check network connectivity
log_info "Checking network connectivity..."
if curl -s --connect-timeout 5 https://www.google.com > /dev/null 2>&1 || \
   curl -s --connect-timeout 5 https://registry-1.docker.io > /dev/null 2>&1; then
    log_pass "Network connectivity is available"
else
    log_warn "Network connectivity check failed"
fi

echo "=========================================="
echo "Checklist Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
echo "=========================================="

if [ $CHECKS_FAILED -gt 0 ]; then
    echo -e "${RED}Pre-deployment checks failed!${NC}"
    exit 1
fi

echo -e "${GREEN}All checks passed. Ready to deploy!${NC}"
exit 0
