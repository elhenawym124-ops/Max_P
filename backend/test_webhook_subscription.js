const { getSharedPrismaClient } = require('./services/sharedDatabase');
const axios = require('axios');

const prisma = getSharedPrismaClient();

async function testWebhookAfterSubscription() {
  try {
    console.log('🎯 TESTING WEBHOOK AFTER MANUAL SUBSCRIPTION');
    console.log('=' * 60);
    
    const pageId = '453471574524139';
    
    // Get the page from database
    const page = await prisma.facebookPage.findUnique({
      where: { pageId: pageId }
    });
    
    if (!page) {
      console.log('❌ Page not found in database');
      return;
    }
    
    console.log('📄 Page Information:');
    console.log(`   Name: ${page.pageName}`);
    console.log(`   ID: ${page.pageId}`);
    console.log(`   Status: ${page.status}`);
    console.log('');
    
    // Test webhook subscription after manual setup
    console.log('🔗 TESTING WEBHOOK SUBSCRIPTION STATUS:');
    try {
      const webhookResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
        params: {
          access_token: page.pageAccessToken
        },
        timeout: 10000
      });
      
      const isSubscribed = webhookResponse.data.data && webhookResponse.data.data.length > 0;
      console.log(`   Status: ${isSubscribed ? '✅ SUBSCRIBED' : '❌ NOT SUBSCRIBED'}`);
      
      if (isSubscribed) {
        console.log('   ✅ SUCCESS! Page is now subscribed to webhook');
        console.log('   Subscribed Apps:');
        webhookResponse.data.data.forEach((app, index) => {
          console.log(`   ${index + 1}. App: ${app.name || app.id}`);
          console.log(`      ID: ${app.id}`);
        });
        
        console.log('');
        console.log('🎉 WEBHOOK SUBSCRIPTION RESTORED!');
        console.log('   The page should now receive messages normally');
        console.log('   Try sending a test message to verify functionality');
        
      } else {
        console.log('   ❌ Page is still not subscribed');
        console.log('   Please make sure to click "Confirm" in the Facebook Developer Console');
      }
      
    } catch (webhookError) {
      console.log(`   ❌ WEBHOOK CHECK FAILED`);
      console.log(`   Error: ${webhookError.response?.data?.error?.message || webhookError.message}`);
      
      if (webhookError.response?.data?.error?.message?.includes('pages_manage_metadata')) {
        console.log('   🔑 Still missing pages_manage_metadata permission');
        console.log('   The manual subscription may not work without this permission');
      }
    }
    
    // Check if webhook endpoint is accessible
    console.log('');
    console.log('🌐 TESTING WEBHOOK ENDPOINT ACCESSIBILITY:');
    try {
      const webhookUrl = 'https://www.mokhtarelhenawy.online/webhook';
      console.log(`   Testing: ${webhookUrl}`);
      
      // Test GET request (Facebook verification)
      const getResponse = await axios.get(webhookUrl, {
        params: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'simple_chat_verify_token_2025',
          'hub.challenge': 'test_challenge_123'
        },
        timeout: 10000
      });
      
      if (getResponse.status === 200 && getResponse.data === 'test_challenge_123') {
        console.log('   ✅ Webhook endpoint is accessible and responding correctly');
      } else {
        console.log('   ⚠️ Webhook endpoint response may be incorrect');
        console.log(`   Status: ${getResponse.status}, Data: ${getResponse.data}`);
      }
      
    } catch (endpointError) {
      console.log('   ❌ Webhook endpoint is not accessible');
      console.log(`   Error: ${endpointError.message}`);
      console.log('   Make sure your production server is running');
    }
    
    // Provide next steps
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('   1. ✅ Make sure you clicked "Confirm" in Facebook Developer Console');
    console.log('   2. 🧪 Send a test message to the page from a personal Facebook account');
    console.log('   3. 🔍 Check the backend logs for incoming webhook requests');
    console.log('   4. 💬 Verify that conversations are created in the database');
    console.log('');
    console.log('📱 TO TEST:');
    console.log('   1. Go to Facebook and find "ns store 3" page');
    console.log('   2. Send a message from your personal account');
    console.log('   3. Check if the message appears in your chat system');
    console.log('   4. If it works, the reconnection issue is fully resolved!');
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testWebhookAfterSubscription();
}

module.exports = { testWebhookAfterSubscription };