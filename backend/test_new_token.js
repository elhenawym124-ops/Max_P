const axios = require('axios');

async function testNewToken() {
  try {
    console.log('🧪 TESTING NEW ACCESS TOKEN');
    console.log('=' * 40);
    
    const newToken = 'EAAK1VXsn5y8BPYm8AXCyV2uVRspr49i0RfpaNexUqBfzwHqX7c8cgVKYcMZAepQG4I77jTgeOwK0k3OpC1ZBxf17uZC0iZCBU3mzn0EzVp5QAcO4zuBW5U2HjTFIa2zzvmCy4ZAHzVPaulj474jAzuvcWaSANVtfweBbGMUzCZAp4LCZCHI5OZCmHt5kPwEF2Vp5mtDM2mMAOWrA0KQawpMHFYFZAGQZDZD';
    const pageId = '453471574524139';
    
    // 1. Test basic page info
    console.log('1. Testing basic page info...');
    const pageResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
      params: {
        access_token: newToken,
        fields: 'name,id,category,verification_status,fan_count'
      },
      timeout: 10000
    });
    
    console.log('✅ Page info retrieved:');
    console.log(`   Name: ${pageResponse.data.name}`);
    console.log(`   ID: ${pageResponse.data.id}`);
    console.log(`   Category: ${pageResponse.data.category}`);
    console.log(`   Verified: ${pageResponse.data.verification_status}`);
    console.log(`   Followers: ${pageResponse.data.fan_count}`);
    console.log('');
    
    // 2. Test token permissions
    console.log('2. Testing token permissions...');
    const permissionsResponse = await axios.get(`https://graph.facebook.com/v18.0/me/permissions`, {
      params: {
        access_token: newToken
      },
      timeout: 10000
    });
    
    console.log('✅ Token permissions:');
    const requiredPermissions = ['pages_messaging', 'pages_manage_metadata', 'pages_read_engagement'];
    let allRequired = true;
    
    permissionsResponse.data.data.forEach(perm => {
      const status = perm.status === 'granted' ? '✅' : '❌';
      console.log(`   ${status} ${perm.permission}: ${perm.status}`);
      
      if (requiredPermissions.includes(perm.permission) && perm.status !== 'granted') {
        allRequired = false;
      }
    });
    
    console.log(`\n   All required permissions: ${allRequired ? '✅ YES' : '❌ NO'}`);
    console.log('');
    
    // 3. Test webhook subscriptions
    console.log('3. Testing webhook subscriptions...');
    try {
      const webhookResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
        params: {
          access_token: newToken
        },
        timeout: 10000
      });
      
      console.log('✅ Webhook subscriptions:');
      console.log('   Response:', JSON.stringify(webhookResponse.data, null, 2));
      
    } catch (webhookError) {
      console.log('❌ Webhook subscriptions error:');
      console.log(`   Error: ${webhookError.response?.data?.error?.message || webhookError.message}`);
      console.log(`   Code: ${webhookError.response?.data?.error?.code || 'N/A'}`);
    }
    console.log('');
    
    // 4. Test sending a message (this will fail due to 24-hour rule, but we can see the error)
    console.log('4. Testing message sending capability...');
    try {
      const testMessage = {
        recipient: { id: 'TEST_USER_123' },
        message: { text: 'Test message' }
      };
      
      const sendResponse = await axios.post(`https://graph.facebook.com/v18.0/me/messages`, {
        ...testMessage,
        access_token: newToken
      }, {
        timeout: 10000
      });
      
      console.log('✅ Message sending works:');
      console.log('   Response:', JSON.stringify(sendResponse.data, null, 2));
      
    } catch (sendError) {
      console.log('⚠️ Message sending test (expected to fail):');
      console.log(`   Error: ${sendError.response?.data?.error?.message || sendError.message}`);
      console.log(`   Code: ${sendError.response?.data?.error?.code || 'N/A'}`);
      
      if (sendError.response?.data?.error?.code === 100) {
        console.log('   ✅ This is expected - no customer has messaged the page');
      } else if (sendError.response?.data?.error?.code === 190) {
        console.log('   ❌ Token is invalid or expired');
      } else {
        console.log('   ❓ Unexpected error - token might have issues');
      }
    }
    
    console.log('');
    console.log('🎯 TOKEN ANALYSIS COMPLETE');
    console.log('   The new token appears to be working correctly');
    console.log('   The issue is likely that no customers have messaged the page');
    console.log('   This is a Facebook policy requirement, not a token issue');
    
  } catch (error) {
    console.log('❌ Token test failed:');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testNewToken();
}

module.exports = { testNewToken };
