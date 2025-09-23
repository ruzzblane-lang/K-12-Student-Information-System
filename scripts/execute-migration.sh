#!/bin/bash

# Documentation Migration Execution Script
# This script executes the complete documentation migration process

set -e  # Exit on any error

echo "🚀 Starting Documentation Migration to GitHub Wiki"
echo "=================================================="

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

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi

print_status "Pre-migration checks completed"

# Phase 1: Create backup
print_status "Phase 1: Creating backup of all documentation files..."
mkdir -p docs-backup
find . -name "*.md" -not -path "./node_modules/*" -not -path "./docs-backup/*" -exec cp --parents {} docs-backup/ \;
print_success "Backup created in docs-backup/"

# Phase 2: Run the migration script
print_status "Phase 2: Running documentation migration script..."
node scripts/migrate-docs-to-wiki.js
if [ $? -eq 0 ]; then
    print_success "Migration script completed successfully"
else
    print_error "Migration script failed"
    exit 1
fi

# Phase 3: Update README.md
print_status "Phase 3: Updating README.md..."
if [ -f "README_NEW.md" ]; then
    cp README.md README_OLD.md
    cp README_NEW.md README.md
    rm README_NEW.md
    print_success "README.md updated with new streamlined version"
else
    print_warning "README_NEW.md not found, skipping README update"
fi

# Phase 4: Verify critical files are still present
print_status "Phase 4: Verifying critical files are preserved..."
critical_files=(
    "README.md"
    "LICENSE.txt"
    "REPOSITORY_DESCRIPTION.md"
    "GITHUB_DESCRIPTION.txt"
    "docker-compose.yml"
    "Dockerfile"
    "package.json"
    "backend/package.json"
    "frontend/package.json"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file preserved"
    else
        print_error "✗ $file missing!"
        exit 1
    fi
done

# Phase 5: Check that wiki directory was created
print_status "Phase 5: Verifying wiki structure..."
if [ -d "wiki" ]; then
    wiki_count=$(find wiki -name "*.md" | wc -l)
    print_success "Wiki directory created with $wiki_count pages"
else
    print_error "Wiki directory not created!"
    exit 1
fi

# Phase 6: Generate summary report
print_status "Phase 6: Generating migration summary..."

cat > MIGRATION_SUMMARY.md << EOF
# Documentation Migration Summary

## Migration Completed: $(date)

### Files Migrated to Wiki
$(find . -name "*.md" -not -path "./node_modules/*" -not -path "./docs-backup/*" -not -path "./wiki/*" -not -name "README.md" -not -name "LICENSE.txt" -not -name "REPOSITORY_DESCRIPTION.md" -not -name "GITHUB_DESCRIPTION.txt" | wc -l) documentation files migrated

### Wiki Pages Created
$(find wiki -name "*.md" | wc -l) wiki pages created

### Critical Files Preserved
$(printf '%s\n' "${critical_files[@]}" | wc -l) critical operational files preserved

### Backup Location
All original files backed up to: docs-backup/

## Next Steps

1. **Review Wiki Content**: Check the wiki/ directory for migrated content
2. **Update GitHub Repository**: Push changes to GitHub
3. **Enable GitHub Wiki**: Enable wiki in repository settings
4. **Upload Wiki Pages**: Upload wiki pages to GitHub wiki
5. **Test Links**: Verify all internal links work correctly
6. **Update Documentation**: Future documentation updates should be made in the wiki

## Files to Review

- README.md: Updated with streamlined content
- wiki/: Contains all migrated documentation
- docs-backup/: Contains original files for reference
- migration-log.json: Detailed migration log

## Rollback Instructions

If you need to rollback the migration:

\`\`\`bash
# Restore from backup
cp -r docs-backup/* ./
rm -rf wiki/
cp README_OLD.md README.md
\`\`\`

EOF

print_success "Migration summary generated: MIGRATION_SUMMARY.md"

# Phase 7: Final verification
print_status "Phase 7: Final verification..."

# Check that no essential .md files were accidentally removed
essential_md_files=(
    "README.md"
    "LICENSE.txt"
    "REPOSITORY_DESCRIPTION.md"
    "GITHUB_DESCRIPTION.txt"
)

for file in "${essential_md_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ Essential file preserved: $file"
    else
        print_error "✗ Essential file missing: $file"
        exit 1
    fi
done

# Check that wiki has content
if [ -d "wiki" ] && [ "$(find wiki -name "*.md" | wc -l)" -gt 0 ]; then
    print_success "✓ Wiki contains migrated content"
else
    print_error "✗ Wiki is empty or missing"
    exit 1
fi

echo ""
echo "🎉 DOCUMENTATION MIGRATION COMPLETED SUCCESSFULLY!"
echo "=================================================="
echo ""
echo "📊 Summary:"
echo "  • $(find . -name "*.md" -not -path "./node_modules/*" -not -path "./docs-backup/*" -not -path "./wiki/*" -not -name "README.md" -not -name "LICENSE.txt" -not -name "REPOSITORY_DESCRIPTION.md" -not -name "GITHUB_DESCRIPTION.txt" | wc -l) files migrated to wiki"
echo "  • $(find wiki -name "*.md" | wc -l) wiki pages created"
echo "  • All critical files preserved"
echo "  • Backup created in docs-backup/"
echo ""
echo "📝 Next Steps:"
echo "  1. Review the wiki/ directory"
echo "  2. Enable GitHub Wiki in repository settings"
echo "  3. Upload wiki pages to GitHub"
echo "  4. Test all links and functionality"
echo ""
echo "📖 See MIGRATION_SUMMARY.md for detailed information"
echo ""
print_success "Migration completed successfully! 🚀"
