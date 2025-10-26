const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function debugCompanyAndPages() {
    try {
        console.log('🔍 [DEBUG] Checking company and Facebook pages in database u339372869_test2...');

        // 1. Find ali@ali.com user
        const user = await prisma.user.findUnique({
            where: { email: 'ali@ali.com' },
            include: { company: true }
        });

        if (!user) {
            console.log('❌ User ali@ali.com not found');
            return;
        }

        console.log('✅ User found:', {
            email: user.email,
            companyId: user.companyId,
            company: user.company?.name
        });

        // 2. Check all Facebook pages in database
        console.log('\n📄 All Facebook pages in database:');
        const allPages = await prisma.facebookPage.findMany({
            include: {
                company: {
                    select: { name: true }
                }
            }
        });

        console.log(`Found ${allPages.length} total Facebook pages:`);
        allPages.forEach(page => {
            console.log(`   - ${page.pageName} (${page.pageId})`);
            console.log(`     Company ID: ${page.companyId}`);
            console.log(`     Company Name: ${page.company?.name || 'No company'}`);
            console.log(`     Status: ${page.status}`);
            console.log('');
        });

        // 3. Check pages for this specific user's company
        console.log('\n📄 Facebook pages for user company:');
        const userPages = await prisma.facebookPage.findMany({
            where: { companyId: user.companyId }
        });

        console.log(`Found ${userPages.length} pages for company ${user.companyId}:`);
        userPages.forEach(page => {
            console.log(`   - ${page.pageName} (${page.pageId}) - Status: ${page.status}`);
        });

        // 4. Check if there are pages with no company assignment
        console.log('\n📄 Facebook pages with no company assignment:');
        const orphanPages = await prisma.facebookPage.findMany({
            where: { companyId: null }
        });

        console.log(`Found ${orphanPages.length} orphan pages:`);
        orphanPages.forEach(page => {
            console.log(`   - ${page.pageName} (${page.pageId}) - Status: ${page.status}`);
        });

        // 5. Show all companies
        console.log('\n🏢 All companies in database:');
        const companies = await prisma.company.findMany();
        companies.forEach(company => {
            console.log(`   - ${company.name} (${company.id})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugCompanyAndPages();