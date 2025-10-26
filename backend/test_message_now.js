const { getSharedPrismaClient } = require('./services/sharedDatabase');
const { sendProductionFacebookMessage } = require('./production-facebook-fix');

async function testMessageNow() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🧪 TESTING MESSAGE DELIVERY NOW');
    console.log('=' * 40);
    
    // Get page data
    const pageData = await prisma.facebookPage.findUnique({
      where: { pageId: '453471574524139' }
    });
    
    if (!pageData) {
      console.log('❌ Page not found');
      return;
    }
    
    console.log('📄 Page Info:');
    console.log(`   Name: ${pageData.pageName}`);
    console.log(`   Status: ${pageData.status}`);
    console.log(`   Token: ${pageData.pageAccessToken ? 'Available' : 'Missing'}`);
    console.log(`   Updated: ${pageData.updatedAt}`);
    console.log('');
    
    // Get any customer to test with
    const testCustomer = await prisma.customer.findFirst({
      where: { facebookId: { not: null } }
    });
    
    if (!testCustomer) {
      console.log('❌ No customers found');
      return;
    }
    
    console.log('👤 Test Customer:');
    console.log(`   Name: ${testCustomer.firstName} ${testCustomer.lastName}`);
    console.log(`   Facebook ID: ${testCustomer.facebookId}`);
    console.log('');
    
    // Test sending message
    console.log('📤 Testing message send...');
    
    try {
      const result = await sendProductionFacebookMessage(
        testCustomer.facebookId,
        `🧪 Test message - ${new Date().toLocaleString()}`,
        pageData.pageId,
        pageData.pageAccessToken
      );
      
      console.log('📊 Send Result:');
      console.log(`   Success: ${result.success}`);
      console.log(`   Blocked: ${result.blocked}`);
      console.log(`   Error: ${result.error || 'None'}`);
      console.log(`   Message: ${result.message || 'None'}`);
      
      if (result.solutions) {
        console.log('   Solutions:');
        result.solutions.forEach(solution => {
          console.log(`     - ${solution}`);
        });
      }
      
    } catch (sendError) {
      console.log('❌ Send failed:');
      console.log(`   Error: ${sendError.message}`);
    }
    
    console.log('');
    console.log('🔍 Checking for conversations...');
    
    const conversations = await prisma.conversation.count({
      where: {
        companyId: pageData.companyId,
        channel: 'FACEBOOK'
      }
    });
    
    console.log(`   Total conversations: ${conversations}`);
    
    if (conversations === 0) {
      console.log('   ❌ Still no conversations');
      console.log('   💡 The issue is that no customers have messaged this page');
      console.log('   💡 Facebook requires customers to message first');
    } else {
      console.log('   ✅ Conversations found!');
    }
    
    console.log('');
    console.log('🎯 ANSWER TO YOUR QUESTION:');
    console.log('   Will messages reach the page now?');
    
    if (conversations === 0) {
      console.log('   ❌ NO - No customers have messaged the page');
      console.log('   🔧 Someone needs to send a message to "ns store 3" first');
      console.log('   🔧 Then you can send replies from the system');
    } else {
      console.log('   ✅ YES - Messages will work now');
      console.log('   🔧 The page has active conversations');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testMessageNow();
}

module.exports = { testMessageNow };
