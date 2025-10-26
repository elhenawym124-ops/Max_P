const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = getSharedPrismaClient();

async function checkUserLogin() {
  try {
    console.log('🔍 Checking users for company شركة التسويق (ali@ali.com)');
    
    // Find the company first
    const company = await executeWithRetry(async () => {
      return await prisma.company.findUnique({
        where: { email: 'ali@ali.com' },
        include: {
          users: true
        }
      });
    });
    
    if (!company) {
      console.log('❌ Company not found');
      return;
    }
    
    console.log('✅ Company found:', company.name);
    console.log('📋 Users in this company:');
    
    if (company.users.length === 0) {
      console.log('   ❌ No users found in this company!');
      console.log('   This explains why login fails.');
      
      console.log('\n💡 Creating admin user for this company...');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const newUser = await executeWithRetry(async () => {
        return await prisma.user.create({
          data: {
            email: 'ali@ali.com',
            password: hashedPassword,
            firstName: 'Ali',
            lastName: 'Ali',
            role: 'COMPANY_ADMIN',
            isActive: true,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            companyId: company.id,
          },
        });
      });
      
      console.log('✅ User created successfully!');
      console.log('📧 Email:', newUser.email);
      console.log('🔑 Password: admin123');
      console.log('👑 Role:', newUser.role);
      
    } else {
      company.users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Active: ${user.isActive}`);
        console.log(`      Email Verified: ${user.isEmailVerified}`);
        console.log('      ---');
      });
      
      // Try to reset password for first user
      if (company.users.length > 0) {
        const firstUser = company.users[0];
        console.log(`\n🔐 Resetting password for ${firstUser.email}...`);
        
        const hashedPassword = await bcrypt.hash('admin123', 12);
        await executeWithRetry(async () => {
          await prisma.user.update({
            where: { id: firstUser.id },
            data: {
              password: hashedPassword,
              passwordChangedAt: new Date()
            }
          });
        });
        
        console.log('✅ Password reset to: admin123');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

checkUserLogin();