/**
 * Fix All Remaining URLs Comprehensive
 * 
 * This script comprehensively fixes all remaining image URL issues:
 * 1. URLs in metadata.images
 * 2. URLs in message content
 * 3. URLs that should be localhost conversation URLs
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixAllRemainingUrls() {
  try {
    console.log('🔧 Comprehensive fix for all remaining URLs...');
    
    const correctUrl = 'http://localhost:3001/uploads/conversations/conversation-1758670034665-462148132.jpg';
    
    // Find all messages that might have image URLs
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { content: { contains: '1755423827201081518' } },
          { content: { contains: 'files.easy-orders.net' } },
          { content: { contains: 'https://' } },
          { metadata: { not: null } }
        ]
      }
    });
    
    console.log(`📊 Found ${messages.length} messages to check`);
    
    let fixedCount = 0;
    
    for (const message of messages) {
      let hasChanges = false;
      let updatedContent = message.content;
      let updatedMetadata = message.metadata;
      
      console.log(`\n🔍 Processing message: ${message.id}`);
      console.log(`   Type: ${message.type}`);
      console.log(`   Content: ${message.content.substring(0, 100)}...`);
      
      // Fix content URLs
      if (message.content) {
        const originalContent = message.content;
        
        // Replace various URL patterns
        updatedContent = updatedContent
          .replace(/https:\/\/files\.easy-orders\.net\/\d+\.jpg/g, correctUrl)
          .replace(/http:\/\/localhost:3001\/\d+\.jpg/g, correctUrl)
          .replace(/https:\/\/mokhtarelhenawy\.online[^\\s]*/g, correctUrl);
        
        if (updatedContent !== originalContent) {
          console.log(`   🔄 Updated content URLs`);
          hasChanges = true;
        }
      }
      
      // Fix metadata URLs
      if (message.metadata) {
        try {
          const metadata = JSON.parse(message.metadata);
          
          if (metadata.images && Array.isArray(metadata.images)) {
            console.log(`   📸 Found ${metadata.images.length} images in metadata`);
            
            const updatedImages = metadata.images.map(imageUrl => {
              if (typeof imageUrl === 'string') {
                if (imageUrl.includes('files.easy-orders.net') || 
                    imageUrl.includes('mokhtarelhenawy.online') ||
                    (imageUrl.includes('localhost:3001') && !imageUrl.includes('/uploads/conversations/'))) {
                  console.log(`     🔄 Fixing: ${imageUrl} -> ${correctUrl}`);
                  return correctUrl;
                }
              }
              return imageUrl;
            });
            
            if (JSON.stringify(updatedImages) !== JSON.stringify(metadata.images)) {
              metadata.images = updatedImages;
              updatedMetadata = JSON.stringify(metadata);
              hasChanges = true;
            }
          }
        } catch (e) {
          console.log(`   ⚠️ Error parsing metadata: ${e.message}`);
        }
      }
      
      // Update the message if changes were made
      if (hasChanges) {
        await prisma.message.update({
          where: { id: message.id },
          data: {
            content: updatedContent,
            metadata: updatedMetadata
          }
        });
        
        console.log(`   ✅ Updated message ${message.id}`);
        fixedCount++;
      } else {
        console.log(`   ℹ️ No changes needed`);
      }
    }
    
    console.log(`\n🎉 Successfully fixed ${fixedCount} messages!`);
    
    // Also check specific problematic URLs
    console.log(`\n🔍 Testing the corrected URL...`);
    const axios = require('axios');
    try {
      const response = await axios.head(correctUrl);
      console.log(`✅ Target URL accessible: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`❌ Target URL error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing remaining URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixAllRemainingUrls();
}

module.exports = { fixAllRemainingUrls };