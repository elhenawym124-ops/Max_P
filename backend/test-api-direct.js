const axios = require('axios');

async function testAPIDirectly() {
  try {
    console.log('🧪 Testing API directly with detailed inspection...');
    
    const response = await axios.get('http://localhost:3001/api/v1/test-rag/messages', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWVtOGF6bHYwMDRldWZha2JrbzB3bW4xIiwiZW1haWwiOiJhbGlAYWxpLmNvbSIsInJvbGUiOiJDT01QQU5ZX0FETUlOIiwiY29tcGFueUlkIjoiY21lbThheXlyMDA0Y3VmYWtxa2NzeW45NyIsImlhdCI6MTc1ODY1ODQyMywiZXhwIjoxNzU4NzQ0ODIzfQ.EywGCMr3V7mFfVsBtueiNFfHghnPB5oe-T8IxAkG_Bg'
      }
    });
    
    const data = response.data;
    
    if (data.success) {
      console.log('✅ API Response received');
      console.log(`📊 Total messages: ${data.messages.length}`);
      
      // Check first few messages for image properties
      console.log('\n🔍 Checking first 5 messages for image properties:');
      
      data.messages.slice(0, 5).forEach((msg, index) => {
        console.log(`\n${index + 1}. Message ${msg.id}:`);
        console.log(`   Type: ${msg.type}`);
        console.log(`   IsAiGenerated: ${msg.isAiGenerated}`);
        console.log(`   Has images property: ${!!msg.images}`);
        console.log(`   Images array: ${msg.images ? JSON.stringify(msg.images) : 'undefined'}`);
        console.log(`   Has metadata property: ${!!msg.metadata}`);
        
        if (msg.metadata) {
          try {
            const metadata = JSON.parse(msg.metadata);
            console.log(`   Metadata has images: ${!!metadata.images}`);
            if (metadata.images) {
              console.log(`   Metadata images: ${JSON.stringify(metadata.images)}`);
            }
          } catch (e) {
            console.log(`   Error parsing metadata: ${e.message}`);
          }
        }
      });
      
      // Check specifically for messages that should have images
      const messagesWithImages = data.messages.filter(m => {
        return m.images && m.images.length > 0;
      });
      
      console.log(`\n📸 Messages with images in response: ${messagesWithImages.length}`);
      
      if (messagesWithImages.length > 0) {
        console.log('\n🎯 Messages with images:');
        messagesWithImages.forEach((msg, index) => {
          console.log(`${index + 1}. ${msg.id} - ${msg.images.length} images`);
        });
      } else {
        console.log('\n⚠️ No messages with images found in response');
        
        // Check if any messages have metadata with images
        const messagesWithMetadataImages = data.messages.filter(m => {
          if (m.metadata) {
            try {
              const metadata = JSON.parse(m.metadata);
              return metadata.images && metadata.images.length > 0;
            } catch (e) {
              return false;
            }
          }
          return false;
        });
        
        console.log(`📋 Messages with images in metadata: ${messagesWithMetadataImages.length}`);
        
        if (messagesWithMetadataImages.length > 0) {
          console.log('💡 Found images in metadata but not in response - backend fix may not be loaded');
        }
      }
      
    } else {
      console.log('❌ API call failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ API call error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status, error.response.statusText);
      console.error('Data:', error.response.data);
    }
  }
}

testAPIDirectly();