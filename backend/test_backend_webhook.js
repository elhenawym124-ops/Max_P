const axios = require('axios');

async function testBackendWebhook() {
  try {
    console.log('🔍 TESTING BACKEND WEBHOOK ENDPOINTS');
    console.log('=' * 50);
    
    const endpoints = [
      'http://localhost:3001/webhook',
      'https://www.mokhtarelhenawy.online:3001/webhook',
      'https://www.mokhtarelhenawy.online/api/v1/webhook',
      'https://www.mokhtarelhenawy.online/webhook'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n🧪 Testing: ${endpoint}`);
      
      try {
        const response = await axios.get(endpoint, {
          params: {
            'hub.mode': 'subscribe',
            'hub.verify_token': 'simple_chat_verify_token_2025',
            'hub.challenge': 'test_challenge_123'
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FacebookBot/1.0)'
          }
        });
        
        if (response.status === 200 && response.data === 'test_challenge_123') {
          console.log('   ✅ CORRECT: Webhook responds properly');
          console.log(`   Response: ${response.data}`);
        } else {
          console.log('   ⚠️ INCORRECT: Wrong response');
          console.log(`   Status: ${response.status}`);
          console.log(`   Data: ${typeof response.data === 'string' ? response.data.substring(0, 100) + '...' : response.data}`);
        }
        
      } catch (error) {
        console.log('   ❌ FAILED');
        if (error.code === 'ECONNREFUSED') {
          console.log('   Reason: Connection refused (server not running)');
        } else if (error.code === 'ENOTFOUND') {
          console.log('   Reason: Domain not found');
        } else if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Reason: ${error.response.statusText}`);
        } else {
          console.log(`   Reason: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('   The webhook URL https://www.mokhtarelhenawy.online/webhook');
    console.log('   should return "test_challenge_123" when Facebook tests it.');
    console.log('   Currently it\'s returning HTML (frontend) instead of the backend response.');
    console.log('');
    console.log('🔧 SOLUTIONS:');
    console.log('   1. Make sure backend server is running on production');
    console.log('   2. Configure Nginx to route /webhook to backend server');
    console.log('   3. Or use a different webhook URL like:');
    console.log('      https://www.mokhtarelhenawy.online:3001/webhook');
    console.log('      (if backend runs on port 3001)');
    
  } catch (error) {
    console.error('❌ Error testing webhooks:', error);
  }
}

// Run the test
if (require.main === module) {
  testBackendWebhook();
}

module.exports = { testBackendWebhook };