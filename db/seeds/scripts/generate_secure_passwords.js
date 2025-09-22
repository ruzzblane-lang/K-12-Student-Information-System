#!/usr/bin/env node

/**
 * Secure Password Generator for Database Seeding
 * 
 * This script generates secure password hashes for database seeding
 * without hard-coding sensitive data in seed files.
 * 
 * Usage:
 *   node generate_secure_passwords.js [environment]
 * 
 * Environment options:
 *   - development (default)
 *   - testing
 *   - staging
 *   - production
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration for different environments
const ENVIRONMENT_CONFIG = {
    development: {
        saltRounds: 10,
        passwordPrefix: 'Dev',
        outputFile: 'development_passwords.json'
    },
    testing: {
        saltRounds: 10,
        passwordPrefix: 'Test',
        outputFile: 'testing_passwords.json'
    },
    staging: {
        saltRounds: 12,
        passwordPrefix: 'Staging',
        outputFile: 'staging_passwords.json'
    },
    production: {
        saltRounds: 12,
        passwordPrefix: 'Prod',
        outputFile: 'production_passwords.json'
    }
};

// User roles and their default passwords
const USER_ROLES = {
    super_admin: 'SuperAdmin123!',
    tenant_admin: 'TenantAdmin123!',
    principal: 'Principal123!',
    teacher: 'Teacher123!',
    student: 'Student123!',
    parent: 'Parent123!'
};

/**
 * Generate a secure password hash using bcrypt
 * @param {string} password - Plain text password
 * @param {number} saltRounds - Number of salt rounds for bcrypt
 * @returns {Promise<string>} - Bcrypt hash
 */
async function generatePasswordHash(password, saltRounds) {
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        return hash;
    } catch (error) {
        console.error('Error generating password hash:', error);
        throw error;
    }
}

/**
 * Generate a secure random salt
 * @param {number} length - Length of the salt in bytes
 * @returns {string} - Base64 encoded salt
 */
function generateSalt(length = 32) {
    return crypto.randomBytes(length).toString('base64');
}

/**
 * Generate environment-specific password
 * @param {string} role - User role
 * @param {string} environment - Environment name
 * @returns {string} - Environment-specific password
 */
function generateEnvironmentPassword(role, environment) {
    const config = ENVIRONMENT_CONFIG[environment];
    const basePassword = USER_ROLES[role];
    
    if (!basePassword) {
        throw new Error(`Unknown role: ${role}`);
    }
    
    return `${config.passwordPrefix}${basePassword}`;
}

/**
 * Generate all password hashes for an environment
 * @param {string} environment - Environment name
 * @returns {Promise<Object>} - Object containing all password hashes
 */
async function generateEnvironmentPasswords(environment) {
    const config = ENVIRONMENT_CONFIG[environment];
    const passwords = {};
    
    console.log(`Generating passwords for ${environment} environment...`);
    
    for (const [role, basePassword] of Object.entries(USER_ROLES)) {
        const envPassword = generateEnvironmentPassword(role, environment);
        const hash = await generatePasswordHash(envPassword, config.saltRounds);
        const salt = generateSalt();
        
        passwords[role] = {
            password: envPassword,
            hash: hash,
            salt: salt,
            saltRounds: config.saltRounds,
            generatedAt: new Date().toISOString()
        };
        
        console.log(`✓ Generated password for ${role}`);
    }
    
    return passwords;
}

/**
 * Save passwords to file
 * @param {Object} passwords - Password data
 * @param {string} environment - Environment name
 */
function savePasswordsToFile(passwords, environment) {
    const config = ENVIRONMENT_CONFIG[environment];
    const outputDir = path.join(__dirname, 'generated');
    const outputFile = path.join(outputDir, config.outputFile);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save passwords to file
    fs.writeFileSync(outputFile, JSON.stringify(passwords, null, 2));
    console.log(`✓ Saved passwords to ${outputFile}`);
    
    // Create .gitignore to prevent committing sensitive data
    const gitignoreFile = path.join(outputDir, '.gitignore');
    if (!fs.existsSync(gitignoreFile)) {
        fs.writeFileSync(gitignoreFile, '*.json\n*.txt\n*.env\n');
        console.log(`✓ Created .gitignore in ${outputDir}`);
    }
}

/**
 * Generate SQL INSERT statements for password hashes
 * @param {Object} passwords - Password data
 * @param {string} environment - Environment name
 * @returns {string} - SQL INSERT statements
 */
function generateSQLStatements(passwords, environment) {
    let sql = `-- Generated password hashes for ${environment} environment\n`;
    sql += `-- Generated at: ${new Date().toISOString()}\n`;
    sql += `-- WARNING: These are for development/testing only. Use proper password management in production.\n\n`;
    
    sql += `-- Password hash functions for ${environment}\n`;
    sql += `CREATE OR REPLACE FUNCTION get_${environment}_password_hash(role_name TEXT)\n`;
    sql += `RETURNS TEXT AS $$\n`;
    sql += `BEGIN\n`;
    sql += `    CASE role_name\n`;
    
    for (const [role, data] of Object.entries(passwords)) {
        sql += `        WHEN '${role}' THEN RETURN '${data.hash}';\n`;
    }
    
    sql += `        ELSE RETURN NULL;\n`;
    sql += `    END CASE;\n`;
    sql += `END;\n`;
    sql += `$$ LANGUAGE plpgsql;\n\n`;
    
    sql += `-- Password salt function for ${environment}\n`;
    sql += `CREATE OR REPLACE FUNCTION get_${environment}_password_salt(role_name TEXT)\n`;
    sql += `RETURNS TEXT AS $$\n`;
    sql += `BEGIN\n`;
    sql += `    CASE role_name\n`;
    
    for (const [role, data] of Object.entries(passwords)) {
        sql += `        WHEN '${role}' THEN RETURN '${data.salt}';\n`;
    }
    
    sql += `        ELSE RETURN NULL;\n`;
    sql += `    END CASE;\n`;
    sql += `END;\n`;
    sql += `$$ LANGUAGE plpgsql;\n\n`;
    
    return sql;
}

/**
 * Save SQL statements to file
 * @param {string} sql - SQL statements
 * @param {string} environment - Environment name
 */
function saveSQLToFile(sql, environment) {
    const outputDir = path.join(__dirname, 'generated');
    const outputFile = path.join(outputDir, `${environment}_password_functions.sql`);
    
    fs.writeFileSync(outputFile, sql);
    console.log(`✓ Saved SQL functions to ${outputFile}`);
}

/**
 * Generate environment-specific .env file
 * @param {Object} passwords - Password data
 * @param {string} environment - Environment name
 */
function generateEnvFile(passwords, environment) {
    const outputDir = path.join(__dirname, 'generated');
    const outputFile = path.join(outputDir, `.env.${environment}`);
    
    let envContent = `# Environment-specific passwords for ${environment}\n`;
    envContent += `# Generated at: ${new Date().toISOString()}\n`;
    envContent += `# WARNING: Keep this file secure and do not commit to version control\n\n`;
    
    for (const [role, data] of Object.entries(passwords)) {
        const envVar = `DEFAULT_${role.toUpperCase()}_PASSWORD`;
        envContent += `${envVar}=${data.password}\n`;
    }
    
    fs.writeFileSync(outputFile, envContent);
    console.log(`✓ Saved environment file to ${outputFile}`);
}

/**
 * Main function
 */
async function main() {
    const environment = process.argv[2] || 'development';
    
    if (!ENVIRONMENT_CONFIG[environment]) {
        console.error(`Error: Unknown environment '${environment}'`);
        console.error('Available environments:', Object.keys(ENVIRONMENT_CONFIG).join(', '));
        process.exit(1);
    }
    
    try {
        console.log(`🚀 Starting password generation for ${environment} environment...\n`);
        
        // Generate passwords
        const passwords = await generateEnvironmentPasswords(environment);
        
        // Save to files
        savePasswordsToFile(passwords, environment);
        saveSQLToFile(generateSQLStatements(passwords, environment), environment);
        generateEnvFile(passwords, environment);
        
        console.log(`\n✅ Successfully generated passwords for ${environment} environment!`);
        console.log(`\n📁 Files created:`);
        console.log(`   - generated/${ENVIRONMENT_CONFIG[environment].outputFile}`);
        console.log(`   - generated/${environment}_password_functions.sql`);
        console.log(`   - generated/.env.${environment}`);
        console.log(`   - generated/.gitignore`);
        
        console.log(`\n⚠️  Security Notes:`);
        console.log(`   - Keep generated files secure and do not commit to version control`);
        console.log(`   - Use proper password management in production`);
        console.log(`   - Rotate passwords regularly`);
        console.log(`   - Use environment variables for production deployments`);
        
    } catch (error) {
        console.error('❌ Error generating passwords:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    generatePasswordHash,
    generateSalt,
    generateEnvironmentPassword,
    generateEnvironmentPasswords,
    USER_ROLES,
    ENVIRONMENT_CONFIG
};
