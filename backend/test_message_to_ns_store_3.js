const { getSharedPrismaClient } = require('./services/sharedDatabase');
const { sendProductionFacebookMessage } = require('./production-facebook-fix');

async function testMessageToNsStore3() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🧪 TESTING MESSAGE TO NS STORE 3');
    console.log('=' * 50);
    
    // 1. Get page data
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
    
    console.log('📄 Page Info:');
    console.log(`   Name: ${pageData.pageName}`);
    console.log(`   ID: ${pageData.pageId}`);
    console.log(`   Company: ${pageData.company.name}`);
    console.log(`   Status: ${pageData.status}`);
    console.log('');
    
    // 2. Get any customer from the system to test with
    const testCustomer = await prisma.customer.findFirst({
      where: {
        facebookId: { not: null }
      }
    });
    
    if (!testCustomer) {
      console.log('❌ No customers found in system');
      return;
    }
    
    console.log('👤 Test Customer:');
    console.log(`   Name: ${testCustomer.firstName} ${testCustomer.lastName}`);
    console.log(`   Facebook ID: ${testCustomer.facebookId}`);
    console.log('');
    
    // 3. Test sending message
    console.log('📤 Sending test message...');
    
    const testMessage = {
      recipient: { id: testCustomer.facebookId },
      message: { 
        text: `🧪 Test message to NS Store 3 - ${new Date().toLocaleString()}`
      }
    };
    
    try {
      const result = await sendProductionFacebookMessage(
        testCustomer.facebookId,
        testMessage.message.text,
        pageData.pageId,
        pageData.pageAccessToken
      );
      
      console.log('✅ Message sent successfully!');
      console.log('📊 Result:', JSON.stringify(result, null, 2));
      
    } catch (sendError) {
      console.log('❌ Failed to send message:');
      console.log('   Error:', sendError.message);
      console.log('   Details:', sendError.response?.data || 'No additional details');
    }
    
    // 4. Check if conversation was created
    console.log('');
    console.log('🔍 Checking for new conversation...');
    
    const newConversation = await prisma.conversation.findFirst({
      where: {
        customerId: testCustomer.id,
        companyId: pageData.companyId,
        channel: 'FACEBOOK'
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (newConversation) {
      console.log('✅ Conversation found:');
      console.log(`   ID: ${newConversation.id}`);
      console.log(`   Created: ${newConversation.createdAt}`);
      console.log(`   Messages: ${newConversation.messages.length}`);
      
      if (newConversation.messages.length > 0) {
        const lastMessage = newConversation.messages[0];
        console.log(`   Last message: ${lastMessage.content}`);
        console.log(`   From customer: ${lastMessage.isFromCustomer}`);
        console.log(`   Time: ${lastMessage.createdAt}`);
      }
    } else {
      console.log('❌ No conversation found');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testMessageToNsStore3();
}

module.exports = { testMessageToNsStore3 };
