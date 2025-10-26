const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');

async function checkSuperAdmin() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 Checking for super admin users...');
    
    const superAdmins = await executeWithRetry(async () => {
      return await prisma.user.findMany({
        where: {
          role: 'SUPER_ADMIN'
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true
        }
      });
    });
    
    console.log(`📊 Found ${superAdmins.length} super admin users:`);
    
    superAdmins.forEach((admin, index) => {
      console.log(`\n${index + 1}. User ID: ${admin.id}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   Created: ${admin.createdAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking super admins:', error);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

checkSuperAdmin();