const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');

async function comprehensiveTest() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 Comprehensive Facebook OAuth Test');
    
    // 1. Check all pages and their statuses
    const allPages = await executeWithRetry(async () => {
      return await prisma.facebookPage.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
    });
    
    console.log(`📊 Total Facebook pages in database: ${allPages.length}`);
    
    // 2. Count pages by status
    const statusCounts = {};
    allPages.forEach(page => {
      statusCounts[page.status] = (statusCounts[page.status] || 0) + 1;
    });
    
    console.log('📈 Pages by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // 3. Check pages for a specific company (if any exist)
    if (allPages.length > 0) {
      const companyId = allPages[0].companyId;
      console.log(`\n🏢 Testing company ID: ${companyId}`);
      
      const companyPages = await executeWithRetry(async () => {
        return await prisma.facebookPage.findMany({
          where: {
            companyId: companyId
          }
        });
      });
      
      console.log(`📋 Pages for company ${companyId}: ${companyPages.length}`);
      
      const connectedCompanyPages = companyPages.filter(page => page.status === 'connected');
      console.log(`🔗 Connected pages for company: ${connectedCompanyPages.length}`);
      
      // 4. Test the status endpoint logic
      console.log('\n🔧 Testing status endpoint logic:');
      console.log(`✅ Company connected: ${connectedCompanyPages.length > 0}`);
      console.log(`🔢 Connected pages count: ${connectedCompanyPages.length}`);
    }
    
    // 5. Show some sample pages
    console.log('\n📄 Sample pages (max 5):');
    const samplePages = allPages.slice(0, 5);
    samplePages.forEach(page => {
      console.log(`- ${page.pageName} (${page.pageId})`);
      console.log(`  Status: ${page.status}`);
      console.log(`  Company: ${page.companyId}`);
      console.log(`  Connected: ${page.connectedAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

comprehensiveTest();