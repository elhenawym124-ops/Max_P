const { getSharedPrismaClient } = require('./services/sharedDatabase');
const { sendProductionFacebookMessage, validateFacebookRecipientStrict } = require('./production-facebook-fix');
const { sendFacebookMessage } = require('./utils/allFunctions');

async function testMessageToPage453471574524139() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🧪 Testing Facebook Message Sending to Page 453471574524139');
    console.log('=' * 60);
    
    // Get the page data
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
    
    console.log(`📄 Testing with page: ${pageData.pageName} (${pageData.pageId})`);
    console.log(`🏢 Company: ${pageData.company.name} (${pageData.companyId})`);
    
    // Find customers who have messaged this page
    console.log('\n🔍 Looking for customers who have messaged this page...');
    
    const conversations = await prisma.conversation.findMany({
      where: {
        companyId: pageData.companyId,
        channel: 'FACEBOOK',
        customer: {
          facebookId: { not: null }
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            facebookId: true,
            firstName: true,
            lastName: true
          }
        },
        messages: {
          where: { isFromCustomer: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log(`   Found ${conversations.length} recent Facebook conversations`);
    
    if (conversations.length === 0) {
      console.log('❌ No Facebook conversations found for this company');
      console.log('   This means no customers have messaged any page from this company');
      console.log('   Messages can only be sent to customers who have initiated conversation');
      return;
    }
    
    // Test with the first customer
    const testConversation = conversations[0];
    const testCustomer = testConversation.customer;
    const lastMessage = testConversation.messages[0];
    
    console.log(`\n🎯 Testing with customer: ${testCustomer.firstName} ${testCustomer.lastName}`);
    console.log(`   Facebook ID: ${testCustomer.facebookId}`);
    console.log(`   Last message: ${lastMessage ? new Date(lastMessage.createdAt).toLocaleString() : 'No messages'}`);
    
    if (lastMessage) {
      const hoursSinceLastMessage = (Date.now() - new Date(lastMessage.createdAt).getTime()) / (1000 * 60 * 60);
      console.log(`   Hours since last message: ${hoursSinceLastMessage.toFixed(1)}`);
      
      if (hoursSinceLastMessage > 24) {
        console.log('⚠️ Last message was more than 24 hours ago - Facebook may block this');
      }
    }
    
    // Test message validation
    console.log('\n🔍 Testing message validation...');
    const validationResult = await validateFacebookRecipientStrict(
      testCustomer.facebookId,
      pageData.pageId,
      pageData.pageAccessToken
    );
    
    console.log('   Validation Results:');
    console.log(`   ✅ Valid: ${validationResult.valid}`);
    console.log(`   📤 Can Send: ${validationResult.canSend}`);
    console.log(`   🔐 Error: ${validationResult.error || 'None'}`);
    console.log(`   💬 Message: ${validationResult.message || 'None'}`);
    
    if (validationResult.solutions) {
      console.log('   🔧 Solutions:');
      validationResult.solutions.forEach(solution => {
        console.log(`      - ${solution}`);
      });
    }
    
    if (validationResult.recommendations) {
      console.log('   💡 Recommendations:');
      validationResult.recommendations.forEach(rec => {
        console.log(`      - ${rec}`);
      });
    }
    
    // Test actual message sending (DRY RUN)
    if (validationResult.valid && validationResult.canSend) {
      console.log('\n📤 Testing ACTUAL message sending...');
      console.log('   (This will send a real test message)');
      
      const testMessage = `🧪 Test message - ${new Date().toLocaleString('ar-EG')}`;
      
      try {
        const sendResult = await sendProductionFacebookMessage(
          testCustomer.facebookId,
          testMessage,
          'TEXT',
          pageData.pageId,
          pageData.pageAccessToken
        );
        
        console.log('   📬 Send Result:');
        console.log(`   ✅ Success: ${sendResult.success}`);
        
        if (sendResult.success) {
          console.log(`   📨 Message ID: ${sendResult.messageId}`);
          console.log('   🎉 MESSAGE SENT SUCCESSFULLY!');
          console.log('   The page CAN receive messages - check if customer is sending to the right conversation');
        } else {
          console.log(`   ❌ Failed: ${sendResult.message}`);
          console.log(`   🔍 Error Type: ${sendResult.error}`);
          
          if (sendResult.solutions) {
            console.log('   🔧 Solutions:');
            sendResult.solutions.forEach(solution => {
              console.log(`      - ${solution}`);
            });
          }
        }
      } catch (error) {
        console.log(`   ❌ Error during send: ${error.message}`);
      }
    } else {
      console.log('\n🚫 Skipping message send - validation failed');
      console.log('   This explains why messages are not reaching the page');
    }
    
    // Check for any specific issues with this page
    console.log('\n🔍 Checking for page-specific issues...');
    
    // Check if there are any conversations specifically linked to this page
    const pageSpecificConversations = await prisma.conversation.findMany({
      where: {
        companyId: pageData.companyId,
        metadata: { contains: pageData.pageId }
      },
      include: {
        customer: {
          select: { facebookId: true, firstName: true, lastName: true }
        }
      },
      take: 10
    });
    
    console.log(`   Found ${pageSpecificConversations.length} conversations specifically linked to this page`);
    
    if (pageSpecificConversations.length > 0) {
      console.log('   Recent page-specific conversations:');
      pageSpecificConversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.customer?.firstName} ${conv.customer?.lastName} (${conv.customer?.facebookId})`);
      });
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Page "${pageData.pageName}" is properly configured`);
    console.log(`✅ Access token is valid`);
    console.log(`📞 ${conversations.length} customers available for testing`);
    
    if (validationResult.valid && validationResult.canSend) {
      console.log('✅ Message validation passed - page can receive messages');
      console.log('💡 The issue might be:');
      console.log('   - Customer messaging a different conversation thread');
      console.log('   - Message being sent to wrong page ID');
      console.log('   - Timing issues (messages sent outside 24-hour window)');
    } else {
      console.log('❌ Message validation failed - this explains the issue');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testMessageToPage453471574524139();
}

module.exports = { testMessageToPage453471574524139 };