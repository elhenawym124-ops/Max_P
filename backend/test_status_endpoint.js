const { PrismaClient } = require('@prisma/client');

async function testStatusEndpoint() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Facebook OAuth Status Endpoint Logic');
    
    // Get a sample company ID from existing pages
    const samplePage = await prisma.facebookPage.findFirst();
    if (!samplePage) {
      console.log('❌ No Facebook pages found in database');
      return;
    }
    
    const companyId = samplePage.companyId;
    console.log(`🏢 Testing with company ID: ${companyId}`);
    
    // Simulate the exact logic from the /status endpoint
    const allPages = await prisma.facebookPage.findMany({
      where: {
        companyId: companyId
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

    // Filter for connected pages (exact same logic as in the endpoint)
    const connectedPages = allPages.filter(page => page.status === 'connected');

    console.log(`📊 Results for company ${companyId}:`);
    console.log(`  Total pages: ${allPages.length}`);
    console.log(`  Connected pages: ${connectedPages.length}`);
    console.log(`  Is connected: ${connectedPages.length > 0}`);
    
    // Show the response that would be sent
    const response = {
      success: true,
      connected: connectedPages.length > 0,
      pagesCount: connectedPages.length,
      pages: connectedPages.map(page => ({
        ...page,
        lastActivity: page.updatedAt
      })),
      companyId: companyId,
      message: connectedPages.length > 0 ? 'Facebook pages connected successfully' : 'No Facebook pages connected'
    };
    
    console.log('\n📤 Simulated API Response:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStatusEndpoint();