/**
 * Test Server Script
 * Simple script to test if the server starts without errors
 */

const app = require('./server');

// Test if the server can start
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Test server started successfully on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API endpoints available:`);
  console.log(`   - GET /health`);
  console.log(`   - GET /api/students`);
  console.log(`   - GET /api/white-labeling/:tenantId/branding`);
  console.log(`   - GET /api/tenants`);
  console.log(`   - POST /api/onboarding/tenants`);
  
  // Close the server after 2 seconds for testing
  setTimeout(() => {
    console.log('✅ Server test completed successfully');
    process.exit(0);
  }, 2000);
});

// Handle errors
app.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
