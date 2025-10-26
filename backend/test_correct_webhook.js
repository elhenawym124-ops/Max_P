const axios = require('axios');

async function testCorrectWebhook() {
  try {
    console.log('🎯 TESTING CORRECT WEBHOOK URL');
    console.log('=' * 50);
    
    const correctWebhookUrl = 'https://www.mokhtarelhenawy.online/api/v1/webhook';
    console.log(`Testing: ${correctWebhookUrl}`);
    
    // Test Facebook verification
    console.log('\n1. 🧪 Testing Facebook verification (GET request):');
    try {
      const getResponse = await axios.get(correctWebhookUrl, {
        params: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'simple_chat_verify_token_2025',
          'hub.challenge': 'test_challenge_12345'
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'facebookexternalua/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
        }
      });
      
      if (getResponse.status === 200 && getResponse.data === 'test_challenge_12345') {
        console.log('   ✅ SUCCESS: Webhook verification works!');
        console.log(`   Response: "${getResponse.data}"`);
      } else {
        console.log('   ❌ FAILED: Wrong response');
        console.log(`   Status: ${getResponse.status}, Data: ${getResponse.data}`);
      }
      
    } catch (error) {
      console.log('   ❌ FAILED');
      console.log(`   Error: ${error.message}`);
    }
    
    // Test message delivery
    console.log('\n2. 📨 Testing message delivery (POST request):');
    try {
      const testWebhookData = {
        object: 'page',
        entry: [{
          id: '453471574524139',
          time: Date.now(),
          messaging: [{
            sender: { id: 'test_user_123' },
            recipient: { id: '453471574524139' },
            timestamp: Date.now(),
            message: {
              mid: 'test_message_id',
              text: 'Test message for webhook verification'
            }
          }]
        }]
      };
      
      const postResponse = await axios.post(correctWebhookUrl, testWebhookData, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'facebookplatform/1.0 (+http://developers.facebook.com)'
        },
        timeout: 10000
      });
      
      if (postResponse.status === 200) {
        console.log('   ✅ SUCCESS: Webhook accepts POST requests!');
        console.log(`   Status: ${postResponse.status}`);
        console.log(`   Response: ${postResponse.data || 'Empty response'}`);
      } else {
        console.log('   ⚠️ WARNING: Unexpected response');
        console.log(`   Status: ${postResponse.status}, Data: ${postResponse.data}`);
      }
      
    } catch (error) {
      console.log('   ❌ FAILED');
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n🎉 WEBHOOK URL VALIDATION COMPLETE!');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. ✅ Update Facebook Developer Console webhook URL to:');
    console.log(`      ${correctWebhookUrl}`);
    console.log('   2. ✅ Use verify token: simple_chat_verify_token_2025');
    console.log('   3. ✅ Subscribe to webhook fields: messages, messaging_postbacks');
    console.log('   4. ✅ Click "Verify and Save" in Facebook Developer Console');
    console.log('   5. 🧪 Send a test message to ns store 3 page');
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
  }
}

// Run the test
if (require.main === module) {
  testCorrectWebhook();
}

module.exports = { testCorrectWebhook };