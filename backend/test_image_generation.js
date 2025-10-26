const MultimodalService = require('./services/multimodalService');
const aiAgentService = require('./services/aiAgentService');

async function testImageGeneration() {
  console.log('🧪 Testing image generation with multiple colors...');
  
  // Initialize services
  const multimodalService = new MultimodalService();
  
  // Test product description
  const productDescription = 'حذاء رياضي';
  
  // Test with multiple colors
  const requestedColors = ['أحمر', 'أزرق', 'أخضر'];
  
  console.log(`🎨 Requesting images for product: ${productDescription}`);
  console.log(`🌈 Requested colors: ${requestedColors.join(', ')}`);
  
  try {
    // Test image generation
    const generatedImages = await multimodalService.generateProductImagesWithColors(
      productDescription, 
      requestedColors
    );
    
    console.log(`✅ Generated ${generatedImages.length} images`);
    
    // Log image details
    generatedImages.forEach((image, index) => {
      console.log(`📸 Image ${index + 1}:`);
      console.log(`   Title: ${image.payload.title}`);
      console.log(`   Variant: ${image.payload.variantName}`);
      console.log(`   URL length: ${image.payload.url.length} characters`);
    });
    
    // Test filtering with AI agent service
    console.log('\n🔍 Testing color filtering...');
    const filteredImages = await aiAgentService.filterImagesByColor(
      generatedImages,
      'أريد الحذاء بلون أحمر وأزرق وأخضر',
      'test-company-id'
    );
    
    console.log(`✅ Filtered ${filteredImages.length} images`);
    
    filteredImages.forEach((image, index) => {
      console.log(`📸 Filtered Image ${index + 1}:`);
      console.log(`   Title: ${image.payload.title}`);
      console.log(`   Variant: ${image.payload.variantName}`);
    });
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Run the test
testImageGeneration();