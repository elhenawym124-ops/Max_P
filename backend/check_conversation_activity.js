const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function checkActiveConversationsByCompany() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('📊 Checking Active Facebook Conversations by Company/Page');
    console.log('=' * 60);
    
    // Get all Facebook pages with their conversation counts
    const pages = await prisma.facebookPage.findMany({
      include: {
        company: {
          select: { name: true, id: true }
        }
      },
      orderBy: { pageName: 'asc' }
    });
    
    console.log(`📄 Found ${pages.length} Facebook pages total`);
    console.log('\n🔍 Checking conversation activity for each page...\n');
    
    const pageStats = [];
    
    for (const page of pages) {
      // Count conversations for this company
      const conversationCount = await prisma.conversation.count({
        where: {
          companyId: page.companyId,
          channel: 'FACEBOOK',
          customer: {
            facebookId: { not: null }
          }
        }
      });
      
      // Get recent customer messages
      const recentMessages = await prisma.message.count({
        where: {
          isFromCustomer: true,
          conversation: {
            companyId: page.companyId,
            channel: 'FACEBOOK'
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });
      
      pageStats.push({
        pageId: page.pageId,
        pageName: page.pageName,
        companyName: page.company?.name || 'Unknown',
        companyId: page.companyId,
        conversations: conversationCount,
        recent24hMessages: recentMessages,
        hasActiveCustomers: conversationCount > 0
      });
    }
    
    // Sort by conversation count (most active first)
    pageStats.sort((a, b) => b.conversations - a.conversations);
    
    // Display results
    console.log('📊 RESULTS (sorted by activity):');
    console.log('');
    
    const activePages = pageStats.filter(p => p.hasActiveCustomers);
    const inactivePages = pageStats.filter(p => !p.hasActiveCustomers);
    
    console.log(`✅ ACTIVE PAGES (${activePages.length} pages with customers):`);
    if (activePages.length === 0) {
      console.log('   None found');
    } else {
      activePages.forEach((page, index) => {
        const marker = page.pageId === '453471574524139' ? '🎯' : '  ';
        console.log(`${marker} ${index + 1}. ${page.pageName} (${page.pageId})`);
        console.log(`      Company: ${page.companyName}`);
        console.log(`      Conversations: ${page.conversations}`);
        console.log(`      Recent 24h messages: ${page.recent24hMessages}`);
        if (page.pageId === '453471574524139') {
          console.log(`      ⭐ THIS IS YOUR PROBLEMATIC PAGE - BUT IT HAS CUSTOMERS!`);
        }
        console.log('');
      });
    }
    
    console.log(`❌ INACTIVE PAGES (${inactivePages.length} pages with NO customers):`);
    if (inactivePages.length === 0) {
      console.log('   None found');
    } else {
      inactivePages.forEach((page, index) => {
        const marker = page.pageId === '453471574524139' ? '🎯' : '  ';
        console.log(`${marker} ${index + 1}. ${page.pageName} (${page.pageId})`);
        console.log(`      Company: ${page.companyName}`);
        if (page.pageId === '453471574524139') {
          console.log(`      ⭐ THIS IS YOUR PROBLEMATIC PAGE - NO CUSTOMERS HAVE MESSAGED!`);
        }
        console.log('');
      });
    }
    
    // Summary for the problematic page
    const problematicPage = pageStats.find(p => p.pageId === '453471574524139');
    if (problematicPage) {
      console.log('🎯 ANALYSIS FOR YOUR PAGE (453471574524139):');
      console.log(`   Page Name: ${problematicPage.pageName}`);
      console.log(`   Company: ${problematicPage.companyName}`);
      console.log(`   Total Conversations: ${problematicPage.conversations}`);
      console.log(`   Recent 24h Messages: ${problematicPage.recent24hMessages}`);
      console.log('');
      
      if (problematicPage.conversations === 0) {
        console.log('❌ ROOT CAUSE: No customers have ever messaged this page');
        console.log('💡 SOLUTION: Ask someone to send a message to "ns store 3" via Facebook Messenger');
      } else if (problematicPage.recent24hMessages === 0) {
        console.log('⚠️ ISSUE: Customers exist but no recent messages (outside 24-hour window)');
        console.log('💡 SOLUTION: Ask a customer to send a fresh message via Facebook Messenger');
      } else {
        console.log('✅ Page has active customers - issue might be elsewhere');
        console.log('💡 Check message validation, page token, or specific recipient IDs');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  checkActiveConversationsByCompany();
}

module.exports = { checkActiveConversationsByCompany };