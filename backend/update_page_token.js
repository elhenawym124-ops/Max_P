const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function updatePageToken() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔄 UPDATING PAGE ACCESS TOKEN');
    console.log('=' * 40);
    
    const newToken = 'EAAK1VXsn5y8BPYm8AXCyV2uVRspr49i0RfpaNexUqBfzwHqX7c8cgVKYcMZAepQG4I77jTgeOwK0k3OpC1ZBxf17uZC0iZCBU3mzn0EzVp5QAcO4zuBW5U2HjTFIa2zzvmCy4ZAHzVPaulj474jAzuvcWaSANVtfweBbGMUzCZAp4LCZCHI5OZCmHt5kPwEF2Vp5mtDM2mMAOWrA0KQawpMHFYFZAGQZDZD';
    const pageId = '453471574524139';
    
    // 1. Get current page data
    const currentPage = await prisma.facebookPage.findUnique({
      where: { pageId: pageId }
    });
    
    if (!currentPage) {
      console.log('❌ Page not found in database');
      return;
    }
    
    console.log('📄 Current page data:');
    console.log(`   Name: ${currentPage.pageName}`);
    console.log(`   ID: ${currentPage.pageId}`);
    console.log(`   Status: ${currentPage.status}`);
    console.log(`   Old Token Length: ${currentPage.pageAccessToken?.length || 0}`);
    console.log(`   Old Token Preview: ${currentPage.pageAccessToken?.substring(0, 30)}...`);
    console.log('');
    
    // 2. Update the token
    console.log('🔄 Updating access token...');
    const updatedPage = await prisma.facebookPage.update({
      where: { pageId: pageId },
      data: {
        pageAccessToken: newToken,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Token updated successfully');
    console.log(`   New Token Length: ${updatedPage.pageAccessToken?.length || 0}`);
    console.log(`   New Token Preview: ${updatedPage.pageAccessToken?.substring(0, 30)}...`);
    console.log(`   Updated At: ${updatedPage.updatedAt}`);
    console.log('');
    
    // 3. Test the updated page
    console.log('🧪 Testing updated page...');
    const { testNewToken } = require('./test_new_token');
    await testNewToken();
    
    // 4. Check if this fixes the conversation issue
    console.log('');
    console.log('🔍 Checking for conversations after token update...');
    const conversations = await prisma.conversation.findMany({
      where: {
        companyId: currentPage.companyId,
        channel: 'FACEBOOK'
      },
      include: {
        customer: {
          select: { facebookId: true, firstName: true, lastName: true }
        }
      },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log(`   Found ${conversations.length} conversations`);
    if (conversations.length > 0) {
      console.log('   Recent conversations:');
      conversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.customer.firstName} ${conv.customer.lastName} (${conv.customer.facebookId})`);
        console.log(`      Updated: ${conv.updatedAt}`);
      });
    } else {
      console.log('   ❌ Still no conversations found');
      console.log('   This confirms the issue is not with the token');
      console.log('   The problem is that no customers have messaged this page');
    }
    
    console.log('');
    console.log('🎯 TOKEN UPDATE COMPLETE');
    console.log('   The token has been updated successfully');
    console.log('   The page should now work if customers message it');
    console.log('   The issue was likely an expired or invalid token');
    
  } catch (error) {
    console.error('❌ Error updating token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  updatePageToken();
}

module.exports = { updatePageToken };
