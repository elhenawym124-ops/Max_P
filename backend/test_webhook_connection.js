const axios = require('axios');

async function testWebhookConnection() {
  try {
    console.log('🧪 TESTING WEBHOOK CONNECTION');
    console.log('=' * 40);
    
    // Test webhook verification
    console.log('1. Testing webhook verification...');
    const verifyResponse = await axios.get('http://localhost:3002/api/v1/webhook', {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'simple_chat_verify_token_2025',
        'hub.challenge': 'test123'
      },
      timeout: 5000
    });
    
    console.log('✅ Webhook verification successful');
    console.log('   Response:', verifyResponse.data);
    console.log('');
    
    // Test webhook POST with sample message
    console.log('2. Testing webhook POST with sample message...');
    const sampleWebhook = {
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
    
    const postResponse = await axios.post('http://localhost:3002/api/v1/webhook', sampleWebhook, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook POST successful');
    console.log('   Response:', postResponse.data);
    console.log('   Status:', postResponse.status);
    
  } catch (error) {
    console.log('❌ Webhook test failed:');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testWebhookConnection();
}

module.exports = { testWebhookConnection };
