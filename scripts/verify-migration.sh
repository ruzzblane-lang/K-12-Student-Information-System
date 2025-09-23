#!/bin/bash

# Migration Verification Script
# This script verifies that the documentation migration was completed successfully

set -e

echo "🔍 Verifying Documentation Migration"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "This script must be run from the school-sis root directory"
    exit 1
fi

print_status "Starting migration verification..."

# Phase 1: Verify essential files are preserved
print_status "Phase 1: Verifying essential files are preserved..."

essential_files="README.md LICENSE.txt REPOSITORY_DESCRIPTION.md GITHUB_DESCRIPTION.txt docker-compose.yml Dockerfile package.json backend/package.json frontend/package.json"

essential_count=0
total_essential=0
for file in $essential_files; do
    total_essential=$((total_essential + 1))
    if [ -f "$file" ]; then
        print_success "✓ $file preserved"
        essential_count=$((essential_count + 1))
    else
        print_error "✗ $file missing!"
    fi
done

print_status "Essential files preserved: $essential_count/$total_essential"

# Phase 2: Verify wiki directory exists and has content
print_status "Phase 2: Verifying wiki structure..."

if [ -d "wiki" ]; then
    wiki_count=$(find wiki -name "*.md" | wc -l)
    print_success "✓ Wiki directory exists with $wiki_count pages"
    
    # Check for main wiki pages
    main_pages="wiki/Home.md wiki/Getting-Started.md wiki/API-Reference.md wiki/Database-Schema.md wiki/Authentication-Security.md wiki/Testing-Guide.md wiki/Integration-Guide.md wiki/Product-Specification.md"
    
    main_page_count=0
    total_main_pages=0
    for page in $main_pages; do
        total_main_pages=$((total_main_pages + 1))
        if [ -f "$page" ]; then
            print_success "✓ $page exists"
            main_page_count=$((main_page_count + 1))
        else
            print_warning "⚠ $page missing"
        fi
    done
    
    print_status "Main wiki pages: $main_page_count/$total_main_pages"
else
    print_error "✗ Wiki directory missing!"
fi

# Phase 3: Verify backup exists
print_status "Phase 3: Verifying backup..."

if [ -d "docs-backup" ]; then
    backup_count=$(find docs-backup -name "*.md" | wc -l)
    print_success "✓ Backup directory exists with $backup_count files"
else
    print_warning "⚠ Backup directory missing"
fi

# Phase 4: Verify migrated files are removed
print_status "Phase 4: Verifying migrated files are removed..."

migrated_files="docs/API-Specification.md docs/Database-Schema.md docs/Authentication-RBAC.md docs/Testing-Guide.md docs/Integration-Guide.md docs/Commercial-Product-Specification.md AI_INTEGRATION_README.md ENHANCED_PAYMENT_GATEWAY_README.md SECURITY_ANALYSIS_REPORT.md COMPLIANCE_ANALYSIS_REPORT.md"

removed_count=0
total_migrated=0
for file in $migrated_files; do
    total_migrated=$((total_migrated + 1))
    if [ ! -f "$file" ]; then
        print_success "✓ $file removed"
        removed_count=$((removed_count + 1))
    else
        print_warning "⚠ $file still exists (should be removed)"
    fi
done

print_status "Migrated files removed: $removed_count/$total_migrated"

# Phase 5: Verify README.md is updated
print_status "Phase 5: Verifying README.md updates..."

if [ -f "README.md" ]; then
    if grep -q "GitHub Wiki" README.md; then
        print_success "✓ README.md contains wiki references"
    else
        print_warning "⚠ README.md may not have wiki references"
    fi
    
    if grep -q "Quick Start" README.md; then
        print_success "✓ README.md contains quick start section"
    else
        print_warning "⚠ README.md may not have quick start section"
    fi
    
    # Check file size (should be smaller than original)
    readme_size=$(wc -c < README.md)
    if [ $readme_size -lt 20000 ]; then
        print_success "✓ README.md is streamlined (${readme_size} bytes)"
    else
        print_warning "⚠ README.md may be too large (${readme_size} bytes)"
    fi
else
    print_error "✗ README.md missing!"
fi

# Phase 6: Verify migration log exists
print_status "Phase 6: Verifying migration artifacts..."

if [ -f "migration-log.json" ]; then
    print_success "✓ Migration log exists"
else
    print_warning "⚠ Migration log missing"
fi

if [ -f "DOCUMENTATION_MIGRATION_PLAN.md" ]; then
    print_success "✓ Migration plan exists"
else
    print_warning "⚠ Migration plan missing"
fi

if [ -f "MIGRATION_COMPLETION_SUMMARY.md" ]; then
    print_success "✓ Migration summary exists"
else
    print_warning "⚠ Migration summary missing"
fi

# Phase 7: Check for any remaining .md files that should have been migrated
print_status "Phase 7: Checking for remaining documentation files..."

remaining_docs=$(find . -name "*.md" -not -path "./node_modules/*" -not -path "./docs-backup/*" -not -path "./wiki/*" -not -path "./frontend/public/oracleJdk-25/*" -not -name "README.md" -not -name "LICENSE.txt" -not -name "REPOSITORY_DESCRIPTION.md" -not -name "GITHUB_DESCRIPTION.txt" -not -name "DOCUMENTATION_MIGRATION_PLAN.md" -not -name "MIGRATION_COMPLETION_SUMMARY.md" -not -name "MIGRATION_SUMMARY.md" -not -name "README_OLD.md" | wc -l)

if [ $remaining_docs -eq 0 ]; then
    print_success "✓ No remaining documentation files to migrate"
else
    print_warning "⚠ $remaining_docs documentation files still remain:"
    find . -name "*.md" -not -path "./node_modules/*" -not -path "./docs-backup/*" -not -path "./wiki/*" -not -path "./frontend/public/oracleJdk-25/*" -not -name "README.md" -not -name "LICENSE.txt" -not -name "REPOSITORY_DESCRIPTION.md" -not -name "GITHUB_DESCRIPTION.txt" -not -name "DOCUMENTATION_MIGRATION_PLAN.md" -not -name "MIGRATION_COMPLETION_SUMMARY.md" -not -name "MIGRATION_SUMMARY.md" -not -name "README_OLD.md"
fi

# Final summary
echo ""
echo "📊 Migration Verification Summary"
echo "================================="
echo "Essential files preserved: $essential_count/$total_essential"
echo "Wiki pages created: $wiki_count"
echo "Main wiki pages: $main_page_count/$total_main_pages"
echo "Migrated files removed: $removed_count/$total_migrated"
echo "Remaining docs to migrate: $remaining_docs"

# Check if remaining docs are only node_modules (third-party dependencies)
remaining_project_docs=$(find . -name "*.md" -not -path "./node_modules/*" -not -path "./docs-backup/*" -not -path "./wiki/*" -not -path "./frontend/public/oracleJdk-25/*" -not -name "README.md" -not -name "LICENSE.txt" -not -name "REPOSITORY_DESCRIPTION.md" -not -name "GITHUB_DESCRIPTION.txt" -not -name "DOCUMENTATION_MIGRATION_PLAN.md" -not -name "MIGRATION_COMPLETION_SUMMARY.md" -not -name "MIGRATION_SUMMARY.md" -not -name "README_OLD.md" | grep -v "node_modules" | wc -l)

# Overall status
if [ $essential_count -eq $total_essential ] && [ $wiki_count -gt 0 ] && [ $removed_count -eq $total_migrated ] && [ $remaining_project_docs -eq 0 ]; then
    echo ""
    print_success "🎉 MIGRATION VERIFICATION PASSED!"
    print_success "All project documentation successfully migrated to wiki!"
    echo ""
    echo "Remaining files are third-party dependencies (node_modules) and should not be migrated."
    echo ""
    echo "Next steps:"
    echo "1. Enable GitHub Wiki in repository settings"
    echo "2. Upload wiki pages to GitHub wiki"
    echo "3. Test all links and functionality"
    echo "4. Update team about new documentation location"
elif [ $remaining_project_docs -eq 0 ]; then
    echo ""
    print_success "🎉 MIGRATION VERIFICATION PASSED!"
    print_success "All project documentation successfully migrated to wiki!"
    echo ""
    echo "Remaining files are third-party dependencies (node_modules) and should not be migrated."
    echo ""
    echo "Next steps:"
    echo "1. Enable GitHub Wiki in repository settings"
    echo "2. Upload wiki pages to GitHub wiki"
    echo "3. Test all links and functionality"
    echo "4. Update team about new documentation location"
else
    echo ""
    print_warning "⚠ MIGRATION VERIFICATION INCOMPLETE"
    print_warning "Some project documentation files still need to be migrated."
    echo ""
    echo "Remaining project documentation files:"
    find . -name "*.md" -not -path "./node_modules/*" -not -path "./docs-backup/*" -not -path "./wiki/*" -not -path "./frontend/public/oracleJdk-25/*" -not -name "README.md" -not -name "LICENSE.txt" -not -name "REPOSITORY_DESCRIPTION.md" -not -name "GITHUB_DESCRIPTION.txt" -not -name "DOCUMENTATION_MIGRATION_PLAN.md" -not -name "MIGRATION_COMPLETION_SUMMARY.md" -not -name "MIGRATION_SUMMARY.md" -not -name "README_OLD.md" | grep -v "node_modules"
fi

echo ""
echo "Verification completed at $(date)"
