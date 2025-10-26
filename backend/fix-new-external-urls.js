/**
 * Fix New External URLs
 * 
 * Fix the newly created messages that still have external URLs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixNewExternalUrls() {
  try {
    console.log('🔧 Fixing new external URLs...');
    
    // The messages with external URLs
    const messagesToFix = ['cmfx9327s000fuf38cbmblwpu', 'cmfx91cly0007uf38xdrcygf7'];
    const correctUrl = 'http://localhost:3001/uploads/conversations/conversation-1758670034665-462148132.jpg';
    
    let fixedCount = 0;
    
    for (const messageId of messagesToFix) {
      try {
        console.log(`\n🔍 Processing message: ${messageId}`);
        
        const message = await prisma.message.findUnique({
          where: { id: messageId }
        });
        
        if (!message) {
          console.log(`  ❌ Message not found: ${messageId}`);
          continue;
        }
        
        if (message.metadata) {
          const metadata = JSON.parse(message.metadata);
          
          if (metadata.images && Array.isArray(metadata.images)) {
            console.log(`  📸 Current images (${metadata.images.length}):`);
            metadata.images.forEach((img, index) => {
              console.log(`    ${index + 1}. ${img}`);
            });
            
            // Replace external URLs with conversation URL
            const updatedImages = metadata.images.map(imageUrl => {
              if (typeof imageUrl === 'string' && imageUrl.includes('files.easy-orders.net')) {
                console.log(`    🔄 Fixing: ${imageUrl} -> ${correctUrl}`);
                return correctUrl;
              }
              return imageUrl;
            });
            
            metadata.images = updatedImages;
            
            // Update the message
            await prisma.message.update({
              where: { id: messageId },
              data: {
                metadata: JSON.stringify(metadata)
              }
            });
            
            console.log(`  ✅ Updated message ${messageId}`);
            fixedCount++;
          } else {
            console.log(`  ℹ️ No images array in metadata`);
          }
        } else {
          console.log(`  ℹ️ No metadata in message`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing message ${messageId}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully fixed ${fixedCount} new external URLs!`);
    
  } catch (error) {
    console.error('❌ Error fixing new external URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixNewExternalUrls();
}

module.exports = { fixNewExternalUrls };