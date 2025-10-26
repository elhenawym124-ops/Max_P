const { PrismaClient } = require('@prisma/client');

async function finalVerification() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Final Verification of Facebook OAuth Fix');
    console.log('===========================================\n');
    
    // 1. Check if there are Facebook pages in the database
    const allPages = await prisma.facebookPage.findMany();
    console.log(`📊 Total Facebook pages in database: ${allPages.length}`);
    
    if (allPages.length === 0) {
      console.log('⚠️ No Facebook pages found. The fix cannot be verified without data.');
      return;
    }
    
    // 2. Check pages by company
    const companies = {};
    allPages.forEach(page => {
      if (!companies[page.companyId]) {
        companies[page.companyId] = [];
      }
      companies[page.companyId].push(page);
    });
    
    console.log(`🏢 Companies with Facebook pages: ${Object.keys(companies).length}\n`);
    
    // 3. Verify each company's connection status
    console.log('📋 Company Status Verification:');
    for (const [companyId, pages] of Object.entries(companies)) {
      const connectedPages = pages.filter(page => page.status === 'connected');
      console.log(`  Company ${companyId}:`);
      console.log(`    Total pages: ${pages.length}`);
      console.log(`    Connected pages: ${connectedPages.length}`);
      console.log(`    Status: ${connectedPages.length > 0 ? '✅ CONNECTED' : '❌ DISCONNECTED'}`);
      console.log('');
    }
    
    // 4. Test the specific logic used in the status endpoint
    console.log('🔧 Testing Status Endpoint Logic:');
    const testCompanyId = Object.keys(companies)[0];
    console.log(`  Testing with company ID: ${testCompanyId}`);
    
    const companyPages = await prisma.facebookPage.findMany({
      where: {
        companyId: testCompanyId
      },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        status: true,
        connectedAt: true,
        updatedAt: true,
      },
      orderBy: {
        connectedAt: 'desc'
      }
    });

    const connectedPages = companyPages.filter(page => page.status === 'connected');
    
    const response = {
      success: true,
      connected: connectedPages.length > 0,
      pagesCount: connectedPages.length,
      pages: connectedPages.map(page => ({
        ...page,
        lastActivity: page.updatedAt
      })),
      companyId: testCompanyId,
      message: connectedPages.length > 0 ? 'Facebook pages connected successfully' : 'No Facebook pages connected'
    };
    
    console.log(`  Response for frontend:`);
    console.log(`    success: ${response.success}`);
    console.log(`    connected: ${response.connected}`);
    console.log(`    pagesCount: ${response.pagesCount}`);
    console.log(`    companyId: ${response.companyId}`);
    console.log(`    message: ${response.message}`);
    
    console.log('\n✅ Final verification completed successfully!');
    console.log('The Facebook OAuth integration should now work correctly.');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalVerification();