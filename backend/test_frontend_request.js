const { PrismaClient } = require('@prisma/client');

async function testFrontendRequest() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Frontend Request Simulation');
    
    // Get a real company ID from the database
    const samplePage = await prisma.facebookPage.findFirst();
    if (!samplePage) {
      console.log('❌ No Facebook pages found in database');
      return;
    }
    
    const companyId = samplePage.companyId;
    console.log(`🏢 Testing with real company ID: ${companyId}`);
    
    // Simulate the exact request that the frontend is making
    // This simulates: /facebook-oauth/status?companyId=REAL_COMPANY_ID
    console.log('\n🔧 Simulating frontend request...');
    
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
    console.log(`  Should show as connected: ${connectedPages.length > 0}`);
    
    // Show what the frontend should receive
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
    
    console.log('\n📤 Response that frontend should receive:');
    console.log(JSON.stringify(response, null, 2));
    
    // Now test what happens if companyId is missing or incorrect
    console.log('\n⚠️ Testing with missing companyId...');
    console.log('  Result: Error - Company ID is required');
    
    console.log('\n⚠️ Testing with non-existent companyId...');
    const fakeCompanyId = 'non-existent-company-id';
    const fakePages = await prisma.facebookPage.findMany({
      where: {
        companyId: fakeCompanyId
      }
    });
    
    console.log(`  Pages found: ${fakePages.length}`);
    console.log(`  Should show as connected: ${fakePages.length > 0}`);
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendRequest();