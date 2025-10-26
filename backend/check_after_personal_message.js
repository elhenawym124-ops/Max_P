const { getSharedPrismaClient } = require('./services/sharedDatabase');
const axios = require('axios');

async function checkAfterPersonalMessage() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 CHECKING NS STORE 3 AFTER PERSONAL MESSAGE SENT');
    console.log('=' * 60);
    
    // Get page data
    const pageData = await prisma.facebookPage.findUnique({
      where: { pageId: '453471574524139' },
      include: {
        company: { select: { name: true, id: true } }
      }
    });
    
    console.log('📄 PAGE STATUS:');
    console.log(`   Name: ${pageData.pageName}`);
    console.log(`   Company: ${pageData.company.name}`);
    console.log(`   Status: ${pageData.status}`);
    console.log(`   Token Length: ${pageData.pageAccessToken?.length}`);
    console.log('');
    
    // Check for NEW conversations (after the personal message)
    console.log('💬 CHECKING FOR NEW CONVERSATIONS:');
    const recentConversations = await prisma.conversation.findMany({
      where: {
        companyId: pageData.companyId,
        channel: 'FACEBOOK',
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
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
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`   New conversations in last 2 hours: ${recentConversations.length}`);
    
    if (recentConversations.length === 0) {
      console.log('   ❌ NO NEW CONVERSATIONS DETECTED');
      console.log('   Your message may not have reached the webhook system');
    } else {
      console.log('   ✅ NEW CONVERSATIONS FOUND:');
      recentConversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. Customer: ${conv.customer.firstName} ${conv.customer.lastName}`);
        console.log(`      Facebook ID: ${conv.customer.facebookId}`);
        console.log(`      Created: ${new Date(conv.createdAt).toLocaleString()}`);
        console.log(`      Messages: ${conv.messages.length}`);
        if (conv.messages.length > 0) {
          const lastMsg = conv.messages[0];
          console.log(`      Last message: "${lastMsg.content.substring(0, 50)}..."`);
          console.log(`      From customer: ${lastMsg.isFromCustomer}`);
        }
        console.log('');
      });
    }
    
    // Check recent messages in general
    console.log('📨 CHECKING RECENT MESSAGES:');
    const recentMessages = await prisma.message.findMany({
      where: {
        conversation: {
          companyId: pageData.companyId,
          channel: 'FACEBOOK'
        },
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
        }
      },
      include: {
        conversation: {
          include: {
            customer: {
              select: { firstName: true, lastName: true, facebookId: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`   Recent messages in last 2 hours: ${recentMessages.length}`);
    
    if (recentMessages.length === 0) {
      console.log('   ❌ NO RECENT MESSAGES');
      console.log('   This indicates the webhook is not receiving your message');
    } else {
      console.log('   ✅ RECENT MESSAGES FOUND:');
      recentMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.isFromCustomer ? 'FROM' : 'TO'}: ${msg.conversation.customer.firstName}`);
        console.log(`      Content: "${msg.content.substring(0, 50)}..."`);
        console.log(`      Time: ${new Date(msg.createdAt).toLocaleString()}`);
        console.log(`      FB ID: ${msg.conversation.customer.facebookId}`);
        console.log('');
      });
    }
    
    // Check webhook configuration
    console.log('🔗 CHECKING WEBHOOK CONFIGURATION:');
    console.log('   Expected webhook URL: https://www.mokhtarelhenawy.online/webhook');
    console.log('   Page ID that should receive webhooks: 453471574524139');
    console.log('');
    
    // Test if page token can receive webhook subscriptions
    console.log('🧪 TESTING PAGE WEBHOOK SUBSCRIPTIONS:');
    try {
      const subscriptionsResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageData.pageId}/subscribed_apps`, {
        params: {
          access_token: pageData.pageAccessToken
        },
        timeout: 10000
      });
      
      console.log('   ✅ Webhook Subscriptions:');
      if (subscriptionsResponse.data.data && subscriptionsResponse.data.data.length > 0) {
        subscriptionsResponse.data.data.forEach((app, index) => {
          console.log(`   ${index + 1}. App: ${app.name || app.id}`);
          console.log(`      ID: ${app.id}`);
          console.log(`      Category: ${app.category || 'N/A'}`);
        });
      } else {
        console.log('   ❌ NO WEBHOOK SUBSCRIPTIONS FOUND');
        console.log('   This means the page is not subscribed to your app\'s webhooks');
      }
      
    } catch (webhookError) {
      console.log('   ❌ Error checking webhook subscriptions:');
      console.log(`      ${webhookError.response?.data?.error?.message || webhookError.message}`);
    }
    console.log('');
    
    // Check if there are any customers with your personal Facebook ID pattern
    console.log('🔍 CHECKING FOR YOUR PERSONAL FACEBOOK ACCOUNT:');
    const allCustomers = await prisma.customer.findMany({
      where: {
        facebookId: { not: null },
        conversations: {
          some: {
            companyId: pageData.companyId
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`   Total customers who messaged this company: ${allCustomers.length}`);
    if (allCustomers.length > 0) {
      console.log('   Recent customers:');
      allCustomers.forEach((customer, index) => {
        console.log(`   ${index + 1}. ${customer.firstName} ${customer.lastName}`);
        console.log(`      Facebook ID: ${customer.facebookId}`);
        console.log(`      Created: ${new Date(customer.createdAt).toLocaleString()}`);
      });
    }
    console.log('');
    
    // DIAGNOSIS
    console.log('🎯 DIAGNOSIS:');
    console.log('');
    
    if (recentConversations.length === 0 && recentMessages.length === 0) {
      console.log('❌ WEBHOOK ISSUE DETECTED:');
      console.log('   Your personal message did not reach the webhook system.');
      console.log('   This indicates one of these problems:');
      console.log('');
      console.log('   🔧 POSSIBLE CAUSES:');
      console.log('   1. Page is not subscribed to your app\'s webhooks');
      console.log('   2. Webhook URL is incorrect or not responding');
      console.log('   3. Message was sent to page but webhook failed');
      console.log('   4. App permissions are insufficient');
      console.log('');
      console.log('   ✅ SOLUTIONS:');
      console.log('   1. Check Facebook Developer Console');
      console.log('   2. Verify webhook subscription for page 453471574524139');
      console.log('   3. Test webhook URL: https://www.mokhtarelhenawy.online/webhook');
      console.log('   4. Check app permissions: pages_messaging, pages_read_engagement');
      console.log('   5. Re-subscribe the page to webhooks if needed');
      
    } else {
      console.log('✅ WEBHOOK IS WORKING:');
      console.log('   Messages are being received by the system.');
      console.log('   Your personal message should have created a conversation.');
      console.log('   Check the conversation list in the admin panel.');
    }
    
    console.log('');
    console.log('🔍 NEXT STEPS:');
    console.log('   1. Check the admin panel for new conversations');
    console.log('   2. Look for your name in the customer list');
    console.log('   3. If not found, verify webhook configuration');
    console.log('   4. Test sending another message and check logs');
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  checkAfterPersonalMessage();
}

module.exports = { checkAfterPersonalMessage };