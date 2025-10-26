const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function investigatePage453471574524139() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 Investigating Facebook page ID: 453471574524139');
    console.log('=' * 60);
    
    // 1. Check if the page exists in our database
    const pageInDb = await prisma.facebookPage.findUnique({
      where: { pageId: '453471574524139' },
      include: {
        company: {
          select: { name: true, id: true }
        }
      }
    });
    
    console.log('\n📄 Database Check:');
    if (pageInDb) {
      console.log('✅ Page EXISTS in database');
      console.log(`   Page Name: ${pageInDb.pageName}`);
      console.log(`   Status: ${pageInDb.status}`);
      console.log(`   Company: ${pageInDb.company?.name} (ID: ${pageInDb.companyId})`);
      console.log(`   Connected At: ${pageInDb.connectedAt}`);
      console.log(`   Has Access Token: ${!!pageInDb.pageAccessToken}`);
      if (pageInDb.pageAccessToken) {
        console.log(`   Token Preview: ${pageInDb.pageAccessToken.substring(0, 30)}...`);
        console.log(`   Token Length: ${pageInDb.pageAccessToken.length}`);
      }
    } else {
      console.log('❌ Page NOT FOUND in database');
      console.log('   This explains why messages are not being sent!');
      console.log('   The page needs to be connected first through Facebook settings.');
    }
    
    // 2. Check for any conversations related to this page
    console.log('\n💬 Conversation Check:');
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { metadata: { contains: '453471574524139' } },
          { 
            customer: {
              facebookId: { not: null }
            }
          }
        ]
      },
      include: {
        customer: {
          select: {
            facebookId: true,
            firstName: true,
            lastName: true
          }
        }
      },
      take: 10
    });
    
    console.log(`   Found ${conversations.length} potentially related conversations`);
    let foundRelevantConversation = false;
    
    for (const conv of conversations) {
      if (conv.metadata) {
        try {
          const metadata = JSON.parse(conv.metadata);
          if (metadata.pageId === '453471574524139') {
            foundRelevantConversation = true;
            console.log(`   ✅ Found conversation for this page:`);
            console.log(`      Customer: ${conv.customer?.firstName} ${conv.customer?.lastName}`);
            console.log(`      Facebook ID: ${conv.customer?.facebookId}`);
            console.log(`      Conversation ID: ${conv.id}`);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }
    
    if (!foundRelevantConversation) {
      console.log('   ⚠️ No conversations found specifically for this page');
    }
    
    // 3. Check all Facebook pages in the system
    console.log('\n📋 All Facebook Pages in System:');
    const allPages = await prisma.facebookPage.findMany({
      select: {
        pageId: true,
        pageName: true,
        status: true,
        companyId: true,
        connectedAt: true
      },
      orderBy: { connectedAt: 'desc' }
    });
    
    if (allPages.length === 0) {
      console.log('   ❌ No Facebook pages configured in the system');
    } else {
      console.log(`   Found ${allPages.length} Facebook page(s):`);
      allPages.forEach((page, index) => {
        const isTargetPage = page.pageId === '453471574524139';
        const marker = isTargetPage ? '🎯' : '  ';
        console.log(`   ${marker} ${index + 1}. ${page.pageName} (${page.pageId})`);
        console.log(`        Status: ${page.status}, Company: ${page.companyId}`);
        if (isTargetPage) {
          console.log(`        ⭐ THIS IS THE PROBLEMATIC PAGE!`);
        }
      });
    }
    
    // 4. Provide solution
    console.log('\n🔧 SOLUTION ANALYSIS:');
    if (!pageInDb) {
      console.log('❌ ROOT CAUSE: Page 453471574524139 is NOT in the database');
      console.log('');
      console.log('🎯 SOLUTIONS:');
      console.log('   1. Go to Facebook Settings in the admin panel');
      console.log('   2. Connect this Facebook page by providing its Page Access Token');
      console.log('   3. Make sure the Page Access Token has proper permissions:');
      console.log('      - pages_messaging');
      console.log('      - pages_manage_metadata');
      console.log('      - pages_read_engagement');
      console.log('');
      console.log('💡 HOW TO GET PAGE ACCESS TOKEN:');
      console.log('   1. Go to Facebook Developer Console');
      console.log('   2. Go to your App > Tools > Graph API Explorer');
      console.log('   3. Select your page from the dropdown');
      console.log('   4. Copy the Page Access Token');
      console.log('   5. Add it in the Facebook Settings page');
    } else {
      console.log('✅ Page exists in database, checking other potential issues...');
      
      if (pageInDb.status !== 'connected') {
        console.log(`❌ Page status is '${pageInDb.status}' instead of 'connected'`);
      }
      
      if (!pageInDb.pageAccessToken) {
        console.log('❌ Page Access Token is missing');
      }
      
      // Check if token is expired by testing with Facebook API
      if (pageInDb.pageAccessToken) {
        console.log('🧪 Testing Page Access Token with Facebook API...');
        try {
          const axios = require('axios');
          const response = await axios.get(`https://graph.facebook.com/v18.0/${pageInDb.pageId}`, {
            params: {
              access_token: pageInDb.pageAccessToken,
              fields: 'name,id'
            },
            timeout: 5000
          });
          console.log('✅ Page Access Token is VALID');
          console.log(`   Facebook says page name: ${response.data.name}`);
        } catch (error) {
          console.log('❌ Page Access Token is INVALID or EXPIRED');
          console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
          console.log('   Solution: Generate a new Page Access Token and update it');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  investigatePage453471574524139();
}

module.exports = { investigatePage453471574524139 };