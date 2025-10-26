const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function testNgrokWebhook() {
  try {
    console.log('🌐 NGROK WEBHOOK TESTING TOOL');
    console.log('=' * 50);
    
    // Ask user for their ngrok URL
    console.log('Please provide your ngrok URL (from ngrok terminal):');
    console.log('Example: https://abc123.ngrok.io');
    const ngrokUrl = await askQuestion('Enter your ngrok URL: ');
    
    if (!ngrokUrl.startsWith('http')) {
      console.log('❌ Invalid URL format. Please include http:// or https://');
      rl.close();
      return;
    }
    
    const webhookUrl = `${ngrokUrl.replace(/\/$/, '')}/webhook`;
    console.log(`\n🧪 Testing webhook URL: ${webhookUrl}`);
    
    // Test 1: Facebook verification (GET request)
    console.log('\n1. 🔍 Testing Facebook verification (GET):');
    try {
      const getResponse = await axios.get(webhookUrl, {
        params: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'simple_chat_verify_token_2025',
          'hub.challenge': 'ngrok_test_challenge_12345'
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'facebookexternalua/1.1'
        }
      });
      
      if (getResponse.status === 200 && getResponse.data === 'ngrok_test_challenge_12345') {
        console.log('   ✅ SUCCESS: Webhook verification works!');
        console.log(`   Response: "${getResponse.data}"`);
      } else {
        console.log('   ❌ FAILED: Wrong response');
        console.log(`   Status: ${getResponse.status}, Data: ${getResponse.data}`);
      }
      
    } catch (error) {
      console.log('   ❌ FAILED');
      console.log(`   Error: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log('   Make sure your backend server is running on localhost:3001');
      }
    }
    
    // Test 2: Message delivery (POST request)
    console.log('\n2. 📨 Testing message delivery (POST):');
    try {
      const testMessage = {
        object: 'page',
        entry: [{
          id: '453471574524139', // ns store 3 page ID
          time: Date.now(),
          messaging: [{
            sender: { id: 'ngrok_test_user_123' },
            recipient: { id: '453471574524139' },
            timestamp: Date.now(),
            message: {
              mid: 'ngrok_test_' + Date.now(),
              text: 'Test message via ngrok - تجربة الرسائل عبر ngrok'
            }
          }]
        }]
      };
      
      const postResponse = await axios.post(webhookUrl, testMessage, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'facebookplatform/1.0'
        },
        timeout: 10000
      });
      
      if (postResponse.status === 200) {
        console.log('   ✅ SUCCESS: Message delivery works!');
        console.log(`   Status: ${postResponse.status}`);
        console.log(`   Response: ${postResponse.data || 'EVENT_RECEIVED'}`);
      } else {
        console.log('   ⚠️ WARNING: Unexpected response');
        console.log(`   Status: ${postResponse.status}, Data: ${postResponse.data}`);
      }
      
    } catch (error) {
      console.log('   ❌ FAILED');
      console.log(`   Error: ${error.message}`);
    }
    
    // Instructions for Facebook Developer Console
    console.log('\n🎯 FACEBOOK DEVELOPER CONSOLE SETUP:');
    console.log(`1. Go to Facebook Developer Console`);
    console.log(`2. Navigate to Webhooks section`);
    console.log(`3. Set webhook URL to: ${webhookUrl}`);
    console.log(`4. Set verify token to: simple_chat_verify_token_2025`);
    console.log(`5. Subscribe to webhook fields:`);
    console.log(`   ✅ messages`);
    console.log(`   ✅ messaging_postbacks`);
    console.log(`   ✅ messaging_optins`);
    console.log(`   ✅ message_reads`);
    console.log(`   ✅ message_deliveries`);
    console.log(`6. Click "Verify and Save"`);
    console.log(`7. Subscribe page 453471574524139 (ns store 3) to the webhook`);
    
    console.log('\n🧪 TESTING INSTRUCTIONS:');
    console.log('1. Complete the Facebook Developer Console setup above');
    console.log('2. Send a message to "ns store 3" page from your personal Facebook account');
    console.log('3. Check your backend terminal for webhook logs');
    console.log('4. Verify the message appears in your chat application');
    
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('- Make sure backend server is running: node server.js');
    console.log('- Make sure ngrok is pointing to port 3001');
    console.log('- Check ngrok terminal for request logs');
    console.log('- Verify Facebook page has proper permissions');
    
    rl.close();
    
  } catch (error) {
    console.error('❌ Error testing ngrok webhook:', error);
    rl.close();
  }
}

// Run the test
if (require.main === module) {
  testNgrokWebhook();
}

module.exports = { testNgrokWebhook };