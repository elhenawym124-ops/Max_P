const { getSharedPrismaClient } = require('./services/sharedDatabase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const prisma = getSharedPrismaClient();

async function debugFacebookAPI() {
    try {
        console.log('🔍 [DEBUG] Starting Facebook API debugging...');

        // 1. Check ali@ali.com user status
        console.log('\n📋 [STEP 1] Checking ali@ali.com user status...');
        const user = await prisma.user.findUnique({
            where: { email: 'ali@ali.com' },
            include: { company: true }
        });

        if (!user) {
            console.log('❌ User ali@ali.com not found');
            return;
        }

        console.log('✅ User found:', {
            id: user.id,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            emailVerifiedAt: user.emailVerifiedAt,
            isActive: user.isActive,
            companyId: user.companyId,
            company: user.company?.name
        });

        // 2. Check company status
        console.log('\n📋 [STEP 2] Checking company status...');
        const company = await prisma.company.findUnique({
            where: { id: user.companyId }
        });

        console.log('✅ Company found:', {
            id: company.id,
            name: company.name,
            isActive: company.isActive
        });

        // 3. Test password verification
        console.log('\n📋 [STEP 3] Testing password verification...');
        const passwordMatch = await bcrypt.compare('admin123', user.password);
        console.log('✅ Password verification:', passwordMatch ? 'PASS' : 'FAIL');

        // 4. Generate JWT token
        console.log('\n📋 [STEP 4] Generating JWT token...');
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                companyId: user.companyId
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        console.log('✅ JWT token generated:', token.substring(0, 50) + '...');

        // 5. Check Facebook pages in database
        console.log('\n📋 [STEP 5] Checking Facebook pages for company...');
        const facebookPages = await prisma.facebookPage.findMany({
            where: { companyId: user.companyId }
        });

        console.log(`✅ Found ${facebookPages.length} Facebook pages:`);
        facebookPages.forEach(page => {
            console.log(`   - ${page.pageName} (${page.pageId}) - Status: ${page.status}`);
        });

        // 6. Test API call directly
        console.log('\n📋 [STEP 6] Testing API call directly...');
        try {
            const response = await axios.get('http://localhost:3001/api/v1/integrations/facebook/connected', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            console.log('✅ API Response Status:', response.status);
            console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));

        } catch (apiError) {
            console.log('❌ API Call failed:');
            console.log('   Status:', apiError.response?.status);
            console.log('   Data:', apiError.response?.data);
            console.log('   Error:', apiError.message);
        }

        // 7. Check authentication middleware flow
        console.log('\n📋 [STEP 7] Testing JWT decode...');
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            console.log('✅ JWT decode successful:', {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
                companyId: decoded.companyId
            });
        } catch (jwtError) {
            console.log('❌ JWT decode failed:', jwtError.message);
        }

        console.log('\n🏁 [DEBUG] Facebook API debugging completed!');

    } catch (error) {
        console.error('❌ [DEBUG] Error during debugging:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the debug
debugFacebookAPI();