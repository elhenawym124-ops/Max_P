const axios = require('axios');

// Replace this with your actual ngrok URL
const NGROK_URL = 'PASTE_YOUR_NGROK_URL_HERE'; // e.g., 'https://abc123.ngrok.io'

async function quickNgrokTest() {
  console.log('🚀 QUICK NGROK WEBHOOK TEST');
  console.log('=' * 40);
  
  if (NGROK_URL === 'PASTE_YOUR_NGROK_URL_HERE') {
    console.log('❌ Please edit this file and replace NGROK_URL with your actual ngrok URL');
    console.log('   Example: const NGROK_URL = "https://abc123.ngrok.io";');
    return;
  }
  
  const webhookUrl = `${NGROK_URL}/webhook`;
  console.log(`Testing: ${webhookUrl}`);
  
  try {
    // Test verification
    const response = await axios.get(webhookUrl, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'simple_chat_verify_token_2025',
        'hub.challenge': 'test_challenge'
      },
      timeout: 10000
    });
    
    if (response.data === 'test_challenge') {
      console.log('✅ SUCCESS! Webhook is working');
      console.log('\n📋 Facebook Developer Console Setup:');
      console.log(`1. Webhook URL: ${webhookUrl}`);
      console.log(`2. Verify Token: simple_chat_verify_token_2025`);
      console.log(`3. Subscribe to: messages, messaging_postbacks`);
      console.log(`4. Subscribe page: 453471574524139 (ns store 3)`);
    } else {
      console.log('❌ FAILED: Wrong response');
    }
    
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }
}

quickNgrokTest();