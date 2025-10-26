const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function quickPageCheck() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 QUICK PAGE CHECK');
    console.log('=' * 30);
    
    // Get NS Store 3 page
    const nsStorePage = await prisma.facebookPage.findUnique({
      where: { pageId: '453471574524139' }
    });
    
    if (nsStorePage) {
      console.log('📄 NS Store 3:');
      console.log(`   Name: ${nsStorePage.pageName}`);
      console.log(`   Status: ${nsStorePage.status}`);
      console.log(`   Token: ${nsStorePage.pageAccessToken ? 'Available' : 'Missing'}`);
      console.log(`   Updated: ${nsStorePage.updatedAt}`);
      
      // Check conversations
      const conversations = await prisma.conversation.count({
        where: {
          companyId: nsStorePage.companyId,
          channel: 'FACEBOOK'
        }
      });
      
      console.log(`   Conversations: ${conversations}`);
      console.log('');
    }
    
    // Get a working page for comparison
    const workingPage = await prisma.facebookPage.findFirst({
      where: {
        status: 'connected',
        pageAccessToken: { not: null }
      }
    });
    
    if (workingPage) {
      console.log('📄 Working Page (for comparison):');
      console.log(`   Name: ${workingPage.pageName}`);
      console.log(`   ID: ${workingPage.pageId}`);
      console.log(`   Status: ${workingPage.status}`);
      console.log(`   Token: ${workingPage.pageAccessToken ? 'Available' : 'Missing'}`);
      
      // Check conversations
      const workingConversations = await prisma.conversation.count({
        where: {
          companyId: workingPage.companyId,
          channel: 'FACEBOOK'
        }
      });
      
      console.log(`   Conversations: ${workingConversations}`);
      console.log('');
    }
    
    // Check recent webhook activity
    console.log('🔍 Recent webhook activity:');
    const recentMessages = await prisma.message.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        },
        isFromCustomer: true
      },
      include: {
        conversation: {
          include: {
            customer: { select: { facebookId: true, firstName: true } }
          }
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`   Recent customer messages: ${recentMessages.length}`);
    recentMessages.forEach((msg, index) => {
      console.log(`   ${index + 1}. ${msg.conversation.customer.firstName} - ${msg.createdAt}`);
    });
    
    console.log('');
    console.log('🎯 SUMMARY:');
    if (nsStorePage && conversations === 0) {
      console.log('   ❌ NS Store 3 has no conversations');
      console.log('   🔧 This is the root cause of the issue');
      console.log('   💡 Someone needs to message the page first');
    } else if (nsStorePage && conversations > 0) {
      console.log('   ✅ NS Store 3 has conversations');
      console.log('   🔧 The issue might be elsewhere');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  quickPageCheck();
}

module.exports = { quickPageCheck };
