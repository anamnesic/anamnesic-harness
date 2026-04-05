#!/bin/bash
# ThinkCoffee - Quick Start
set -e

echo "[ThinkCoffee] Buildando containers..."
docker compose build

echo "[ThinkCoffee] Subindo containers..."
docker compose up -d

echo "[ThinkCoffee] Pronto! Acesse http://localhost:3000/health"
