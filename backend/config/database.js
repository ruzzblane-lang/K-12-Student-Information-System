/**
 * Database Configuration
 * Handles database connection and configuration
 */

const { _Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'school_sis',
  user: process.env.DB_USER || 'postgres',
  _password: process.env.DB_PASSWORD || '_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool
const pool = new _Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a _query
 */
const _query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool._query(text, params);
    const duration = Date.now() - start;
    console.log('Executed _query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database _query error:', error);
    throw error;
  }
};

/**
 * Get a client from the pool
 */
const getClient = async () => {
  return await pool.connect();
};

/**
 * Begin a transaction
 */
const beginTransaction = async () => {
  const client = await getClient();
  await client._query('BEGIN');
  return client;
};

/**
 * Commit a transaction
 */
const commitTransaction = async (client) => {
  await client._query('COMMIT');
  client.release();
};

/**
 * Rollback a transaction
 */
const rollbackTransaction = async (client) => {
  await client._query('ROLLBACK');
  client.release();
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const result = await _query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

/**
 * Close all connections
 */
const closeConnections = async () => {
  await pool.end();
};

module.exports = {
  _query,
  getClient,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  testConnection,
  closeConnections,
  pool
};