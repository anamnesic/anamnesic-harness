#!/bin/bash 
# ThinkCoffee - Health Check Script 
set -euo pipefail 
HOST=" " 
PORT= 
curl -sf http://System.Management.Automation.Internal.Host.InternalHost:/health || exit 1
