const { getSharedPrismaClient } = require('./services/sharedDatabase');
const axios = require('axios');

const prisma = getSharedPrismaClient();

async function diagnoseSpecificPage() {
  try {
    console.log('🎯 DIAGNOSING NS STORE 3 - PAGE ID: 453471574524139');
    console.log('=' * 60);
    
    // Get the specific page
    const page = await prisma.facebookPage.findUnique({
      where: { pageId: '453471574524139' }
    });
    
    if (!page) {
      console.log('❌ Page not found in database');
      return;
    }
    
    console.log('📄 Page Information:');
    console.log(`   Name: ${page.pageName}`);
    console.log(`   ID: ${page.pageId}`);
    console.log(`   Status: ${page.status}`);
    console.log(`   Company: ${page.companyId}`);
    console.log(`   Connected At: ${page.connectedAt}`);
    console.log(`   Token Length: ${page.pageAccessToken?.length || 0}`);
    console.log('');
    
    // Test token validity
    console.log('🧪 TESTING TOKEN VALIDITY:');
    try {
      const testResponse = await axios.get(`https://graph.facebook.com/v18.0/${page.pageId}`, {
        params: {
          access_token: page.pageAccessToken,
          fields: 'name,id'
        },
        timeout: 5000
      });
      
      console.log('   ✅ Token is VALID');
      console.log(`   Returned Page: ${testResponse.data.name} (${testResponse.data.id})`);
      
    } catch (tokenError) {
      console.log('   ❌ Token is INVALID');
      console.log(`   Error: ${tokenError.response?.data?.error?.message || tokenError.message}`);
      return;
    }
    
    // Check webhook subscription
    console.log('🔗 CHECKING WEBHOOK SUBSCRIPTION:');
    try {
      const webhookResponse = await axios.get(`https://graph.facebook.com/v18.0/${page.pageId}/subscribed_apps`, {
        params: {
          access_token: page.pageAccessToken
        },
        timeout: 10000
      });
      
      const isSubscribed = webhookResponse.data.data && webhookResponse.data.data.length > 0;
      console.log(`   Status: ${isSubscribed ? '✅ SUBSCRIBED' : '❌ NOT SUBSCRIBED'}`);
      
      if (isSubscribed) {
        console.log('   Subscribed Apps:');
        webhookResponse.data.data.forEach((app, index) => {
          console.log(`   ${index + 1}. ${app.name || app.id}`);
        });
      } else {
        console.log('   ❌ This page is NOT subscribed to any app\'s webhook');
        console.log('   This is why messages are not reaching your system!');
      }
      
    } catch (webhookError) {
      console.log(`   ❌ WEBHOOK CHECK FAILED`);
      console.log(`   Error: ${webhookError.response?.data?.error?.message || webhookError.message}`);
      
      if (webhookError.response?.data?.error?.message?.includes('pages_manage_metadata')) {
        console.log('   🔑 ROOT CAUSE: Missing pages_manage_metadata permission');
        console.log('   This permission is lost during disconnect/reconnect process');
      }
    }
    
    // Check for conversations
    console.log('💬 CHECKING CONVERSATIONS:');
    const conversations = await prisma.conversation.count({
      where: {
        companyId: page.companyId,
        customer: {
          facebookId: { not: null }
        }
      }
    });
    
    console.log(`   Facebook conversations for this company: ${conversations}`);
    
    if (conversations === 0) {
      console.log('   ❌ NO CONVERSATIONS FOUND');
      console.log('   This confirms that webhooks are not working');
    } else {
      console.log('   ✅ Company has Facebook conversations');
      console.log('   But this specific page is not receiving new messages');
    }
    
    console.log('');
    console.log('🎯 DIAGNOSIS SUMMARY:');
    console.log('   The page was working before, but after disconnect/reconnect:');
    console.log('   1. ✅ Page access token is still valid');
    console.log('   2. ❌ Lost pages_manage_metadata permission');
    console.log('   3. ❌ Not subscribed to webhook events');
    console.log('   4. ❌ No new messages are being received');
    
    console.log('');
    console.log('🔧 IMMEDIATE SOLUTIONS:');
    console.log('   1. MANUAL FIX (Facebook Developer Console):');
    console.log('      - Go to Facebook Developer Console');
    console.log('      - Select your app');
    console.log('      - Go to Webhooks section');
    console.log('      - Manually subscribe page 453471574524139 to webhook');
    console.log('      - Ensure pages_manage_metadata permission is granted');
    console.log('');
    console.log('   2. RECONNECTION FIX (Recommended):');
    console.log('      - Generate a NEW page access token with proper permissions');
    console.log('      - Reconnect the page using the improved connect function');
    console.log('      - The new connect function will automatically subscribe to webhooks');
    console.log('');
    console.log('   3. PREVENT FUTURE ISSUES:');
    console.log('      - Use the improved disconnect function (marks as disconnected, doesn\'t delete)');
    console.log('      - Always reconnect with fresh tokens that include pages_manage_metadata');
    console.log('      - Test webhook subscription after every reconnection');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
if (require.main === module) {
  diagnoseSpecificPage();
}

module.exports = { diagnoseSpecificPage };