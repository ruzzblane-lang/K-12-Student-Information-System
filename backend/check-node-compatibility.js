#!/usr/bin/env node

/**
 * Enhanced Node.js Compatibility Checker
 * Checks all dependencies for Node.js version compatibility and common configuration issues
 * Updated to catch more issues based on real-world problems encountered
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Current Node.js version
const currentNodeVersion = process.version;
const currentNodeMajor = parseInt(currentNodeVersion.slice(1).split('.')[0]);

console.log(`🔍 Checking Node.js compatibility for version: ${currentNodeVersion}`);

// Check package.json for engine requirements
function checkPackageEngines(packagePath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (packageJson.engines && packageJson.engines.node) {
      const nodeRequirement = packageJson.engines.node;
      console.log(`📦 Package engines requirement: ${nodeRequirement}`);
      
      // Parse version requirement
      if (nodeRequirement.includes('>=')) {
        const requiredVersion = parseInt(nodeRequirement.split('>=')[1].split('.')[0]);
        if (requiredVersion > currentNodeMajor) {
          console.log(`❌ Package requires Node.js ${requiredVersion}+ but current is ${currentNodeMajor}`);
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

// Check for common configuration issues
function checkConfigurationIssues() {
  console.log('\n📋 Checking for common configuration issues...');
  
  let hasIssues = false;
  
  // Check for underscore prefixes in database config
  const dbConfigPath = path.join(__dirname, 'config', 'database.js');
  if (fs.existsSync(dbConfigPath)) {
    const dbConfigContent = fs.readFileSync(dbConfigPath, 'utf8');
    
    // Check for common underscore issues
    const underscoreIssues = [
      { pattern: /const\s*{\s*_Pool\s*}\s*=\s*require\('pg'\)/, message: 'Database Pool import has underscore prefix' },
      { pattern: /new\s+_Pool\s*\(/, message: 'Database Pool constructor has underscore prefix' },
      { pattern: /_password:\s*process\.env\.DB_PASSWORD/, message: 'Database password field has underscore prefix' },
      { pattern: /const\s+_query\s*=/, message: 'Database query function has underscore prefix' },
      { pattern: /pool\._query\s*\(/, message: 'Database pool query method has underscore prefix' },
      { pattern: /client\._query\s*\(/, message: 'Database client query method has underscore prefix' }
    ];
    
    for (const issue of underscoreIssues) {
      if (issue.pattern.test(dbConfigContent)) {
        console.log(`❌ ${issue.message}`);
        hasIssues = true;
      }
    }
  }
  
  // Check for hardcoded secrets in auth middleware
  const authPath = path.join(__dirname, 'middleware', 'auth.js');
  if (fs.existsSync(authPath)) {
    const authContent = fs.readFileSync(authPath, 'utf8');
    
    const securityIssues = [
      { pattern: /fallback-secret-key/, message: 'Hardcoded fallback secret found in auth middleware' },
      { pattern: /fallback-refresh-secret-key/, message: 'Hardcoded fallback refresh secret found in auth middleware' },
      { pattern: /process\.env\.JWT_SECRET\s*\|\|\s*['"][^'"]+['"]/, message: 'Hardcoded JWT secret fallback found' }
    ];
    
    for (const issue of securityIssues) {
      if (issue.pattern.test(authContent)) {
        console.log(`❌ ${issue.message}`);
        hasIssues = true;
      }
    }
  }
  
  // Check for middleware import issues
  const routesDir = path.join(__dirname, 'api', 'routes');
  if (fs.existsSync(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
    
    for (const file of routeFiles) {
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      const middlewareIssues = [
        { pattern: /require\(['"][^'"]*_authMiddleware['"]\)/, message: `Route file ${file} imports _authMiddleware with underscore` },
        { pattern: /require\(['"][^'"]*_general['"]\)/, message: `Route file ${file} imports _general with underscore` },
        { pattern: /require\(['"][^'"]*_tenantContextMiddleware['"]\)/, message: `Route file ${file} imports _tenantContextMiddleware with underscore` }
      ];
      
      for (const issue of middlewareIssues) {
        if (issue.pattern.test(content)) {
          console.log(`❌ ${issue.message}`);
          hasIssues = true;
        }
      }
    }
  }
  
  if (!hasIssues) {
    console.log('✅ No common configuration issues found');
  }
  
  return !hasIssues;
}

// Check all dependencies for compatibility
function checkDependencies() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  console.log('\n📋 Checking package.json engines...');
  const packageCompatible = checkPackageEngines(packageJsonPath);
  
  if (!packageCompatible) {
    console.log('❌ Package.json has incompatible Node.js requirements');
    return false;
  }
  
  console.log('✅ Package.json engines are compatible');
  
  // Check for any packages that might have Node.js 20+ requirements
  console.log('\n📋 Checking for packages with Node.js 20+ requirements...');
  
  try {
    // Get all installed packages
    const result = execSync('npm ls --depth=0 --json', { encoding: 'utf8' });
    const packages = JSON.parse(result);
    
    let hasIncompatiblePackages = false;
    
    // Check each package
    if (packages.dependencies) {
      for (const [packageName, packageInfo] of Object.entries(packages.dependencies)) {
        if (packageInfo.engines && packageInfo.engines.node) {
          const nodeRequirement = packageInfo.engines.node;
          if (nodeRequirement.includes('20') || nodeRequirement.includes('>=20')) {
            console.log(`❌ Package ${packageName} requires Node.js 20+: ${nodeRequirement}`);
            hasIncompatiblePackages = true;
          }
        }
      }
    }
    
    if (!hasIncompatiblePackages) {
      console.log('✅ No packages require Node.js 20+');
    }
    
    return !hasIncompatiblePackages;
    
  } catch (error) {
    console.error(`❌ Error checking dependencies: ${error.message}`);
    return false;
  }
}

// Check for specific problematic packages
function checkProblematicPackages() {
  console.log('\n📋 Checking for known problematic packages...');
  
  const problematicPackages = [
    'isomorphic-dompurify',
    'joi@18'
  ];
  
  let hasProblematicPackages = false;
  
  for (const packageName of problematicPackages) {
    try {
      const result = execSync(`npm ls ${packageName} 2>/dev/null || echo "not installed"`, { encoding: 'utf8' });
      if (!result.includes('not installed')) {
        console.log(`⚠️  Found potentially problematic package: ${packageName}`);
        hasProblematicPackages = true;
      }
    } catch (error) {
      // Package not found, which is good
    }
  }
  
  if (!hasProblematicPackages) {
    console.log('✅ No known problematic packages found');
  }
  
  return !hasProblematicPackages;
}

// Check environment configuration
function checkEnvironmentConfiguration() {
  console.log('\n📋 Checking environment configuration...');
  
  let hasIssues = false;
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    hasIssues = true;
  } else {
    console.log('✅ .env file exists');
    
    // Check for critical environment variables
    const envContent = fs.readFileSync(envPath, 'utf8');
    const criticalVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DB_HOST',
      'DB_PASSWORD'
    ];
    
    for (const varName of criticalVars) {
      if (!envContent.includes(varName)) {
        console.log(`❌ Critical environment variable ${varName} not found in .env`);
        hasIssues = true;
      }
    }
    
    if (!hasIssues) {
      console.log('✅ Critical environment variables found');
    }
  }
  
  return !hasIssues;
}

// Main compatibility check
function main() {
  console.log('🚀 Starting enhanced Node.js compatibility check...\n');
  
  const packageCompatible = checkPackageEngines(path.join(__dirname, 'package.json'));
  const dependenciesCompatible = checkDependencies();
  const noProblematicPackages = checkProblematicPackages();
  const configIssues = checkConfigurationIssues();
  const envConfig = checkEnvironmentConfiguration();
  
  console.log('\n📊 Compatibility Summary:');
  console.log(`Package.json engines: ${packageCompatible ? '✅ Compatible' : '❌ Incompatible'}`);
  console.log(`Dependencies: ${dependenciesCompatible ? '✅ Compatible' : '❌ Incompatible'}`);
  console.log(`Problematic packages: ${noProblematicPackages ? '✅ None found' : '❌ Found'}`);
  console.log(`Configuration issues: ${configIssues ? '✅ None found' : '❌ Found'}`);
  console.log(`Environment config: ${envConfig ? '✅ Valid' : '❌ Issues found'}`);
  
  const overallCompatible = packageCompatible && dependenciesCompatible && noProblematicPackages && configIssues && envConfig;
  
  if (overallCompatible) {
    console.log('\n🎉 All compatibility checks passed!');
    console.log('✅ Your Node.js version is compatible with all dependencies');
    console.log('✅ No configuration issues found');
  } else {
    console.log('\n⚠️  Compatibility or configuration issues found!');
    console.log('📋 Recommendations:');
    console.log('1. Update Node.js to version 20+ if possible');
    console.log('2. Or pin problematic packages to compatible versions');
    console.log('3. Check package.json for version constraints');
    console.log('4. Fix configuration issues (underscore prefixes, hardcoded secrets)');
    console.log('5. Ensure .env file exists with required variables');
  }
  
  return overallCompatible;
}

// Run the check
if (require.main === module) {
  const isCompatible = main();
  process.exit(isCompatible ? 0 : 1);
}

module.exports = {
  checkPackageEngines,
  checkDependencies,
  checkProblematicPackages,
  checkConfigurationIssues,
  checkEnvironmentConfiguration,
  main
};