/**
 * Main Integrations Module
 * 
 * This module initializes and exports all third-party integrations
 * for use throughout the application.
 */

const integrationInitializer = require('./scripts/initializeIntegrations');
const integrationRoutes = require('./routes/integrations');

/**
 * Initialize all integrations
 * @returns {Promise<Object>} Initialization result
 */
async function initializeIntegrations() {
  try {
    const result = await integrationInitializer.initializeAll();
    console.log('All integrations initialized successfully');
    return result;
  } catch (error) {
    console.error('Failed to initialize integrations:', error);
    throw error;
  }
}

/**
 * Get integration manager instance
 * @returns {IntegrationManager} Integration manager
 */
function getIntegrationManager() {
  return integrationInitializer.getIntegrationManager();
}

/**
 * Get all registered integrations
 * @returns {Map} Map of registered integrations
 */
function getIntegrations() {
  return integrationInitializer.getIntegrations();
}

/**
 * Get integration routes
 * @returns {Object} Express router
 */
function getIntegrationRoutes() {
  return integrationRoutes;
}

module.exports = {
  initializeIntegrations,
  getIntegrationManager,
  getIntegrations,
  getIntegrationRoutes
};
