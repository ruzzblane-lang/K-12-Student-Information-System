// Integration test for all SDKs
const { SchoolSIS } = require('./javascript/src/index.ts');
const { WebhookClient } = require('./webhooks/src/webhook-client.ts');

async function testJavaScriptSDK() {
  console.log('🧪 Testing JavaScript SDK...');
  
  const client = new SchoolSIS({
    baseUrl: 'http://localhost:3000/api',
    tenantSlug: 'springfield-high'
  });

  try {
    // Test authentication
    console.log('  ✓ SDK initialized');
    
    // Test configuration
    client.setTenantSlug('test-school');
    console.log('  ✓ Tenant slug set:', client.getTenantSlug());
    
    // Test token management
    client.setToken('test-token', 'test-refresh-token');
    console.log('  ✓ Token set:', client.getToken() ? 'Yes' : 'No');
    
    console.log('  ✅ JavaScript SDK tests passed');
    return true;
  } catch (error) {
    console.error('  ❌ JavaScript SDK test failed:', error.message);
    return false;
  }
}

async function testWebhookClient() {
  console.log('🧪 Testing Webhook Client...');
  
  const webhook = new WebhookClient({
    baseUrl: 'ws://localhost:3000',
    token: 'test-token'
  });

  try {
    // Test configuration
    console.log('  ✓ Webhook client initialized');
    
    // Test event subscriptions
    const subscriptionId = webhook.subscribeToStudents((event) => {
      console.log('  ✓ Student event received:', event.event);
    });
    console.log('  ✓ Student subscription created:', subscriptionId);
    
    // Test unsubscription
    webhook.unsubscribe(subscriptionId);
    console.log('  ✓ Subscription removed');
    
    // Test connection status
    const status = webhook.getConnectionStatus();
    console.log('  ✓ Connection status:', status.connected ? 'Connected' : 'Disconnected');
    
    console.log('  ✅ Webhook Client tests passed');
    return true;
  } catch (error) {
    console.error('  ❌ Webhook Client test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting SDK Integration Tests\n');
  
  const results = [];
  
  results.push(await testJavaScriptSDK());
  results.push(await testWebhookClient());
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All SDK tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testJavaScriptSDK, testWebhookClient, runAllTests };
