const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function deleteAndTestPage() {
    try {
        console.log('🗑️ [DELETE-TEST] Deleting M&M page from database...');

        // 1. Check current state
        const beforePages = await prisma.facebookPage.findMany({
            where: { companyId: 'cmem8ayyr004cufakqkcsyn97' }
        });
        
        console.log(`📊 BEFORE: Found ${beforePages.length} pages`);
        beforePages.forEach(page => {
            console.log(`   - ${page.pageName} (${page.pageId}) - Status: ${page.status}`);
        });

        // 2. Delete the M&M page completely
        const deletedPage = await prisma.facebookPage.deleteMany({
            where: { 
                pageId: '292827857244137', // M&M page ID
                companyId: 'cmem8ayyr004cufakqkcsyn97'
            }
        });

        console.log(`🗑️ Deleted ${deletedPage.count} pages`);

        // 3. Check after deletion
        const afterPages = await prisma.facebookPage.findMany({
            where: { companyId: 'cmem8ayyr004cufakqkcsyn97' }
        });
        
        console.log(`📊 AFTER: Found ${afterPages.length} pages`);
        afterPages.forEach(page => {
            console.log(`   - ${page.pageName} (${page.pageId}) - Status: ${page.status}`);
        });

        console.log('\n✅ Now try to refresh the frontend and see if the remaining pages appear!');
        console.log('✅ If they appear, then the issue was with the M&M page specifically');
        console.log('✅ You can then try to reconnect the M&M page');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteAndTestPage();