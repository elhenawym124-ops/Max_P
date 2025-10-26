const { getSharedPrismaClient } = require('./services/sharedDatabase');
const axios = require('axios');

async function checkReconnectedPages() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 CHECKING RECONNECTED PAGES ISSUES');
    console.log('=' * 50);
    
    // 1. Get all pages and their connection history
    const allPages = await prisma.facebookPage.findMany({
      include: {
        company: { select: { name: true, id: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log(`📄 Found ${allPages.length} Facebook pages:`);
    console.log('');
    
    for (const page of allPages) {
      console.log(`📄 ${page.pageName} (${page.pageId}):`);
      console.log(`   Company: ${page.company.name}`);
      console.log(`   Status: ${page.status}`);
      console.log(`   Connected: ${page.connectedAt}`);
      console.log(`   Updated: ${page.updatedAt}`);
      console.log(`   Token Length: ${page.pageAccessToken?.length || 0}`);
      
      // Check if this page has conversations
      const conversations = await prisma.conversation.count({
        where: {
          companyId: page.companyId,
          channel: 'FACEBOOK'
        }
      });
      
      console.log(`   Conversations: ${conversations}`);
      
      // Check if token is working
      if (page.pageAccessToken) {
        try {
          const tokenResponse = await axios.get(`https://graph.facebook.com/v18.0/${page.pageId}`, {
            params: {
              access_token: page.pageAccessToken,
              fields: 'name,id'
            },
            timeout: 5000
          });
          
          console.log(`   Token Status: ✅ Working`);
          
        } catch (tokenError) {
          console.log(`   Token Status: ❌ Failed - ${tokenError.response?.data?.error?.message || tokenError.message}`);
        }
      } else {
        console.log(`   Token Status: ❌ No token`);
      }
      
      // Determine if this page has the reconnection issue
      if (conversations === 0 && page.status === 'connected') {
        console.log(`   Issue: ❌ NO CONVERSATIONS - Reconnection problem`);
      } else if (conversations > 0) {
        console.log(`   Issue: ✅ WORKING - Has conversations`);
      } else {
        console.log(`   Issue: ❓ UNKNOWN - Check status`);
      }
      
      console.log('');
    }
    
    // 2. Analyze the pattern
    console.log('📊 ANALYSIS:');
    const pagesWithIssues = allPages.filter(page => {
      return page.status === 'connected' && 
             page.pageAccessToken && 
             page.pageAccessToken.length > 0;
    });
    
    let pagesWithConversations = 0;
    let pagesWithoutConversations = 0;
    
    for (const page of pagesWithIssues) {
      const conversations = await prisma.conversation.count({
        where: {
          companyId: page.companyId,
          channel: 'FACEBOOK'
        }
      });
      
      if (conversations > 0) {
        pagesWithConversations++;
      } else {
        pagesWithoutConversations++;
      }
    }
    
    console.log(`   Total connected pages: ${pagesWithIssues.length}`);
    console.log(`   Pages with conversations: ${pagesWithConversations}`);
    console.log(`   Pages without conversations: ${pagesWithoutConversations}`);
    console.log('');
    
    if (pagesWithoutConversations > 0) {
      console.log('🎯 RECONNECTION ISSUE CONFIRMED:');
      console.log('   Several pages are connected but have no conversations');
      console.log('   This suggests a systematic issue with reconnected pages');
      console.log('');
      console.log('🔧 POSSIBLE CAUSES:');
      console.log('   1. Webhook subscriptions lost during reconnection');
      console.log('   2. Token permissions changed after reconnection');
      console.log('   3. Page access token vs App access token confusion');
      console.log('   4. Facebook webhook configuration reset');
      console.log('');
      console.log('💡 SOLUTIONS:');
      console.log('   1. Re-subscribe all pages to webhook events');
      console.log('   2. Verify webhook URL is accessible from Facebook');
      console.log('   3. Check that all pages have correct permissions');
      console.log('   4. Test webhook with a simple message');
    } else {
      console.log('✅ No reconnection issues detected');
      console.log('   All connected pages have conversations');
    }
    
  } catch (error) {
    console.error('❌ Error checking reconnected pages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  checkReconnectedPages();
}

module.exports = { checkReconnectedPages };
