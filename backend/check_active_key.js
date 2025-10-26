const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');

async function checkActiveKey() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 Checking for active AI keys...');
    
    const activeKeys = await executeWithRetry(async () => {
      return await prisma.aIKey.findMany({
        where: {
          isActive: true,
          OR: [
            { expiresAt: { gte: new Date() } },
            { expiresAt: null }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    });
    
    console.log(`📊 Found ${activeKeys.length} active AI keys:`);
    
    activeKeys.forEach((key, index) => {
      console.log(`\n${index + 1}. Key ID: ${key.id}`);
      console.log(`   Provider: ${key.provider}`);
      console.log(`   Model: ${key.model}`);
      console.log(`   Created: ${key.createdAt}`);
      console.log(`   Expires: ${key.expiresAt || 'Never'}`);
      console.log(`   Usage Count: ${key.usageCount}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking active keys:', error);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

checkActiveKey();