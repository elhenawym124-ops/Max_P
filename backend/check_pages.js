const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function checkFacebookPages() {
    const prisma = getSharedPrismaClient();
    
    try {
        console.log('📊 Checking Facebook pages for company cmem8ayyr004cufakqkcsyn97...');
        
        const pages = await prisma.facebookPage.findMany({
            where: { companyId: 'cmem8ayyr004cufakqkcsyn97' }
        });
        
        console.log(`📊 Found ${pages.length} Facebook pages:`);
        pages.forEach(page => {
            console.log(`   - ${page.pageName} (${page.pageId}) - Status: ${page.status} - Company: ${page.companyId}`);
        });
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkFacebookPages();