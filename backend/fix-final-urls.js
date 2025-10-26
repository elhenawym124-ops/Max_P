/**
 * Fix Final Remaining URLs
 * 
 * Fix the last 2 messages with incorrect product URLs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixFinalUrls() {
  try {
    console.log('🔧 Fixing final remaining URLs...');
    
    const messagesToFix = ['cmfx6e1670007uf5g6o0ceuuw', 'cmfx5qxzd0007ufy413sln9ik'];
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
            
            // Replace product URLs with conversation URL
            const updatedImages = metadata.images.map(imageUrl => {
              if (typeof imageUrl === 'string' && imageUrl.includes('/uploads/products/')) {
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
    
    console.log(`\n🎉 Successfully fixed ${fixedCount} final messages!`);
    
  } catch (error) {
    console.error('❌ Error fixing final URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixFinalUrls();
}

module.exports = { fixFinalUrls };