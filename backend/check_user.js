const { getSharedPrismaClient } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');

const prisma = getSharedPrismaClient();

async function checkUser() {
  try {
    console.log('🔍 Checking user ali@ali.com...');
    
    // Find user with company
    const user = await prisma.user.findUnique({
      where: { email: 'ali@ali.com' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            plan: true,
            currency: true,
            isActive: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   First Name:', user.firstName);
    console.log('   Last Name:', user.lastName);
    console.log('   Role:', user.role);
    console.log('   Company ID:', user.companyId);
    console.log('   Active:', user.isActive);
    console.log('   Password Hash:', user.password.substring(0, 20) + '...');
    
    if (user.company) {
      console.log('🏢 Company:');
      console.log('   ID:', user.company.id);
      console.log('   Name:', user.company.name);
      console.log('   Plan:', user.company.plan);
      console.log('   Active:', user.company.isActive);
    }

    // Test password
    const isPasswordValid = await bcrypt.compare('admin123', user.password);
    console.log('🔑 Password check:');
    console.log('   Valid for "admin123":', isPasswordValid);

  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();