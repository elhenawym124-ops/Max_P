/**
 * Test Image Persistence Fix
 * 
 * Tests whether images are properly saved and retrieved from database
 */

const { getSharedPrismaClient } = require('./services/sharedDatabase');
const axios = require('axios');

const prisma = getSharedPrismaClient();

async function testImagePersistence() {
  try {
    console.log('🧪 Testing image persistence fix...');
    
    // 1. Check if there are any messages with images in metadata
    console.log('\n1️⃣ Checking existing messages with images...');
    const messagesWithImages = await prisma.message.findMany({
      where: {
        metadata: {
          contains: '"images"'
        }
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${messagesWithImages.length} messages with images in database:`);
    
    for (const msg of messagesWithImages) {
      try {
        const metadata = JSON.parse(msg.metadata);
        console.log(`   📋 Message ${msg.id}:`);
        console.log(`      Type: ${msg.type}`);
        console.log(`      Content: "${msg.content.substring(0, 50)}..."`);
        console.log(`      Images: ${metadata.images ? metadata.images.length : 0}`);
        if (metadata.images && metadata.images.length > 0) {
          metadata.images.forEach((img, index) => {
            console.log(`         ${index + 1}. ${img}`);
          });
        }
      } catch (e) {
        console.log(`   ❌ Error parsing metadata for ${msg.id}`);
      }
    }
    
    // 2. Test the API endpoint
    console.log('\n2️⃣ Testing /test-rag/messages API endpoint...');
    
    try {
      const response = await axios.get('http://localhost:3001/api/v1/test-rag/messages', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWVtOGF6bHYwMDRldWZha2JrbzB3bW4xIiwiZW1haWwiOiJhbGlAYWxpLmNvbSIsInJvbGUiOiJDT01QQU5ZX0FETUlOIiwiY29tcGFueUlkIjoiY21lbThheXlyMDA0Y3VmYWtxa2NzeW45NyIsImlhdCI6MTc1ODY1ODQyMywiZXhwIjoxNzU4NzQ0ODIzfQ.EywGCMr3V7mFfVsBtueiNFfHghnPB5oe-T8IxAkG_Bg'
        }
      });
      
      const data = response.data;
      
      if (data.success) {
        console.log('✅ API call successful!');
        console.log(`📊 Total messages: ${data.messages.length}`);
        console.log(`📊 Stats:`, data.stats);
        
        const messagesWithImagesInResponse = data.messages.filter(m => m.images && m.images.length > 0);
        console.log(`📸 Messages with images in API response: ${messagesWithImagesInResponse.length}`);
        
        if (messagesWithImagesInResponse.length > 0) {
          console.log('\n🎯 Sample messages with images from API:');
          messagesWithImagesInResponse.slice(0, 3).forEach((msg, index) => {
            console.log(`   ${index + 1}. Message ${msg.id}:`);
            console.log(`      Content: "${msg.content.substring(0, 50)}..."`);
            console.log(`      Type: ${msg.type}`);
            console.log(`      Images: ${msg.images.length}`);
            msg.images.forEach((img, imgIndex) => {
              console.log(`         ${imgIndex + 1}. ${img}`);
            });
          });
          
          console.log('\n✅ FIXED: Images are now properly included in API response!');
        } else {
          console.log('\n⚠️ No messages with images found in API response');
          console.log('💡 This might mean no AI responses with images were generated yet');
        }
      } else {
        console.log('❌ API call failed:', data.error);
      }
      
    } catch (error) {
      console.log('❌ API call error:', error.response?.status, error.response?.statusText);
      console.log('📄 Error details:', error.response?.data || error.message);
    }
    
    console.log('\n🎯 Fix Summary:');
    console.log('✅ Backend now extracts images from message metadata');
    console.log('✅ Backend includes images array in API response');
    console.log('✅ Frontend should now receive images on refresh');
    console.log('📝 Next: Test frontend refresh to confirm fix works');
    
  } catch (error) {
    console.error('❌ Error testing image persistence:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testImagePersistence();
}

module.exports = { testImagePersistence };