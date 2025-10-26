const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');

const prisma = getSharedPrismaClient();

async function checkUserPassword() {
    try {
        console.log('🔍 Checking user password...');
        
        const user = await executeWithRetry(async () => {
          return await prisma.$queryRaw`
              SELECT id, email, password, firstName, lastName FROM users WHERE email = 'ali@ali.com' LIMIT 1
          `;
        });
        
        if (user.length === 0) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('👤 User found:', {
            id: user[0].id,
            email: user[0].email,
            firstName: user[0].firstName,
            lastName: user[0].lastName,
            passwordHash: user[0].password.substring(0, 20) + '...'
        });
        
        // Test common passwords
        const commonPasswords = ['ali123', 'ali', '123456', 'password', 'ali@ali.com'];
        
        for (const testPassword of commonPasswords) {
            const isMatch = await bcrypt.compare(testPassword, user[0].password);
            console.log(`Testing password "${testPassword}":`, isMatch ? '✅ MATCH' : '❌ No match');
            if (isMatch) {
                console.log(`🎯 Correct password found: ${testPassword}`);
                break;
            }
        }
        
    } catch (error) {
        console.error('❌ Error checking password:', error.message);
    } finally {
        // Note: We don't disconnect the shared client as it's used by the main application
    }
}

checkUserPassword();