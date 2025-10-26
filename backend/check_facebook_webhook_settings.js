const axios = require('axios');

async function checkFacebookWebhookSettings() {
  try {
    console.log('🔍 CHECKING FACEBOOK WEBHOOK SETTINGS');
    console.log('=' * 50);
    
    // Get page access token
    const { getSharedPrismaClient } = require('./services/sharedDatabase');
    const prisma = getSharedPrismaClient();
    
    const pageData = await prisma.facebookPage.findUnique({
      where: { pageId: '453471574524139' }
    });
    
    if (!pageData) {
      console.log('❌ Page not found in database');
      return;
    }
    
    console.log('📄 Page Info:');
    console.log(`   Name: ${pageData.pageName}`);
    console.log(`   ID: ${pageData.pageId}`);
    console.log(`   Access Token: ${pageData.pageAccessToken ? 'Available' : 'Missing'}`);
    console.log('');
    
    // Check webhook subscriptions
    console.log('🔍 Checking webhook subscriptions...');
    const webhookResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageData.pageId}/subscribed_apps`, {
      params: {
        access_token: pageData.pageAccessToken
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook subscriptions:');
    console.log('   Response:', JSON.stringify(webhookResponse.data, null, 2));
    
    // Check app webhook settings
    console.log('');
    console.log('🔍 Checking app webhook settings...');
    
    // Extract app ID from access token (this is a simplified approach)
    const appId = 'YOUR_APP_ID'; // You need to replace this with actual app ID
    
    try {
      const appWebhookResponse = await axios.get(`https://graph.facebook.com/v18.0/${appId}/subscriptions`, {
        params: {
          access_token: pageData.pageAccessToken
        },
        timeout: 10000
      });
      
      console.log('✅ App webhook settings:');
      console.log('   Response:', JSON.stringify(appWebhookResponse.data, null, 2));
    } catch (appError) {
      console.log('⚠️ Could not check app webhook settings (need app access token)');
      console.log('   Error:', appError.response?.data?.error?.message || appError.message);
    }
    
    // Check page webhook fields
    console.log('');
    console.log('🔍 Checking webhook fields...');
    const fieldsResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageData.pageId}`, {
      params: {
        access_token: pageData.pageAccessToken,
        fields: 'webhook_subscriptions'
      },
      timeout: 10000
    });
    
    console.log('✅ Page webhook fields:');
    console.log('   Response:', JSON.stringify(fieldsResponse.data, null, 2));
    
    console.log('');
    console.log('🎯 WEBHOOK CONFIGURATION CHECKLIST:');
    console.log('   1. ✅ Page access token is available');
    console.log('   2. ❓ Webhook URL should be: https://yourdomain.com/api/v1/webhook');
    console.log('   3. ❓ Verify token should be: simple_chat_verify_token_2025');
    console.log('   4. ❓ Subscribed fields should include: messages, messaging_postbacks');
    console.log('   5. ❓ Webhook should be active and verified');
    
    console.log('');
    console.log('🔧 TO FIX WEBHOOK:');
    console.log('   1. Go to Facebook Developer Console');
    console.log('   2. Select your app');
    console.log('   3. Go to Webhooks section');
    console.log('   4. Add webhook URL: https://yourdomain.com/api/v1/webhook');
    console.log('   5. Verify token: simple_chat_verify_token_2025');
    console.log('   6. Subscribe to: messages, messaging_postbacks');
    console.log('   7. Subscribe the page to the webhook');
    
  } catch (error) {
    console.log('❌ Error checking webhook settings:');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  } finally {
    if (typeof prisma !== 'undefined') {
      await prisma.$disconnect();
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  checkFacebookWebhookSettings();
}

module.exports = { checkFacebookWebhookSettings };
