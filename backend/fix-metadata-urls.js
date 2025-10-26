const { PrismaClient } = require('@prisma/client');

async function fixMetadataImageUrls() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Finding messages with external URLs in metadata...');
    
    // Find messages with metadata containing external URLs
    const messages = await prisma.message.findMany({
      where: {
        AND: [
          { metadata: { not: null } },
          { type: 'IMAGE' }
        ]
      },
      select: { 
        id: true, 
        content: true,
        metadata: true,
        type: true
      }
    });
    
    console.log(`📊 Found ${messages.length} messages with metadata to check:`);
    
    let updatedCount = 0;
    
    for (const message of messages) {
      try {
        const metadata = typeof message.metadata === 'string' ? JSON.parse(message.metadata) : message.metadata;
        
        if (metadata.images && Array.isArray(metadata.images)) {
          let hasChanges = false;
          const updatedImages = metadata.images.map(imageUrl => {
            if (typeof imageUrl === 'string') {
              // Case 1: External files.easy-orders.net URLs
              if (imageUrl.includes('files.easy-orders.net')) {
                const filename = imageUrl.split('/').pop();
                const newUrl = `http://localhost:3001/uploads/products/${filename}`;
                console.log(`🔄 Converting external: ${imageUrl} -> ${newUrl}`);
                hasChanges = true;
                return newUrl;
              }
              // Case 2: Localhost URLs without proper path
              else if (imageUrl.startsWith('http://localhost:3001/') && !imageUrl.includes('/uploads/')) {
                const filename = imageUrl.replace('http://localhost:3001/', '');
                const newUrl = `http://localhost:3001/uploads/products/${filename}`;
                console.log(`🔄 Fixing localhost path: ${imageUrl} -> ${newUrl}`);
                hasChanges = true;
                return newUrl;
              }
            }
            return imageUrl;
          });
          
          if (hasChanges) {
            const updatedMetadata = {
              ...metadata,
              images: updatedImages
            };
            
            await prisma.message.update({
              where: { id: message.id },
              data: {
                metadata: JSON.stringify(updatedMetadata)
              }
            });
            
            updatedCount++;
            console.log(`✅ Updated message ${message.id} with ${updatedImages.length} images`);
          }
        }
      } catch (e) {
        console.error(`❌ Error processing message ${message.id}:`, e.message);
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} messages with fixed image URLs!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMetadataImageUrls();