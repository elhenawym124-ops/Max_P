const axios = require('axios');

async function testLocalWebhook() {
  try {
    console.log('🔍 TESTING LOCAL DEVELOPMENT WEBHOOK');
    console.log('=' * 50);
    
    const localEndpoints = [
      'http://localhost:3001/webhook',
      'http://localhost:5000/webhook',
      'http://localhost:3001/api/v1/webhook',
      'http://localhost:5000/api/v1/webhook'
    ];
    
    for (const endpoint of localEndpoints) {
      console.log(`\n🧪 Testing: ${endpoint}`);
      
      try {
        const response = await axios.get(endpoint, {
          params: {
            'hub.mode': 'subscribe',
            'hub.verify_token': 'simple_chat_verify_token_2025',
            'hub.challenge': 'test_challenge_dev'
          },
          timeout: 5000
        });
        
        if (response.status === 200 && response.data === 'test_challenge_dev') {
          console.log('   ✅ WORKING: Webhook responds correctly');
          console.log(`   Response: ${response.data}`);
          
          // Test POST request
          console.log('   📨 Testing POST request...');
          try {
            const postResponse = await axios.post(endpoint, {
              object: 'page',
              entry: [{
                id: '453471574524139',
                messaging: [{
                  sender: { id: 'test_user' },
                  recipient: { id: '453471574524139' },
                  message: { text: 'Test message' }
                }]
              }]
            }, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 5000
            });
            
            console.log(`   ✅ POST works: Status ${postResponse.status}`);
          } catch (postError) {
            console.log(`   ❌ POST failed: ${postError.message}`);
          }
          
        } else {
          console.log('   ⚠️ INCORRECT: Wrong response');
          console.log(`   Status: ${response.status}, Data: ${response.data}`);
        }
        
      } catch (error) {
        console.log('   ❌ FAILED');
        if (error.code === 'ECONNREFUSED') {
          console.log('   Reason: Server not running on this port');
        } else {
          console.log(`   Reason: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎯 FOR DEVELOPMENT ENVIRONMENT:');
    console.log('   Since you\'re working locally, you have two options:');
    console.log('');
    console.log('   OPTION 1: Use ngrok or similar tunnel service');
    console.log('   1. Install ngrok: npm install -g ngrok');
    console.log('   2. Run: ngrok http 3001 (or your backend port)');
    console.log('   3. Use the ngrok URL in Facebook Developer Console');
    console.log('   4. Example: https://abc123.ngrok.io/webhook');
    console.log('');
    console.log('   OPTION 2: Test locally without Facebook');
    console.log('   1. Use the local webhook for development');
    console.log('   2. Test with manual POST requests');
    console.log('   3. Deploy to production when ready');
    
  } catch (error) {
    console.error('❌ Error testing local webhook:', error);
  }
}

// Run the test
if (require.main === module) {
  testLocalWebhook();
}

module.exports = { testLocalWebhook };