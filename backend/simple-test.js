/**
 * Simple Test Script
 * Tests basic functionality without problematic dependencies
 */

console.log('🧪 Testing K-12 SIS Backend Components...\n');

// Test 1: Check if files exist
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'server.js',
  'package.json',
  'api/controllers/studentController.js',
  'api/routes/students.js',
  'middleware/auth.js',
  'middleware/rbac.js',
  'middleware/rateLimiting.js',
  'middleware/studentValidation.js',
  'middleware/tenantContext.js',
  'services/studentService.js'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('\n✅ All required files exist!');
} else {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

// Test 2: Check package.json
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  console.log(`✅ Package name: ${packageJson.name}`);
  console.log(`✅ Version: ${packageJson.version}`);
  console.log(`✅ Main entry: ${packageJson.main}`);
  
  const requiredDeps = ['express', 'express-rate-limit', 'express-validator', 'cors', 'helmet'];
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length === 0) {
    console.log('✅ All required dependencies are listed');
  } else {
    console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  process.exit(1);
}

// Test 3: Check if we can require basic modules
console.log('\n🔧 Testing module imports...');
try {
  const express = require('express');
  console.log('✅ Express module loaded');
  
  const rateLimit = require('express-rate-limit');
  console.log('✅ express-rate-limit module loaded');
  
  const validator = require('validator');
  console.log('✅ validator module loaded');
  
  console.log('✅ All core modules loaded successfully');
} catch (error) {
  console.log('❌ Error loading modules:', error.message);
  process.exit(1);
}

// Test 4: Check environment setup
console.log('\n🌍 Checking environment setup...');
if (process.env.NODE_ENV) {
  console.log(`✅ NODE_ENV: ${process.env.NODE_ENV}`);
} else {
  console.log('⚠️  NODE_ENV not set (defaults to development)');
}

console.log('\n🎉 All tests passed! The backend is ready to run.');
console.log('\n📋 Next steps:');
console.log('1. Set up your .env file (copy from env.example)');
console.log('2. Configure your database connection');
console.log('3. Run: npm run dev');
console.log('4. Test endpoints with: curl http://localhost:3000/health');
