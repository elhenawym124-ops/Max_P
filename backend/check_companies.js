const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');

async function checkCompanies() {
    const prisma = getSharedPrismaClient();
    
    try {
        console.log('🔍 Checking companies table...');
        
        // Check if companies table exists
        const result = await executeWithRetry(async () => {
          return await prisma.$queryRaw`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'companies'`;
        });
        console.log('Companies table exists:', result[0]?.count > 0);
        
        if (result[0]?.count > 0) {
            // Get all companies
            const companies = await executeWithRetry(async () => {
              return await prisma.$queryRaw`SELECT id, name, email FROM companies LIMIT 10`;
            });
            console.log('📊 Companies in database:');
            companies.forEach(company => {
                console.log(`  - ID: ${company.id}, Name: ${company.name}, Email: ${company.email}`);
            });
            
            // Check the specific company ID from the error
            const specificCompanyId = 'cmem8ayyr004cufakqkcsyn97';
            const specificCompany = await executeWithRetry(async () => {
              return await prisma.$queryRaw`SELECT * FROM companies WHERE id = ${specificCompanyId}`;
            });
            console.log(`\n🔍 Checking specific company ID: ${specificCompanyId}`);
            console.log('Found:', specificCompany.length > 0 ? 'YES' : 'NO');
            if (specificCompany.length > 0) {
                console.log('Company details:', specificCompany[0]);
            }
        }
        
    } catch (error) {
        console.error('❌ Error checking companies:', error.message);
    } finally {
        // Note: We don't disconnect the shared client as it's used by the main application
    }
}

checkCompanies();