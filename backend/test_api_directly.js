const { getSharedPrismaClient } = require('./services/sharedDatabase');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const prisma = getSharedPrismaClient();

async function testApiDirectly() {
    try {
        console.log('🧪 [API-TEST] Testing Facebook API directly...');

        // 1. Get user data from database
        const user = await prisma.user.findUnique({
            where: { email: 'ali@ali.com' },
            include: { company: true }
        });

        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log('✅ User found:', {
            email: user.email,
            companyId: user.companyId,
            company: user.company?.name
        });

        // 2. Create a valid JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                companyId: user.companyId
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        console.log('🔑 JWT token created:', token.substring(0, 50) + '...');

        // 3. Test the Facebook API endpoint directly
        console.log('\n📡 Testing Facebook pages API...');
        
        try {
            const response = await axios.get('http://localhost:3001/api/v1/integrations/facebook/connected', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('✅ API Response Status:', response.status);
            console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));

            if (response.data.success && response.data.pages) {
                console.log(`\n📊 Found ${response.data.pages.length} pages in API response:`);
                response.data.pages.forEach(page => {
                    console.log(`   - ${page.pageName} (${page.pageId}) - Status: ${page.status}`);
                });
            } else {
                console.log('❌ API returned success but no pages');
            }

        } catch (apiError) {
            console.log('❌ API Call failed:');
            console.log('   Status:', apiError.response?.status);
            console.log('   Data:', JSON.stringify(apiError.response?.data, null, 2));
            console.log('   Error:', apiError.message);
        }

        // 4. Double-check database directly
        console.log('\n📄 Double-checking database...');
        const dbPages = await prisma.facebookPage.findMany({
            where: { companyId: user.companyId }
        });

        console.log(`📊 Database has ${dbPages.length} pages for company ${user.companyId}:`);
        dbPages.forEach(page => {
            console.log(`   - ${page.pageName} (${page.pageId}) - Status: ${page.status}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testApiDirectly();