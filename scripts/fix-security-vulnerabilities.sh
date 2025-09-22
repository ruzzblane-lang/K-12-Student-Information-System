#!/bin/bash

# Security vulnerability fix script for School SIS
# This script updates dependencies to fix known security vulnerabilities

set -e

echo "🔒 Fixing security vulnerabilities..."

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend"

echo "📦 Updating react-scripts to latest version..."
npm install react-scripts@latest

echo "🔧 Running npm audit fix (non-breaking changes only)..."
npm audit fix

echo "📊 Checking remaining vulnerabilities..."
npm audit --audit-level=high

echo "✅ Security vulnerability fixes completed!"

# Navigate to backend directory
cd "../backend"

echo "🔧 Checking backend dependencies..."
npm audit --audit-level=moderate

echo "🎉 All security checks completed!"
