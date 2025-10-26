const { getSharedPrismaClient } = require('./services/sharedDatabase');
const bcrypt = require('bcrypt');

const prisma = getSharedPrismaClient();

async function fixAliPassword() {
    try {
        console.log('🔧 [PASSWORD-FIX] Setting correct password for ali@ali.com...');
        console.log('🔧 [PASSWORD-FIX] Database: u339372869_test2');

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email: 'ali@ali.com' },
            include: { company: true }
        });

        if (!user) {
            console.log('❌ User ali@ali.com not found in database u339372869_test2');
            return;
        }

        console.log('✅ User found:', {
            email: user.email,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
            company: user.company?.name,
            companyId: user.companyId
        });

        // Hash the correct password: 0165676135
        const correctPassword = '0165676135';
        const hashedPassword = await bcrypt.hash(correctPassword, 10);
        console.log('🔑 Password hashed for:', correctPassword);

        // Update the user with the correct password
        const updatedUser = await prisma.user.update({
            where: { email: 'ali@ali.com' },
            data: {
                password: hashedPassword,
                isActive: true,
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            }
        });

        console.log('✅ Password updated successfully');

        // Test the password
        const passwordMatch = await bcrypt.compare(correctPassword, updatedUser.password);
        console.log('✅ Password verification test:', passwordMatch ? 'PASS' : 'FAIL');

        // Also check Facebook pages for this company
        console.log('\n📄 Checking Facebook pages for this company...');
        const facebookPages = await prisma.facebookPage.findMany({
            where: { companyId: user.companyId }
        });

        console.log(`✅ Found ${facebookPages.length} Facebook pages:`);
        facebookPages.forEach(page => {
            console.log(`   - ${page.pageName} (${page.pageId}) - Status: ${page.status}`);
        });

        console.log('\n🎉 Password fix completed! You can now login with:');
        console.log('   Email: ali@ali.com');
        console.log('   Password: 0165676135');
        console.log('   Database: u339372869_test2');

    } catch (error) {
        console.error('❌ Error fixing password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the fix
fixAliPassword();