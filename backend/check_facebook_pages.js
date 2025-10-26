const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function checkFacebookPages() {
  try {
    const pages = await executeWithRetry(async () => {
      return await prisma.facebookPage.findMany({
        select: {
          pageId: true,
          pageName: true,
          pageAccessToken: true,
          status: true,
          companyId: true
        }
      });
    });

    console.log('📄 Facebook Pages configured:');
    pages.forEach(page => {
      console.log(`- ${page.pageName} (${page.pageId}): ${page.status}`);
      console.log(`  Company: ${page.companyId}`);
      console.log(`  Token: ${page.pageAccessToken ? page.pageAccessToken.substring(0, 20) + '...' : 'NO TOKEN'}`);
      console.log('');
    });

    if (pages.length === 0) {
      console.log('❌ No Facebook pages found in database');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

checkFacebookPages();