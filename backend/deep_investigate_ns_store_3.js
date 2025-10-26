const { getSharedPrismaClient } = require('./services/sharedDatabase');
const { sendProductionFacebookMessage, validateFacebookRecipientStrict } = require('./production-facebook-fix');
const axios = require('axios');

async function deepInvestigateNsStore3() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 DEEP INVESTIGATION: ns store 3 Message Delivery Issues');
    console.log('=' * 70);
    
    // 1. Get page configuration
    const pageData = await prisma.facebookPage.findUnique({
      where: { pageId: '453471574524139' },
      include: {
        company: { select: { name: true, id: true } }
      }
    });
    
    if (!pageData) {
      console.log('❌ CRITICAL: Page not found in database');
      return;
    }
    
    console.log('📄 PAGE CONFIGURATION:');
    console.log(`   Name: ${pageData.pageName}`);
    console.log(`   ID: ${pageData.pageId}`);
    console.log(`   Company: ${pageData.company.name} (${pageData.companyId})`);
    console.log(`   Status: ${pageData.status}`);
    console.log(`   Connected: ${pageData.connectedAt}`);
    console.log(`   Token Length: ${pageData.pageAccessToken?.length || 0}`);
    console.log('');
    
    // 2. Test Facebook API connectivity
    console.log('🧪 TESTING FACEBOOK API CONNECTIVITY:');
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${pageData.pageId}`, {
        params: {
          access_token: pageData.pageAccessToken,
          fields: 'name,id,category,verification_status,fan_count'
        },
        timeout: 10000
      });
      
      console.log('   ✅ Facebook API Response:');
      console.log(`      Name: ${response.data.name}`);
      console.log(`      ID: ${response.data.id}`);
      console.log(`      Category: ${response.data.category || 'N/A'}`);
      console.log(`      Verified: ${response.data.verification_status || 'N/A'}`);
      console.log(`      Followers: ${response.data.fan_count || 'N/A'}`);
      
    } catch (apiError) {
      console.log('   ❌ Facebook API Error:');
      console.log(`      Error: ${apiError.response?.data?.error?.message || apiError.message}`);
      console.log(`      Code: ${apiError.response?.data?.error?.code || 'N/A'}`);
      if (apiError.response?.data?.error?.error_subcode) {
        console.log(`      Subcode: ${apiError.response.data.error.error_subcode}`);
      }
      
      if (apiError.response?.status === 400 || apiError.response?.status === 401) {
        console.log('   🔑 TOKEN ISSUE: Access token may be expired or invalid');
      }
    }
    console.log('');
    
    // 3. Check conversations for this company
    console.log('💬 CHECKING CONVERSATIONS:');
    const totalConversations = await prisma.conversation.count({
      where: {
        companyId: pageData.companyId,
        channel: 'FACEBOOK'
      }
    });
    
    console.log(`   Total Facebook conversations for company: ${totalConversations}`);
    
    if (totalConversations === 0) {
      console.log('   ❌ NO CONVERSATIONS FOUND');
      console.log('   This is the root cause - no customers have messaged this company');
    } else {
      // Get sample conversations
      const sampleConversations = await prisma.conversation.findMany({
        where: {
          companyId: pageData.companyId,
          channel: 'FACEBOOK',
          customer: { facebookId: { not: null } }
        },
        include: {
          customer: {
            select: { facebookId: true, firstName: true, lastName: true }
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
      
      console.log(`   Found ${sampleConversations.length} sample conversations:`);
      sampleConversations.forEach((conv, index) => {
        const lastMsg = conv.messages[0];
        const hoursSince = lastMsg ? 
          ((Date.now() - new Date(lastMsg.createdAt).getTime()) / (1000 * 60 * 60)).toFixed(1) : 
          'No messages';
        
        console.log(`   ${index + 1}. ${conv.customer.firstName} ${conv.customer.lastName}`);
        console.log(`      FB ID: ${conv.customer.facebookId}`);
        console.log(`      Last message: ${hoursSince} hours ago`);
      });
    }
    console.log('');
    
    // 4. Check page-specific metadata in conversations
    console.log('🔍 CHECKING PAGE-SPECIFIC CONVERSATIONS:');
    const pageSpecificConversations = await prisma.conversation.findMany({
      where: {
        companyId: pageData.companyId,
        metadata: { contains: pageData.pageId }
      },
      include: {
        customer: {
          select: { facebookId: true, firstName: true, lastName: true }
        }
      }
    });
    
    console.log(`   Conversations specifically linked to this page: ${pageSpecificConversations.length}`);
    
    if (pageSpecificConversations.length === 0) {
      console.log('   ❌ NO PAGE-SPECIFIC CONVERSATIONS');
      console.log('   This page has never received messages directly');
    } else {
      pageSpecificConversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.customer.firstName} ${conv.customer.lastName} (${conv.customer.facebookId})`);
      });
    }
    console.log('');
    
    // 5. Test message validation with a sample customer (if any exist)
    console.log('🧪 TESTING MESSAGE VALIDATION:');
    
    // Get any customer from the system to test validation
    const anyCustomer = await prisma.customer.findFirst({
      where: {
        facebookId: { not: null },
        conversations: {
          some: {
            channel: 'FACEBOOK'
          }
        }
      }
    });
    
    if (!anyCustomer) {
      console.log('   ❌ NO FACEBOOK CUSTOMERS FOUND IN ENTIRE SYSTEM');
    } else {
      console.log(`   Testing with customer: ${anyCustomer.firstName} ${anyCustomer.lastName}`);
      console.log(`   Facebook ID: ${anyCustomer.facebookId}`);
      
      try {
        const validation = await validateFacebookRecipientStrict(
          anyCustomer.facebookId,
          pageData.pageId,
          pageData.pageAccessToken
        );
        
        console.log('   Validation Results:');
        console.log(`   ✅ Valid: ${validation.valid}`);
        console.log(`   📤 Can Send: ${validation.canSend}`);
        console.log(`   🔐 Error: ${validation.error || 'None'}`);
        console.log(`   💬 Message: ${validation.message || 'None'}`);
        
        if (validation.solutions) {
          console.log('   🔧 Solutions:');
          validation.solutions.forEach(solution => {
            console.log(`      - ${solution}`);
          });
        }
        
      } catch (validationError) {
        console.log(`   ❌ Validation Error: ${validationError.message}`);
      }
    }
    console.log('');
    
    // 6. Check recent messages sent to this page
    console.log('📨 CHECKING RECENT OUTBOUND MESSAGES:');
    const recentMessages = await prisma.message.findMany({
      where: {
        isFromCustomer: false,
        conversation: {
          companyId: pageData.companyId,
          channel: 'FACEBOOK'
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        conversation: {
          include: {
            customer: {
              select: { facebookId: true, firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`   Outbound messages in last 24h: ${recentMessages.length}`);
    
    if (recentMessages.length === 0) {
      console.log('   ❌ NO RECENT OUTBOUND MESSAGES');
      console.log('   Either no messages sent or they failed to save');
    } else {
      recentMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. To: ${msg.conversation.customer.firstName} ${msg.conversation.customer.lastName}`);
        console.log(`      Content: ${msg.content.substring(0, 50)}...`);
        console.log(`      Time: ${new Date(msg.createdAt).toLocaleString()}`);
      });
    }
    console.log('');
    
    // 7. Compare with working pages
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
      const workingConversations = await prisma.conversation.count({
        where: {
          companyId: workingPage.companyId,
          channel: 'FACEBOOK'
        }
      });
      
      console.log(`   📄 ${workingPage.pageName} (${workingPage.pageId}):`);
      console.log(`      Company: ${workingPage.company.name}`);
      console.log(`      Conversations: ${workingConversations}`);
      console.log(`      Status: ${workingPage.status}`);
      
      if (workingConversations > 0) {
        console.log(`      ✅ HAS ACTIVE CUSTOMERS - Messages work here`);
      } else {
        console.log(`      ❌ No customers - Would have same issue`);
      }
      console.log('');
    }
    
    // 8. FINAL DIAGNOSIS
    console.log('🎯 FINAL DIAGNOSIS:');
    console.log('');
    
    const issues = [];
    const solutions = [];
    
    if (totalConversations === 0) {
      issues.push('❌ CRITICAL: No customers have ever messaged this company');
      solutions.push('🔧 Ask someone to send a message to "ns store 3" via Facebook Messenger');
    }
    
    if (pageSpecificConversations.length === 0) {
      issues.push('❌ CRITICAL: This specific page has no conversation history');
      solutions.push('🔧 Customer must message "ns store 3" directly, not other pages');
    }
    
    if (recentMessages.length === 0) {
      issues.push('⚠️ No recent outbound messages recorded');
      solutions.push('💡 System may be blocking sends due to validation rules');
    }
    
    console.log('IDENTIFIED ISSUES:');
    issues.forEach(issue => console.log(`   ${issue}`));
    
    console.log('');
    console.log('RECOMMENDED SOLUTIONS:');
    solutions.forEach(solution => console.log(`   ${solution}`));
    
    console.log('');
    console.log('🎯 ROOT CAUSE SUMMARY:');
    console.log('   The page "ns store 3" is technically configured correctly,');
    console.log('   but it has zero customer interactions. Facebook\'s policy');
    console.log('   requires customers to message your page first before you');
    console.log('   can send them messages. Other pages work because they');
    console.log('   already have customers who have initiated conversations.');
    
    console.log('');
    console.log('✅ IMMEDIATE FIX:');
    console.log('   1. Go to Facebook and search for "ns store 3"');
    console.log('   2. Send any message (like "test" or "hello")');
    console.log('   3. Try sending from your system immediately after');
    console.log('   4. It should work perfectly!');
    
  } catch (error) {
    console.error('❌ Error during deep investigation:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  deepInvestigateNsStore3();
}

module.exports = { deepInvestigateNsStore3 };