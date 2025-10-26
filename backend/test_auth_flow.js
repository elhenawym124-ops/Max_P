const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuthFlow() {
    try {
        console.log('🔍 Testing authentication flow...');
        
        // Get the user that should be authenticated (based on login logs)
        const user = await prisma.$queryRaw`
            SELECT * FROM users WHERE email = 'ali@ali.com' LIMIT 1
        `;
        
        if (user.length === 0) {
            console.log('❌ User ali@ali.com not found');
            return;
        }
        
        console.log('👤 Found user:', {
            id: user[0].id,
            email: user[0].email,
            firstName: user[0].firstName,
            lastName: user[0].lastName,
            companyId: user[0].companyId,
            role: user[0].role
        });
        
        // Check if the user's companyId matches what we expect
        const expectedCompanyId = 'cmem8ayyr004cufakqkcsyn97';
        const actualCompanyId = user[0].companyId;
        
        console.log('🏢 Company ID comparison:');
        console.log('  Expected:', expectedCompanyId);
        console.log('  Actual:', actualCompanyId);
        console.log('  Match:', expectedCompanyId === actualCompanyId);
        
        if (expectedCompanyId !== actualCompanyId) {
            console.log('⚠️ Company ID mismatch detected!');
            
            // Check if the actual company ID exists
            const actualCompany = await prisma.$queryRaw`
                SELECT * FROM companies WHERE id = ${actualCompanyId}
            `;
            
            console.log('Actual company exists:', actualCompany.length > 0);
            if (actualCompany.length > 0) {
                console.log('Actual company details:', {
                    id: actualCompany[0].id,
                    name: actualCompany[0].name,
                    email: actualCompany[0].email
                });
            }
        }
        
        // Test the exact scenario from the addNewGeminKey function
        console.log('\n🧪 Testing with actual user companyId...');
        
        const testCompanyId = actualCompanyId;
        
        // Simulate the exact check from the controller
        const keyCount = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM gemini_keys WHERE companyId = ${testCompanyId}
        `;
        const count = Number(keyCount[0]?.count || 0);
        console.log('Current key count for user company:', count);
        
        
    } catch (error) {
        console.error('❌ Error during auth flow test:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testAuthFlow();