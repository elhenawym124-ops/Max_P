const { getSharedPrismaClient } = require('./services/sharedDatabase');
const axios = require('axios');

const prisma = getSharedPrismaClient();

async function checkSpecificToken() {
  try {
    const tokenToCheck = 'EAAK1VXsn5y8BPYm8AXCyV2uVRspr49i0RfpaNexUqBfzwHqX7c8cgVKYcMZAepQG4I77jTgeOwK0k3OpC1ZBxf17uZC0iZCBU3mzn0EzVp5QAcO4zuBW5U2HjTFIa2zzvmCy4ZAHzVPaulj474jAzuvcWaSANVtfweBbGMUzCZAp4LCZCHI5OZCmHt5kPwEF2Vp5mtDM2mMAOWrA0KQawpMHFYFZAGQZDZD';
    
    console.log('🔍 CHECKING SPECIFIC ACCESS TOKEN');
    console.log('=' * 50);
    console.log(`Token Length: ${tokenToCheck.length}`);
    console.log(`Token Preview: ${tokenToCheck.substring(0, 30)}...`);
    console.log('');
    
    // 1. Search for this token in the database
    console.log('📊 SEARCHING DATABASE FOR THIS TOKEN:');
    const pageWithToken = await prisma.facebookPage.findFirst({
      where: {
        pageAccessToken: tokenToCheck
      }
    });
    
    if (pageWithToken) {
      console.log('✅ TOKEN FOUND IN DATABASE!');
      console.log(`   Page Name: ${pageWithToken.pageName}`);
      console.log(`   Page ID: ${pageWithToken.pageId}`);
      console.log(`   Company ID: ${pageWithToken.companyId}`);
      console.log(`   Status: ${pageWithToken.status}`);
      console.log(`   Connected At: ${pageWithToken.connectedAt}`);
      console.log(`   Updated At: ${pageWithToken.updatedAt}`);
      
      if (pageWithToken.disconnectedAt) {
        console.log(`   Disconnected At: ${pageWithToken.disconnectedAt}`);
      }
      console.log('');
      
      // 2. Test if the token is valid with Facebook
      console.log('🧪 TESTING TOKEN WITH FACEBOOK API:');
      try {
        const testResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageWithToken.pageId}`, {
          params: {
            access_token: tokenToCheck,
            fields: 'name,id'
          },
          timeout: 5000
        });
        
        console.log('   ✅ TOKEN IS VALID WITH FACEBOOK');
        console.log(`   Facebook Page Name: ${testResponse.data.name}`);
        console.log(`   Facebook Page ID: ${testResponse.data.id}`);
        
        // 3. Check webhook subscription
        console.log('');
        console.log('🔗 CHECKING WEBHOOK SUBSCRIPTION:');
        try {
          const webhookResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageWithToken.pageId}/subscribed_apps`, {
            params: {
              access_token: tokenToCheck
            },
            timeout: 10000
          });
          
          const isSubscribed = webhookResponse.data.data && webhookResponse.data.data.length > 0;
          console.log(`   Webhook Status: ${isSubscribed ? '✅ SUBSCRIBED' : '❌ NOT SUBSCRIBED'}`);
          
          if (isSubscribed) {
            console.log('   Subscribed Apps:');
            webhookResponse.data.data.forEach((app, index) => {
              console.log(`   ${index + 1}. ${app.name || app.id}`);
            });
          }
          
        } catch (webhookError) {
          console.log(`   ❌ WEBHOOK CHECK FAILED`);
          console.log(`   Error: ${webhookError.response?.data?.error?.message || webhookError.message}`);
        }
        
      } catch (facebookError) {
        console.log('   ❌ TOKEN IS INVALID WITH FACEBOOK');
        console.log(`   Error: ${facebookError.response?.data?.error?.message || facebookError.message}`);
      }
      
    } else {
      console.log('❌ TOKEN NOT FOUND IN DATABASE');
      console.log('   This token has not been saved or was not updated successfully');
      console.log('');
      
      // Check if there are any pages for ns store 3
      console.log('🔍 CHECKING FOR NS STORE 3 PAGES:');
      const nsStorePages = await prisma.facebookPage.findMany({
        where: {
          OR: [
            { pageId: '453471574524139' },
            { pageName: { contains: 'ns store 3' } }
          ]
        }
      });
      
      if (nsStorePages.length > 0) {
        console.log(`   Found ${nsStorePages.length} page(s) for NS Store 3:`);
        nsStorePages.forEach((page, index) => {
          console.log(`   ${index + 1}. ${page.pageName} (${page.pageId})`);
          console.log(`      Status: ${page.status}`);
          console.log(`      Token Length: ${page.pageAccessToken?.length || 0}`);
          console.log(`      Token Preview: ${page.pageAccessToken?.substring(0, 30)}...`);
          console.log(`      Updated At: ${page.updatedAt}`);
          console.log('');
        });
      } else {
        console.log('   No pages found for NS Store 3');
      }
    }
    
    // 4. Summary
    console.log('📋 SUMMARY:');
    if (pageWithToken) {
      console.log('   ✅ The access token IS in the database');
      console.log('   ✅ The update was successful');
      console.log(`   📄 It belongs to: ${pageWithToken.pageName} (${pageWithToken.pageId})`);
    } else {
      console.log('   ❌ The access token is NOT in the database');
      console.log('   ❌ The update may have failed or not been executed');
      console.log('   💡 You may need to reconnect the page with this token');
    }
    
  } catch (error) {
    console.error('❌ Error checking token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkSpecificToken();
}

module.exports = { checkSpecificToken };