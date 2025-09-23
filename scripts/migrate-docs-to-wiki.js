#!/usr/bin/env node

/**
 * Documentation Migration Script
 * 
 * This script automates the migration of non-essential documentation files
 * to GitHub wiki format while preserving critical repository files.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Files to migrate to wiki (non-essential documentation)
  MIGRATE_TO_WIKI: [
    // Core Documentation
    'docs/API-Specification.md',
    'docs/Database-Schema.md', 
    'docs/Authentication-RBAC.md',
    'docs/Testing-Guide.md',
    'docs/Integration-Guide.md',
    'docs/Commercial-Product-Specification.md',
    
    // Implementation Summaries
    'AI_INTEGRATION_README.md',
    'docs/AI-Integration-Implementation-Summary.md',
    'ENHANCED_PAYMENT_GATEWAY_README.md',
    'docs/Enhanced-Payment-Gateway-Implementation-Summary.md',
    'docs/Enhanced-Payment-Gateway-API-Specification.md',
    'ENHANCED_FERPA_COMPLIANCE_IMPLEMENTATION_SUMMARY.md',
    'FERPA_COMPLIANCE_IMPLEMENTATION_SUMMARY.md',
    'MANUAL_PAYMENT_IMPLEMENTATION_SUMMARY.md',
    'docs/ENHANCEMENTS_IMPLEMENTATION_SUMMARY.md',
    
    // Architecture & Design
    'docs/architecture.md',
    'docs/erd-diagram.md',
    'docs/Multi-Tenant-Architecture.md',
    'docs/White-Labeling-Developer-Guide.md',
    'docs/White-Labeling-Implementation-Guide.md',
    'docs/PWA-Implementation-Guide.md',
    'docs/PWA-Implementation-Summary.md',
    
    // Compliance & Security
    'SECURITY_ANALYSIS_REPORT.md',
    'SECURITY_AUDIT_REPORT.md',
    'COMPLIANCE_ANALYSIS_REPORT.md',
    'COMPLIANCE_EMERGENCY_CHECKLIST.md',
    'docs/Compliance-Framework.md',
    
    // Development & CI/CD
    'docs/Actionlint-Configuration.md',
    'docs/Actionlint-Setup.md',
    'docs/GitHub-Actions-Final-Status.md',
    'docs/GitHub-Actions-Fixes-Summary.md',
    'docs/GitHub-Actions-Setup.md',
    
    // Problem Reports
    'FINAL_PROBLEM_FIXES_REPORT.md',
    'FIX_SUMMARY.md',
    'PROBLEM_FIXES_SUMMARY.md',
    'docs/Problems-Resolved-Summary.md',
    
    // Feature Documentation
    'docs/Student-Controller-Improvements-Summary.md',
    'docs/Student-Controller-Security-Enhancements.md',
    'docs/Teachers-Table-Enhancement-Summary.md',
    'frontend/PWA_ENHANCEMENT_RECOMMENDATIONS.md',
    'frontend/PWA_SERVICE_WORKER_ENHANCEMENTS.md',
    
    // Third-Party & Integrations
    'THIRD_PARTY_INTEGRATIONS_SUMMARY.md',
    'backend/integrations/README.md',
    'DOCKER_INFRASTRUCTURE_SUMMARY.md',
    
    // SDK Documentation
    'sdk/README.md',
    
    // Legacy Documentation
    'docs/K‑12 Student Information System.md',
    'docs/K‑12 Student Information System - Enhanced.md',
    'docs/api-spec.md',
    'docs/checks.md',
    'docs/config.md',
    'docs/install.md',
    'docs/usage.md',
    'docs/reference.md',
    
    // Database Documentation
    'db/seeds/README.md',
    'db/seeds/ENHANCEMENT_RECOMMENDATIONS.md',
    'db/queries/ENHANCEMENT_RECOMMENDATIONS.md',
    'db/migrations/ENHANCEMENTS_IMPLEMENTATION_SUMMARY.md',
    'db/migrations/MIGRATION_IMPROVEMENTS_SUMMARY.md',
    
    // Testing Documentation
    'backend/tests/README.md',
    'backend/tests/clients/README.md',
    'tests/README.md',
    
    // Component Documentation
    'frontend/src/README_YEARBOOK_COMPLETE.md',
    'frontend/src/README_YEARBOOK_WIDGET.md',
    'frontend/src/components/YearbookPortalWidget.md',
    
    // Payment Documentation
    'backend/payments/README.md',
    'backend/payments/README_MANUAL_PAYMENTS.md',
    'backend/payments/tests/README.md',
    
    // Compliance Documentation
    'backend/compliance/README.md',
    
    // Scripts Documentation
    'scripts/README.md'
  ],
  
  // Files to keep in repository (essential operational files)
  KEEP_IN_REPO: [
    'README.md',
    'LICENSE.txt',
    'REPOSITORY_DESCRIPTION.md',
    'GITHUB_DESCRIPTION.txt',
    'env.docker.example',
    'docker-compose.yml',
    'docker-compose.override.yml',
    'Dockerfile',
    'Makefile',
    'package.json',
    'package-lock.json',
    'backend/package.json',
    'frontend/package.json'
  ],
  
  // Wiki page mappings
  WIKI_MAPPINGS: {
    'docs/API-Specification.md': 'API-Reference',
    'docs/Database-Schema.md': 'Database-Schema',
    'docs/Authentication-RBAC.md': 'Authentication-Security',
    'docs/Testing-Guide.md': 'Testing-Guide',
    'docs/Integration-Guide.md': 'Integration-Guide',
    'docs/Commercial-Product-Specification.md': 'Product-Specification',
    'AI_INTEGRATION_README.md': 'AI-Integration',
    'ENHANCED_PAYMENT_GATEWAY_README.md': 'Payment-Gateway',
    'ENHANCED_FERPA_COMPLIANCE_IMPLEMENTATION_SUMMARY.md': 'Compliance',
    'docs/architecture.md': 'System-Architecture',
    'docs/White-Labeling-Developer-Guide.md': 'White-Labeling',
    'docs/PWA-Implementation-Guide.md': 'PWA-Implementation',
    'SECURITY_ANALYSIS_REPORT.md': 'Security-Analysis',
    'COMPLIANCE_ANALYSIS_REPORT.md': 'Compliance-Analysis',
    'THIRD_PARTY_INTEGRATIONS_SUMMARY.md': 'Third-Party-Integrations',
    'sdk/README.md': 'SDK-Documentation'
  }
};

// Wiki page structure
const WIKI_STRUCTURE = {
  'Home': 'Overview and navigation to all documentation',
  'Getting-Started': 'Quick start guide for new users',
  'API-Reference': 'Complete API documentation and endpoints',
  'Database-Schema': 'Database design and table structures',
  'Authentication-Security': 'Authentication system and security features',
  'Testing-Guide': 'Comprehensive testing documentation',
  'Integration-Guide': 'Integration instructions and examples',
  'Product-Specification': 'Commercial product details and features',
  'AI-Integration': 'AI features and capabilities',
  'Payment-Gateway': 'Payment processing system documentation',
  'Compliance': 'FERPA, GDPR, COPPA compliance information',
  'White-Labeling': 'Customization and branding capabilities',
  'PWA-Implementation': 'Progressive Web App features and setup',
  'Third-Party-Integrations': 'External service integrations',
  'System-Architecture': 'Overall system design and components',
  'Development-Tools': 'CI/CD, linting, and development setup',
  'Database-Migrations': 'Migration management and procedures',
  'Scripts-Automation': 'Automation tools and scripts',
  'SDK-Documentation': 'Client SDKs and libraries',
  'Installation-Guide': 'Detailed installation instructions',
  'Configuration': 'System configuration options',
  'Troubleshooting': 'Common issues and solutions',
  'Problem-Resolution': 'Historical problem fixes and solutions',
  'Security-Analysis': 'Security assessments and audit reports',
  'Compliance-Analysis': 'Compliance assessments and reports'
};

class DocumentationMigrator {
  constructor() {
    this.rootDir = process.cwd();
    this.wikiDir = path.join(this.rootDir, 'wiki');
    this.backupDir = path.join(this.rootDir, 'docs-backup');
    this.migrationLog = [];
  }

  /**
   * Main migration process
   */
  async migrate() {
    console.log('🚀 Starting documentation migration to GitHub wiki...\n');
    
    try {
      // Phase 1: Setup and backup
      await this.setupDirectories();
      await this.backupFiles();
      
      // Phase 2: Analyze and consolidate content
      await this.analyzeContent();
      
      // Phase 3: Create wiki structure
      await this.createWikiStructure();
      
      // Phase 4: Migrate content
      await this.migrateContent();
      
      // Phase 5: Update links
      await this.updateLinks();
      
      // Phase 6: Cleanup
      await this.cleanup();
      
      // Phase 7: Generate report
      await this.generateReport();
      
      console.log('✅ Documentation migration completed successfully!');
      console.log(`📊 Migration log saved to: ${path.join(this.rootDir, 'migration-log.json')}`);
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('🔄 Restoring from backup...');
      await this.restoreFromBackup();
      process.exit(1);
    }
  }

  /**
   * Setup required directories
   */
  async setupDirectories() {
    console.log('📁 Setting up directories...');
    
    // Create wiki directory
    if (!fs.existsSync(this.wikiDir)) {
      fs.mkdirSync(this.wikiDir, { recursive: true });
    }
    
    // Create backup directory
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    console.log('✅ Directories created');
  }

  /**
   * Backup all files before migration
   */
  async backupFiles() {
    console.log('💾 Creating backup of all documentation files...');
    
    const allMdFiles = this.getAllMarkdownFiles();
    
    for (const file of allMdFiles) {
      const sourcePath = path.join(this.rootDir, file);
      const backupPath = path.join(this.backupDir, file);
      
      if (fs.existsSync(sourcePath)) {
        // Create backup directory structure
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Copy file to backup
        fs.copyFileSync(sourcePath, backupPath);
        this.log(`Backed up: ${file}`);
      }
    }
    
    console.log(`✅ Backed up ${allMdFiles.length} files`);
  }

  /**
   * Analyze content for consolidation opportunities
   */
  async analyzeContent() {
    console.log('🔍 Analyzing content for consolidation...');
    
    const consolidationGroups = {
      'AI-Integration': [
        'AI_INTEGRATION_README.md',
        'docs/AI-Integration-Implementation-Summary.md'
      ],
      'Payment-Gateway': [
        'ENHANCED_PAYMENT_GATEWAY_README.md',
        'docs/Enhanced-Payment-Gateway-Implementation-Summary.md',
        'docs/Enhanced-Payment-Gateway-API-Specification.md',
        'MANUAL_PAYMENT_IMPLEMENTATION_SUMMARY.md'
      ],
      'Compliance': [
        'ENHANCED_FERPA_COMPLIANCE_IMPLEMENTATION_SUMMARY.md',
        'FERPA_COMPLIANCE_IMPLEMENTATION_SUMMARY.md',
        'docs/Compliance-Framework.md'
      ],
      'System-Architecture': [
        'docs/architecture.md',
        'docs/Multi-Tenant-Architecture.md',
        'docs/erd-diagram.md'
      ],
      'White-Labeling': [
        'docs/White-Labeling-Developer-Guide.md',
        'docs/White-Labeling-Implementation-Guide.md'
      ],
      'PWA-Implementation': [
        'docs/PWA-Implementation-Guide.md',
        'docs/PWA-Implementation-Summary.md',
        'frontend/PWA_ENHANCEMENT_RECOMMENDATIONS.md',
        'frontend/PWA_SERVICE_WORKER_ENHANCEMENTS.md'
      ],
      'Development-Tools': [
        'docs/Actionlint-Configuration.md',
        'docs/Actionlint-Setup.md',
        'docs/GitHub-Actions-Final-Status.md',
        'docs/GitHub-Actions-Fixes-Summary.md',
        'docs/GitHub-Actions-Setup.md'
      ],
      'Problem-Resolution': [
        'FINAL_PROBLEM_FIXES_REPORT.md',
        'FIX_SUMMARY.md',
        'PROBLEM_FIXES_SUMMARY.md',
        'docs/Problems-Resolved-Summary.md'
      ]
    };
    
    for (const [groupName, files] of Object.entries(consolidationGroups)) {
      this.log(`Consolidation group: ${groupName} (${files.length} files)`);
    }
    
    console.log('✅ Content analysis completed');
  }

  /**
   * Create wiki directory structure
   */
  async createWikiStructure() {
    console.log('🏗️  Creating wiki structure...');
    
    // Ensure wiki directory exists
    if (!fs.existsSync(this.wikiDir)) {
      fs.mkdirSync(this.wikiDir, { recursive: true });
    }
    
    // Create main wiki pages
    for (const [pageName, description] of Object.entries(WIKI_STRUCTURE)) {
      const pagePath = path.join(this.wikiDir, `${pageName}.md`);
      const content = this.generateWikiPageTemplate(pageName, description);
      fs.writeFileSync(pagePath, content);
      this.log(`Created wiki page: ${pageName}.md`);
    }
    
    console.log(`✅ Created ${Object.keys(WIKI_STRUCTURE).length} wiki pages`);
  }

  /**
   * Migrate content to wiki format
   */
  async migrateContent() {
    console.log('📝 Migrating content to wiki...');
    
    for (const file of CONFIG.MIGRATE_TO_WIKI) {
      const sourcePath = path.join(this.rootDir, file);
      
      if (fs.existsSync(sourcePath)) {
        const content = fs.readFileSync(sourcePath, 'utf8');
        const wikiPageName = this.getWikiPageName(file);
        const wikiPath = path.join(this.wikiDir, `${wikiPageName}.md`);
        
        // Convert content to wiki format
        const wikiContent = this.convertToWikiFormat(content, file);
        
        // Append to existing wiki page or create new one
        if (fs.existsSync(wikiPath)) {
          const existingContent = fs.readFileSync(wikiPath, 'utf8');
          const updatedContent = this.mergeWikiContent(existingContent, wikiContent, file);
          fs.writeFileSync(wikiPath, updatedContent);
        } else {
          fs.writeFileSync(wikiPath, wikiContent);
        }
        
        this.log(`Migrated: ${file} → ${wikiPageName}.md`);
      }
    }
    
    console.log('✅ Content migration completed');
  }

  /**
   * Update internal links in remaining files
   */
  async updateLinks() {
    console.log('🔗 Updating internal links...');
    
    const filesToUpdate = [
      'README.md',
      'REPOSITORY_DESCRIPTION.md',
      ...CONFIG.KEEP_IN_REPO.filter(f => f.endsWith('.md'))
    ];
    
    for (const file of filesToUpdate) {
      const filePath = path.join(this.rootDir, file);
      
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Update links to point to wiki
        content = this.updateLinksInContent(content);
        
        fs.writeFileSync(filePath, content);
        this.log(`Updated links in: ${file}`);
      }
    }
    
    console.log('✅ Link updates completed');
  }

  /**
   * Cleanup migrated files
   */
  async cleanup() {
    console.log('🧹 Cleaning up migrated files...');
    
    let removedCount = 0;
    
    for (const file of CONFIG.MIGRATE_TO_WIKI) {
      const filePath = path.join(this.rootDir, file);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        removedCount++;
        this.log(`Removed: ${file}`);
      }
    }
    
    console.log(`✅ Removed ${removedCount} migrated files`);
  }

  /**
   * Generate migration report
   */
  async generateReport() {
    console.log('📊 Generating migration report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFilesAnalyzed: this.getAllMarkdownFiles().length,
        filesMigrated: CONFIG.MIGRATE_TO_WIKI.length,
        filesKept: CONFIG.KEEP_IN_REPO.length,
        wikiPagesCreated: Object.keys(WIKI_STRUCTURE).length
      },
      migratedFiles: CONFIG.MIGRATE_TO_WIKI,
      keptFiles: CONFIG.KEEP_IN_REPO,
      wikiStructure: WIKI_STRUCTURE,
      migrationLog: this.migrationLog
    };
    
    const reportPath = path.join(this.rootDir, 'migration-log.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('✅ Migration report generated');
  }

  /**
   * Restore files from backup
   */
  async restoreFromBackup() {
    console.log('🔄 Restoring files from backup...');
    
    if (fs.existsSync(this.backupDir)) {
      const backupFiles = this.getAllFilesRecursive(this.backupDir);
      
      for (const backupFile of backupFiles) {
        try {
          const relativePath = path.relative(this.backupDir, backupFile);
          const targetPath = path.join(this.rootDir, relativePath);
          
          // Skip if target path is the same as backup path (avoid recursion)
          if (targetPath === backupFile) {
            continue;
          }
          
          // Create target directory if needed
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          fs.copyFileSync(backupFile, targetPath);
        } catch (error) {
          console.log(`Skipping restore of ${backupFile}: ${error.message}`);
        }
      }
      
      console.log('✅ Files restored from backup');
    }
  }

  // Helper methods
  getAllMarkdownFiles() {
    const files = [];
    
    const scanDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && !item.includes('oracleJdk')) {
            scanDir(fullPath);
          } else if (stat.isFile() && item.endsWith('.md') && !fullPath.includes('oracleJdk')) {
            files.push(path.relative(this.rootDir, fullPath));
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.log(`Skipping directory: ${dir} (${error.message})`);
      }
    };
    
    scanDir(this.rootDir);
    return files;
  }

  getAllFilesRecursive(dir) {
    const files = [];
    
    const scanDir = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(dir);
    return files;
  }

  getWikiPageName(file) {
    return CONFIG.WIKI_MAPPINGS[file] || this.generateWikiPageName(file);
  }

  generateWikiPageName(file) {
    const name = path.basename(file, '.md')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    return name;
  }

  generateWikiPageTemplate(pageName, description) {
    return `# ${pageName.replace(/-/g, ' ')}

${description}

## Overview

This page contains documentation migrated from the repository to provide better organization and collaboration capabilities.

## Content

*Content will be populated during migration process*

---

*This page was automatically generated during the documentation migration process.*
`;
  }

  convertToWikiFormat(content, sourceFile) {
    // Convert markdown content to wiki format
    let wikiContent = content;
    
    // Add source file reference
    wikiContent = `<!-- Migrated from: ${sourceFile} -->\n\n${wikiContent}`;
    
    // Convert internal links to wiki links
    wikiContent = wikiContent.replace(/\[([^\]]+)\]\(([^)]+\.md)\)/g, (match, text, link) => {
      const wikiPage = this.getWikiPageName(link);
      return `[${text}](/${wikiPage})`;
    });
    
    return wikiContent;
  }

  mergeWikiContent(existing, newContent, sourceFile) {
    // Simple merge strategy - append new content with separator
    return `${existing}\n\n---\n\n## From ${sourceFile}\n\n${newContent}`;
  }

  updateLinksInContent(content) {
    // Update links to point to wiki pages
    let updatedContent = content;
    
    for (const [file, wikiPage] of Object.entries(CONFIG.WIKI_MAPPINGS)) {
      const fileName = path.basename(file);
      const regex = new RegExp(`\\[([^\\]]+)\\]\\(${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
      updatedContent = updatedContent.replace(regex, `[$1](/${wikiPage})`);
    }
    
    return updatedContent;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    this.migrationLog.push(`[${timestamp}] ${message}`);
    console.log(`  ${message}`);
  }
}

// Main execution
if (require.main === module) {
  const migrator = new DocumentationMigrator();
  migrator.migrate().catch(console.error);
}

module.exports = DocumentationMigrator;
