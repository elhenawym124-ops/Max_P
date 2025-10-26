/**
 * Fix Image Paths Script
 * 
 * This script corrects image URLs in the database by:
 * 1. Finding images that point to /uploads/products/ but don't exist there
 * 2. Checking if the image exists in /uploads/conversations/
 * 3. Updating the database URLs to point to the correct location
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixImagePaths() {
  try {
    console.log('🔍 Finding messages with incorrect image paths...');
    
    // Find all messages with images in metadata
    const messages = await prisma.message.findMany({
      where: {
        metadata: {
          not: null
        }
      }
    });
    
    console.log(`📊 Found ${messages.length} messages with metadata to check:`);
    
    let totalFixed = 0;
    
    for (const message of messages) {
      try {
        const metadata = JSON.parse(message.metadata);
        let hasChanges = false;
        
        // Check if metadata has images array
        if (metadata.images && Array.isArray(metadata.images)) {
          console.log(`\n🔍 Checking message ${message.id} with ${metadata.images.length} images:`);
          
          const updatedImages = [];
          
          for (const imageUrl of metadata.images) {
            if (typeof imageUrl === 'string') {
              let fixedUrl = imageUrl;
              
              // Check if URL points to /uploads/products/
              if (imageUrl.includes('/uploads/products/')) {
                const filename = imageUrl.split('/').pop();
                const productsPath = path.join(__dirname, 'uploads', 'products', filename);
                const conversationsPath = path.join(__dirname, 'uploads', 'conversations', filename);
                
                console.log(`  📄 Checking image: ${filename}`);
                
                // Check if file exists in products folder
                if (!fs.existsSync(productsPath)) {
                  console.log(`    ❌ Not found in products folder: ${productsPath}`);
                  
                  // Check if file exists in conversations folder
                  if (fs.existsSync(conversationsPath)) {
                    console.log(`    ✅ Found in conversations folder!`);
                    
                    // Update URL to point to conversations folder
                    fixedUrl = imageUrl.replace('/uploads/products/', '/uploads/conversations/');
                    console.log(`    🔄 Updating URL: ${imageUrl} -> ${fixedUrl}`);
                    hasChanges = true;
                  } else {
                    console.log(`    ❌ File not found in conversations folder either`);
                    
                    // Check if there's a similar file in conversations (maybe different format)
                    const filenameWithoutExt = filename.split('.')[0];
                    const conversationsDir = path.join(__dirname, 'uploads', 'conversations');
                    
                    if (fs.existsSync(conversationsDir)) {
                      const conversationFiles = fs.readdirSync(conversationsDir);
                      const matchingFile = conversationFiles.find(file => 
                        file.startsWith('conversation-') && 
                        (file.includes(filenameWithoutExt) || filename.includes(file.split('.')[0]))
                      );
                      
                      if (matchingFile) {
                        console.log(`    🔍 Found similar file: ${matchingFile}`);
                        fixedUrl = `http://localhost:3001/uploads/conversations/${matchingFile}`;
                        console.log(`    🔄 Updating to similar file: ${fixedUrl}`);
                        hasChanges = true;
                      }
                    }
                  }
                } else {
                  console.log(`    ✅ File exists in products folder`);
                }
              }
              
              updatedImages.push(fixedUrl);
            } else {
              updatedImages.push(imageUrl);
            }
          }
          
          if (hasChanges) {
            metadata.images = updatedImages;
            
            // Update the message in database
            await prisma.message.update({
              where: { id: message.id },
              data: {
                metadata: JSON.stringify(metadata)
              }
            });
            
            console.log(`✅ Updated message ${message.id} with corrected image paths`);
            totalFixed++;
          } else {
            console.log(`  ℹ️ No changes needed for message ${message.id}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully fixed ${totalFixed} messages with incorrect image paths!`);
    
  } catch (error) {
    console.error('❌ Error fixing image paths:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixImagePaths();
}

module.exports = { fixImagePaths };