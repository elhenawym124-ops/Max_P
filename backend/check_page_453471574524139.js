const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function checkSpecificPage() {
  try {
    console.log('🔍 Checking for Facebook page ID: 453471574524139');
    
    // Check if this specific page exists
    const specificPage = await prisma.facebookPage.findUnique({
      where: { pageId: '453471574524139' },
      include: {
        company: {
          select: {
            name: true,
            id: true
          }
        }
      }
    });

    if (specificPage) {
      console.log('✅ Page found in database:');
      console.log(`   Page Name: ${specificPage.pageName}`);
      console.log(`   Page ID: ${specificPage.pageId}`);
      console.log(`   Status: ${specificPage.status}`);
      console.log(`   Company: ${specificPage.company?.name || 'Unknown'} (${specificPage.companyId})`);
      console.log(`   Connected At: ${specificPage.connectedAt}`);
      console.log(`   Has Token: ${!!specificPage.pageAccessToken}`);
      if (specificPage.pageAccessToken) {
        console.log(`   Token Preview: ${specificPage.pageAccessToken.substring(0, 20)}...`);
      }
    } else {
      console.log('❌ Page NOT found in database');
    }

    // Also check all pages to see what we have
    console.log('\n📄 All Facebook pages in database:');
    const allPages = await prisma.facebookPage.findMany({
      select: {
        pageId: true,
        pageName: true,
        status: true,
        companyId: true,
        connectedAt: true
      },
      orderBy: {
        connectedAt: 'desc'
      }
    });

    if (allPages.length === 0) {
      console.log('   No pages found');
    } else {
      allPages.forEach((page, index) => {
        console.log(`   ${index + 1}. ${page.pageName} (${page.pageId})`);
        console.log(`      Status: ${page.status}, Company: ${page.companyId}`);
        console.log(`      Connected: ${page.connectedAt}`);
        console.log('');
      });
    }

    // Check if there are any conversations for this customer
    console.log('\n🔍 Checking for conversations with customers from this page...');
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

    console.log(`   Found ${conversations.length} relevant conversations`);
    conversations.forEach((conv, index) => {
      console.log(`   ${index + 1}. Customer: ${conv.customer?.firstName} ${conv.customer?.lastName}`);
      console.log(`      Facebook ID: ${conv.customer?.facebookId}`);
      console.log(`      Channel: ${conv.channel}`);
      if (conv.metadata) {
        try {
          const metadata = JSON.parse(conv.metadata);
          if (metadata.pageId) {
            console.log(`      Page ID from metadata: ${metadata.pageId}`);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificPage();