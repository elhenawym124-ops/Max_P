/**
 * Fix Remaining Image URL
 * 
 * Fix the last remaining message with incorrect product URL
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixRemainingImageUrl() {
  try {
    console.log('🔧 Fixing remaining image URL...');
    
    const messageId = 'cmfx6ij7e000nuf5g81652158';
    const correctUrl = 'http://localhost:3001/uploads/conversations/conversation-1758670034665-462148132.jpg';
    
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });
    
    if (!message) {
      console.log(`❌ Message not found: ${messageId}`);
      return;
    }
    
    if (message.metadata) {
      const metadata = JSON.parse(message.metadata);
      
      if (metadata.images && Array.isArray(metadata.images)) {
        console.log(`📸 Current images (${metadata.images.length}):`);
        metadata.images.forEach((img, index) => {
          console.log(`  ${index + 1}. ${img}`);
        });
        
        // Replace product URL with conversation URL
        const updatedImages = metadata.images.map(imageUrl => {
          if (typeof imageUrl === 'string' && imageUrl.includes('/uploads/products/')) {
            console.log(`🔄 Fixing: ${imageUrl} -> ${correctUrl}`);
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
        
        console.log(`✅ Updated message ${messageId}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing remaining image URL:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixRemainingImageUrl();
}

module.exports = { fixRemainingImageUrl };