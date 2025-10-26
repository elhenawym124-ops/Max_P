const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');

async function checkImageUrls() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 Checking image URLs in database...');
    
    const messages = await executeWithRetry(async () => {
      return await prisma.message.findMany({
        take: 10,
        where: {
          OR: [
            { content: { contains: 'localhost' } },
            { content: { contains: 'files.easy-orders.net' } },
            { content: { contains: 'mokhtarelhenawy.online' } }
          ]
        },
        select: { 
          id: true, 
          content: true,
          metadata: true,
          type: true
        },
        orderBy: { timestamp: 'desc' }
      });
    });
    
    console.log(`📊 Found ${messages.length} messages with image URLs:`);
    
    messages.forEach((msg, index) => {
      console.log(`\n${index + 1}. Message ID: ${msg.id}`);
      console.log(`   Type: ${msg.type}`);
      console.log(`   Content: ${msg.content.substring(0, 100)}...`);
      
      if (msg.metadata) {
        try {
          const metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
          if (metadata.images) {
            console.log(`   Images in metadata: ${metadata.images.length}`);
            metadata.images.forEach((img, imgIndex) => {
              console.log(`     ${imgIndex + 1}. ${img}`);
            });
          }
        } catch (e) {
          console.log(`   Metadata parse error: ${e.message}`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

checkImageUrls();