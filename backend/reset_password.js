const { getSharedPrismaClient } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');

const prisma = getSharedPrismaClient();

async function resetUserPassword() {
    try {
        console.log('🔧 [PASSWORD-RESET] Resetting password for ali@ali.com...');

        // Check if user exists
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
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
            company: user.company?.name
        });

        // Hash the new password
        const hashedPassword = await bcrypt.hash('admin123', 10);
        console.log('🔑 New password hashed');

        // Update the user with the new password
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
        const passwordMatch = await bcrypt.compare('admin123', updatedUser.password);
        console.log('✅ Password verification test:', passwordMatch ? 'PASS' : 'FAIL');

        console.log('\n🎉 Password reset completed! You can now login with:');
        console.log('   Email: ali@ali.com');
        console.log('   Password: admin123');

    } catch (error) {
        console.error('❌ Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the reset
resetUserPassword();