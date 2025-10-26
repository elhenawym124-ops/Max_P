const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');
const fs = require('fs').promises;

async function analyzeImageMismatch() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 Analyzing image URL mismatches...');
    
    // Get messages with image metadata
    const messages = await executeWithRetry(async () => {
      return await prisma.message.findMany({
        where: {
          metadata: { not: null },
          type: { in: ['image', 'media'] }
        },
        take: 50,
        orderBy: { timestamp: 'desc' }
      });
    });
    
    console.log(`📊 Analyzing ${messages.length} messages with image metadata...`);
    
    let mismatchCount = 0;
    const mismatches = [];
    
    for (const message of messages) {
      try {
        const metadata = typeof message.metadata === 'string' 
          ? JSON.parse(message.metadata) 
          : message.metadata;
          
        if (metadata && metadata.images && Array.isArray(metadata.images)) {
          for (const imageUrl of metadata.images) {
            // Check if image URL matches expected patterns
            const hasMismatch = 
              imageUrl.includes('localhost') ||
              imageUrl.includes('127.0.0.1') ||
              imageUrl.includes('files.easy-orders.net') ||
              (!imageUrl.startsWith('http') && !imageUrl.startsWith('https'));
              
            if (hasMismatch) {
              mismatchCount++;
              mismatches.push({
                messageId: message.id,
                imageUrl,
                timestamp: message.timestamp
              });
            }
          }
        }
      } catch (parseError) {
        console.warn(`⚠️ Could not parse metadata for message ${message.id}:`, parseError.message);
      }
    }
    
    console.log(`\n🔍 Analysis Results:`);
    console.log(`   Total mismatches found: ${mismatchCount}`);
    
    if (mismatches.length > 0) {
      console.log(`\n📝 Top 10 mismatches:`);
      mismatches.slice(0, 10).forEach((mismatch, index) => {
        console.log(`   ${index + 1}. Message: ${mismatch.messageId}`);
        console.log(`      Image URL: ${mismatch.imageUrl}`);
        console.log(`      Timestamp: ${mismatch.timestamp}`);
        console.log('');
      });
      
      // Save to file
      try {
        await fs.writeFile(
          'image-mismatch-report.json',
          JSON.stringify(mismatches, null, 2),
          'utf8'
        );
        console.log(`💾 Mismatch report saved to image-mismatch-report.json`);
      } catch (fileError) {
        console.error('❌ Error saving report:', fileError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error analyzing image mismatches:', error);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

analyzeImageMismatch();