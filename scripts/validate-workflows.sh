#!/bin/bash

# GitHub Actions Workflow Validation Script
# This script validates all GitHub Actions workflow files using actionlint

set -e

echo "🔍 Validating GitHub Actions workflows..."

# Check if actionlint is available
if ! command -v ./actionlint &> /dev/null; then
    echo "❌ Error: actionlint not found. Please ensure it's installed and executable."
    exit 1
fi

# Find all workflow files
WORKFLOW_FILES=$(find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null || true)

if [ -z "$WORKFLOW_FILES" ]; then
    echo "⚠️  No workflow files found in .github/workflows/"
    exit 0
fi

echo "📁 Found workflow files:"
echo "$WORKFLOW_FILES"
echo ""

# Validate each workflow file
VALIDATION_FAILED=false

for file in $WORKFLOW_FILES; do
    echo "🔍 Validating $file..."
    if ./actionlint "$file"; then
        echo "✅ $file - Validation passed"
    else
        echo "❌ $file - Validation failed"
        VALIDATION_FAILED=true
    fi
    echo ""
done

if [ "$VALIDATION_FAILED" = true ]; then
    echo "❌ Some workflow files failed validation. Please fix the errors above."
    exit 1
else
    echo "🎉 All workflow files passed validation!"
    exit 0
fi
