const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');

async function checkCustomers() {
  const prisma = getSharedPrismaClient();
  
  try {
    // البحث عن العملاء الذين لديهم Facebook IDs
    const customers = await executeWithRetry(async () => {
      return await prisma.customer.findMany({
        where: {
          facebookId: { not: null }
        },
        take: 10
      });
    });

    console.log(`📊 Found ${customers.length} Facebook customers:`);
    
    customers.forEach(customer => {
      console.log(`- ID: ${customer.id}`);
      console.log(`  Facebook ID: ${customer.facebookId}`);
      console.log(`  Name: ${customer.firstName} ${customer.lastName}`);
      console.log(`  Is default name: ${customer.firstName.includes('Facebook') || customer.firstName.includes('عميل') || customer.firstName.includes('زائر') || customer.firstName.includes('زبون') || customer.firstName === 'عميل' || customer.firstName === '' || customer.firstName === null}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Error checking customers:', error);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

// Run the check
checkCustomers();