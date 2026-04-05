#!/bin/bash
# Health check do MCP Server
set -e

curl -sf http://localhost:3000/health || exit 1
