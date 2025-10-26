const { getSharedPrismaClient } = require('./services/sharedDatabase');
const axios = require('axios');

async function analyzeTokenIssue() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 ANALYZING TOKEN ISSUE FOR RECONNECTED PAGES');
    console.log('=' * 60);
    
    const newToken = 'EAAK1VXsn5y8BPYm8AXCyV2uVRspr49i0RfpaNexUqBfzwHqX7c8cgVKYcMZAepQG4I77jTgeOwK0k3OpC1ZBxf17uZC0iZCBU3mzn0EzVp5QAcO4zuBW5U2HjTFIa2zzvmCy4ZAHzVPaulj474jAzuvcWaSANVtfweBbGMUzCZAp4LCZCHI5OZCmHt5kPwEF2Vp5mtDM2mMAOWrA0KQawpMHFYFZAGQZDZD';
    
    // 1. Get current page data
    const pageData = await prisma.facebookPage.findUnique({
      where: { pageId: '453471574524139' },
      include: {
        company: { select: { name: true, id: true } }
      }
    });
    
    if (!pageData) {
      console.log('❌ Page not found in database');
      return;
    }
    
    console.log('📄 CURRENT PAGE DATA:');
    console.log(`   Name: ${pageData.pageName}`);
    console.log(`   ID: ${pageData.pageId}`);
    console.log(`   Company: ${pageData.company.name}`);
    console.log(`   Status: ${pageData.status}`);
    console.log(`   Connected At: ${pageData.connectedAt}`);
    console.log(`   Current Token Length: ${pageData.pageAccessToken?.length || 0}`);
    console.log(`   Current Token Preview: ${pageData.pageAccessToken?.substring(0, 30)}...`);
    console.log('');
    
    // 2. Test current token with Facebook API
    console.log('🧪 TESTING CURRENT TOKEN:');
    try {
      const currentTokenResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageData.pageId}`, {
        params: {
          access_token: pageData.pageAccessToken,
          fields: 'name,id,category,verification_status,fan_count,access_token'
        },
        timeout: 10000
      });
      
      console.log('✅ Current token works:');
      console.log(`   Page Name: ${currentTokenResponse.data.name}`);
      console.log(`   Page ID: ${currentTokenResponse.data.id}`);
      console.log(`   Category: ${currentTokenResponse.data.category}`);
      console.log(`   Verified: ${currentTokenResponse.data.verification_status}`);
      console.log(`   Followers: ${currentTokenResponse.data.fan_count}`);
      console.log(`   Token from API: ${currentTokenResponse.data.access_token ? 'Available' : 'Not available'}`);
      
    } catch (currentError) {
      console.log('❌ Current token failed:');
      console.log(`   Error: ${currentError.response?.data?.error?.message || currentError.message}`);
      console.log(`   Code: ${currentError.response?.data?.error?.code || 'N/A'}`);
    }
    console.log('');
    
    // 3. Test new token with Facebook API
    console.log('🧪 TESTING NEW TOKEN:');
    try {
      const newTokenResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageData.pageId}`, {
        params: {
          access_token: newToken,
          fields: 'name,id,category,verification_status,fan_count,access_token'
        },
        timeout: 10000
      });
      
      console.log('✅ New token works:');
      console.log(`   Page Name: ${newTokenResponse.data.name}`);
      console.log(`   Page ID: ${newTokenResponse.data.id}`);
      console.log(`   Category: ${newTokenResponse.data.category}`);
      console.log(`   Verified: ${newTokenResponse.data.verification_status}`);
      console.log(`   Followers: ${newTokenResponse.data.fan_count}`);
      console.log(`   Token from API: ${newTokenResponse.data.access_token ? 'Available' : 'Not available'}`);
      
    } catch (newError) {
      console.log('❌ New token failed:');
      console.log(`   Error: ${newError.response?.data?.error?.message || newError.message}`);
      console.log(`   Code: ${newError.response?.data?.error?.code || 'N/A'}`);
    }
    console.log('');
    
    // 4. Check token permissions
    console.log('🔐 CHECKING TOKEN PERMISSIONS:');
    try {
      const permissionsResponse = await axios.get(`https://graph.facebook.com/v18.0/me/permissions`, {
        params: {
          access_token: newToken
        },
        timeout: 10000
      });
      
      console.log('✅ Token permissions:');
      permissionsResponse.data.data.forEach(perm => {
        const status = perm.status === 'granted' ? '✅' : '❌';
        console.log(`   ${status} ${perm.permission}: ${perm.status}`);
      });
      
    } catch (permError) {
      console.log('❌ Could not check permissions:');
      console.log(`   Error: ${permError.response?.data?.error?.message || permError.message}`);
    }
    console.log('');
    
    // 5. Check webhook subscriptions with new token
    console.log('🔗 CHECKING WEBHOOK SUBSCRIPTIONS:');
    try {
      const webhookResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageData.pageId}/subscribed_apps`, {
        params: {
          access_token: newToken
        },
        timeout: 10000
      });
      
      console.log('✅ Webhook subscriptions:');
      console.log('   Response:', JSON.stringify(webhookResponse.data, null, 2));
      
    } catch (webhookError) {
      console.log('❌ Could not check webhook subscriptions:');
      console.log(`   Error: ${webhookError.response?.data?.error?.message || webhookError.message}`);
    }
    console.log('');
    
    // 6. Compare with working pages
    console.log('📊 COMPARING WITH WORKING PAGES:');
    const workingPages = await prisma.facebookPage.findMany({
      where: {
        pageId: { not: pageData.pageId },
        status: 'connected'
      },
      include: {
        company: { select: { name: true } }
      },
      take: 3
    });
    
    for (const workingPage of workingPages) {
      console.log(`\n📄 ${workingPage.pageName} (${workingPage.pageId}):`);
      console.log(`   Company: ${workingPage.company.name}`);
      console.log(`   Status: ${workingPage.status}`);
      console.log(`   Connected: ${workingPage.connectedAt}`);
      console.log(`   Token Length: ${workingPage.pageAccessToken?.length || 0}`);
      
      // Check if this page has conversations
      const conversations = await prisma.conversation.count({
        where: {
          companyId: workingPage.companyId,
          channel: 'FACEBOOK'
        }
      });
      
      console.log(`   Conversations: ${conversations}`);
      
      if (conversations > 0) {
        console.log(`   ✅ HAS ACTIVE CUSTOMERS - This page works`);
      } else {
        console.log(`   ❌ No customers - Same issue as NS Store 3`);
      }
    }
    
    console.log('');
    console.log('🎯 ANALYSIS SUMMARY:');
    console.log('   The issue appears to be related to:');
    console.log('   1. Token expiration or invalidation after reconnection');
    console.log('   2. Webhook subscription loss during reconnection');
    console.log('   3. Different token permissions or scope');
    console.log('   4. Page access token vs App access token confusion');
    
    console.log('');
    console.log('🔧 RECOMMENDED SOLUTION:');
    console.log('   1. Update the page with the new access token');
    console.log('   2. Re-subscribe the page to webhook events');
    console.log('   3. Test message delivery with the new token');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  analyzeTokenIssue();
}

module.exports = { analyzeTokenIssue };
