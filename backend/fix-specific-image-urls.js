/**
 * Fix Specific Image URLs
 * 
 * Based on timing correlation analysis, this script fixes the specific
 * messages that have incorrect product URLs and maps them to the 
 * actual conversation file that exists.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixSpecificImageUrls() {
  try {
    console.log('🎯 Fixing specific image URLs based on timing correlation...');
    
    // The actual file that exists
    const actualImageFile = 'conversation-1758670034665-462148132.jpg';
    const actualImagePath = path.join(__dirname, 'uploads', 'conversations', actualImageFile);
    
    // Verify the file exists
    if (!fs.existsSync(actualImagePath)) {
      console.error(`❌ Actual image file not found: ${actualImagePath}`);
      return;
    }
    
    console.log(`✅ Confirmed actual image file exists: ${actualImageFile}`);
    
    // Messages to fix based on timing correlation
    const messagesToFix = [
      'cmfx6vecb000huf8gxo7q1w5w', // 237s difference
      'cmfx6p35i0007uf8gr8bd2ilw', // 58s difference  
      'cmfx6m8z4000vuf5gdhzfjcqd', // 190s difference
      // Note: cmfx6qbrb0009uf8gxwe18aax already has correct URL
      // Note: cmfx6ij7e000nuf5g81652158 is too far (outside 5 minutes)
    ];
    
    console.log(`🔧 Will fix ${messagesToFix.length} messages`);
    
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
        
        if (!message.metadata) {
          console.log(`  ℹ️ No metadata in message: ${messageId}`);
          continue;
        }
        
        const metadata = JSON.parse(message.metadata);
        
        if (!metadata.images || !Array.isArray(metadata.images)) {
          console.log(`  ℹ️ No images array in metadata: ${messageId}`);
          continue;
        }
        
        console.log(`  📸 Current images (${metadata.images.length}):`);
        metadata.images.forEach((img, index) => {
          console.log(`    ${index + 1}. ${img}`);
        });
        
        // Replace all product URLs with the actual conversation URL
        const correctedUrl = `http://localhost:3001/uploads/conversations/${actualImageFile}`;
        let hasChanges = false;
        
        const updatedImages = metadata.images.map(imageUrl => {
          if (typeof imageUrl === 'string' && imageUrl.includes('/uploads/products/')) {
            console.log(`    🔄 Fixing: ${imageUrl} -> ${correctedUrl}`);
            hasChanges = true;
            return correctedUrl;
          }
          return imageUrl;
        });
        
        if (hasChanges) {
          metadata.images = updatedImages;
          
          // Update the message in database
          await prisma.message.update({
            where: { id: messageId },
            data: {
              metadata: JSON.stringify(metadata)
            }
          });
          
          console.log(`  ✅ Updated message ${messageId}`);
          fixedCount++;
        } else {
          console.log(`  ℹ️ No changes needed for message ${messageId}`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing message ${messageId}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully fixed ${fixedCount} messages!`);
    
    // Test the fixed URL
    console.log('\n🧪 Testing fixed URL accessibility...');
    console.log(`📍 URL to test: http://localhost:3001/uploads/conversations/${actualImageFile}`);
    
  } catch (error) {
    console.error('❌ Error fixing specific image URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixSpecificImageUrls();
}

module.exports = { fixSpecificImageUrls };