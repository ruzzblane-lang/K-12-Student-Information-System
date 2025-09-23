#!/bin/bash

# Start Compliance Services
echo "🔒 Starting Compliance Services..."

# Start the main application with compliance enabled
export NODE_ENV=production
export COMPLIANCE_MODE=paranoia

# Start compliance monitoring in background
nohup node scripts/compliance-monitor.js > logs/compliance-monitor.log 2>&1 &

# Start the main application
npm start
