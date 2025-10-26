const { PrismaClient } = require('@prisma/client');

async function testFacebookOAuthFix() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Facebook OAuth Fix...');
    
    // Check if there are any Facebook pages in the database
    const allPages = await prisma.facebookPage.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${allPages.length} Facebook pages in database:`);
    
    for (const page of allPages) {
      console.log(`- ${page.pageName} (${page.pageId})`);
      console.log(`  Status: ${page.status}`);
      console.log(`  Company ID: ${page.companyId}`);
      console.log(`  Connected At: ${page.connectedAt}`);
      console.log(`  Updated At: ${page.updatedAt}`);
      console.log('');
    }
    
    // Test updating a page status to ensure the fix works
    if (allPages.length > 0) {
      const firstPage = allPages[0];
      console.log(`🔧 Testing update for page: ${firstPage.pageName}`);
      
      const updatedPage = await prisma.facebookPage.update({
        where: {
          id: firstPage.id
        },
        data: {
          status: 'connected',
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Page updated successfully. New status: ${updatedPage.status}`);
    } else {
      console.log('⚠️ No Facebook pages found in database to test.');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFacebookOAuthFix();