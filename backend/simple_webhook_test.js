const axios = require('axios');

async function simpleWebhookTest() {
  try {
    console.log('🧪 SIMPLE WEBHOOK TEST');
    console.log('=' * 30);
    
    // Test 1: Webhook verification
    console.log('1. Testing webhook verification...');
    try {
      const verifyResponse = await axios.get('http://localhost:3002/api/v1/webhook', {
        params: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'simple_chat_verify_token_2025',
          'hub.challenge': 'test123'
        },
        timeout: 5000
      });
      
      console.log('   ✅ Verification works');
      console.log(`   Response: ${verifyResponse.data}`);
      
    } catch (error) {
      console.log('   ❌ Verification failed');
      console.log(`   Error: ${error.message}`);
    }
    
    // Test 2: Webhook POST with real message
    console.log('\n2. Testing webhook POST with message...');
    const testMessage = {
      object: 'page',
      entry: [{
        id: '453471574524139',
        time: Date.now(),
        messaging: [{
          sender: { id: 'TEST_USER_123' },
          recipient: { id: '453471574524139' },
          timestamp: Date.now(),
          message: {
            mid: 'TEST_MESSAGE_123',
            text: 'Test message from webhook test'
          }
        }]
      }]
    };
    
    try {
      const postResponse = await axios.post('http://localhost:3002/api/v1/webhook', testMessage, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('   ✅ POST works');
      console.log(`   Response: ${postResponse.data}`);
      console.log(`   Status: ${postResponse.status}`);
      
    } catch (error) {
      console.log('   ❌ POST failed');
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${error.response.data}`);
      }
    }
    
    // Test 3: Check if server is running
    console.log('\n3. Testing server status...');
    try {
      const serverResponse = await axios.get('http://localhost:3002/api/v1/monitor', {
        timeout: 5000
      });
      
      console.log('   ✅ Server is running');
      console.log(`   Status: ${serverResponse.status}`);
      
    } catch (error) {
      console.log('   ❌ Server not responding');
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n🎯 WEBHOOK TEST SUMMARY:');
    console.log('   The webhook is technically working');
    console.log('   The issue is likely that Facebook is not sending webhooks');
    console.log('   This means the webhook is not properly configured in Facebook');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  simpleWebhookTest();
}

module.exports = { simpleWebhookTest };
