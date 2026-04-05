#!/bin/bash

################################################################################
# ThinkCoffee - Infrastructure Validation Script
# 
# Description: Validates that all infrastructure components are properly configured
# Usage: bash scripts/validate-infrastructure.sh
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

passed=0
failed=0
warnings=0

log_check() {
    echo -ne "${BLUE}[CHECK]${NC} $1 ... "
}

log_pass() {
    echo -e "${GREEN}✓ PASS${NC}"
    ((passed++))
}

log_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((failed++))
}

log_warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((warnings++))
}

echo -e "${BLUE}=========================================="
echo "ThinkCoffee - Infrastructure Validation"
echo "==========================================${NC}"
echo

# =============================================================================
# CI/CD Pipeline Checks
# =============================================================================
echo -e "${BLUE}CI/CD Pipeline Checks:${NC}"

log_check "CI workflow file exists"
if [ -f ".github/workflows/ci.yml" ]; then
    log_pass
else
    log_fail ".github/workflows/ci.yml not found"
fi

log_check "CI workflow has 'build-and-test' job"
if grep -q "build-and-test:" .github/workflows/ci.yml 2>/dev/null; then
    log_pass
else
    log_fail "CI workflow missing 'build-and-test' job"
fi

log_check "CI workflow has 'docker-build' job"
if grep -q "docker-build:" .github/workflows/ci.yml 2>/dev/null; then
    log_pass
else
    log_fail "CI workflow missing 'docker-build' job"
fi

log_check "CI workflow has 'deploy' job"
if grep -q "deploy:" .github/workflows/ci.yml 2>/dev/null; then
    log_pass
else
    log_fail "CI workflow missing 'deploy' job"
fi

echo

# =============================================================================
# Docker Configuration Checks
# =============================================================================
echo -e "${BLUE}Docker Configuration Checks:${NC}"

log_check "Dockerfile exists"
if [ -f "Dockerfile" ]; then
    log_pass
else
    log_fail "Dockerfile not found"
fi

log_check "Dockerfile uses multi-stage build"
if grep -q "as builder" Dockerfile 2>/dev/null; then
    log_pass
else
    log_warn "Dockerfile does not use multi-stage build"
fi

log_check "Dockerfile has HEALTHCHECK"
if grep -q "HEALTHCHECK" Dockerfile 2>/dev/null; then
    log_pass
else
    log_warn "Dockerfile missing HEALTHCHECK"
fi

log_check "Dockerfile creates non-root user"
if grep -q "adduser" Dockerfile 2>/dev/null; then
    log_pass
else
    log_warn "Dockerfile does not create non-root user"
fi

log_check "docker-compose.yml exists"
if [ -f "docker-compose.yml" ]; then
    log_pass
else
    log_fail "docker-compose.yml not found"
fi

log_check "docker-compose.yml has app service"
if grep -q "app:" docker-compose.yml 2>/dev/null; then
    log_pass
else
    log_fail "docker-compose.yml missing 'app' service"
fi

log_check "docker-compose.yml has postgres service"
if grep -q "postgres:" docker-compose.yml 2>/dev/null; then
    log_pass
else
    log_warn "docker-compose.yml missing 'postgres' service"
fi

log_check "docker-compose.yml has redis service"
if grep -q "redis:" docker-compose.yml 2>/dev/null; then
    log_pass
else
    log_warn "docker-compose.yml missing 'redis' service"
fi

echo

# =============================================================================
# Environment Variables Checks
# =============================================================================
echo -e "${BLUE}Environment Variables Checks:${NC}"

log_check ".env.example exists"
if [ -f ".env.example" ]; then
    log_pass
else
    log_fail ".env.example not found"
fi

log_check ".env.example has NODE_ENV"
if grep -q "NODE_ENV=" .env.example 2>/dev/null; then
    log_pass
else
    log_fail ".env.example missing NODE_ENV"
fi

log_check ".env.example has DATABASE_URL"
if grep -q "DATABASE_URL=" .env.example 2>/dev/null; then
    log_pass
else
    log_fail ".env.example missing DATABASE_URL"
fi

log_check ".env.example has JWT_SECRET"
if grep -q "JWT_SECRET=" .env.example 2>/dev/null; then
    log_pass
else
    log_fail ".env.example missing JWT_SECRET"
fi

log_check ".env.example has REDIS configuration"
if grep -q "REDIS_HOST=" .env.example 2>/dev/null; then
    log_pass
else
    log_warn ".env.example missing REDIS configuration"
fi

log_check ".env file is git-ignored"
if grep -q "^\.env" .gitignore 2>/dev/null; then
    log_pass
else
    log_warn ".env file not in .gitignore"
fi

echo

# =============================================================================
# Deployment Scripts Checks
# =============================================================================
echo -e "${BLUE}Deployment Scripts Checks:${NC}"

log_check "scripts/deploy.sh exists"
if [ -f "scripts/deploy.sh" ]; then
    log_pass
else
    log_fail "scripts/deploy.sh not found"
fi

log_check "scripts/deploy.sh is executable"
if [ -x "scripts/deploy.sh" ] 2>/dev/null; then
    log_pass
else
    log_warn "scripts/deploy.sh is not executable (chmod +x scripts/deploy.sh)"
fi

log_check "scripts/health-check.sh exists"
if [ -f "scripts/health-check.sh" ]; then
    log_pass
else
    log_warn "scripts/health-check.sh not found"
fi

log_check "scripts/pre-deploy-checklist.sh exists"
if [ -f "scripts/pre-deploy-checklist.sh" ]; then
    log_pass
else
    log_warn "scripts/pre-deploy-checklist.sh not found"
fi

echo

# =============================================================================
# Application Configuration Checks
# =============================================================================
echo -e "${BLUE}Application Configuration Checks:${NC}"

log_check "package.json exists"
if [ -f "package.json" ]; then
    log_pass
else
    log_fail "package.json not found"
fi

log_check "package.json has build script"
if grep -q '"build"' package.json 2>/dev/null; then
    log_pass
else
    log_warn "package.json missing 'build' script"
fi

log_check "package.json has test script"
if grep -q '"test"' package.json 2>/dev/null; then
    log_pass
else
    log_warn "package.json missing 'test' script"
fi

log_check ".dockerignore exists"
if [ -f ".dockerignore" ]; then
    log_pass
else
    log_warn ".dockerignore not found"
fi

echo

# =============================================================================
# Local Docker Testing
# =============================================================================
echo -e "${BLUE}Local Docker Testing:${NC}"

log_check "Docker is installed"
if command -v docker &> /dev/null; then
    log_pass
else
    log_fail "Docker not installed"
fi

log_check "docker-compose is installed"
if command -v docker-compose &> /dev/null; then
    log_pass
else
    log_warn "docker-compose not installed"
fi

log_check "Docker daemon is running"
if docker ps > /dev/null 2>&1; then
    log_pass
else
    log_warn "Docker daemon not running"
fi

log_check "Can build Dockerfile"
if docker build -t thinkcoffee:test --target builder . > /dev/null 2>&1; then
    log_pass
    docker rmi thinkcoffee:test > /dev/null 2>&1 || true
else
    log_warn "Failed to build Dockerfile (may be OK if build has errors)"
fi

echo

# =============================================================================
# Summary
# =============================================================================
echo -e "${BLUE}=========================================="
echo "VALIDATION SUMMARY"
echo "==========================================${NC}"
echo -e "${GREEN}Passed : $passed${NC}"
echo -e "${RED}Failed : $failed${NC}"
echo -e "${YELLOW}Warnings: $warnings${NC}"
echo

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some critical checks failed. Please review above.${NC}"
    exit 1
fi
