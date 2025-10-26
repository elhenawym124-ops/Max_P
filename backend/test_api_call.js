const express = require('express');
const productController = require('./controller/productController');

// Create a minimal express app for testing
const app = express();

// Simulate the exact request that's failing
async function testCategoriesApi() {
  console.log('Testing Categories API call...');
  
  // Create a mock request object that matches what the API receives
  const mockReq = {
    user: {
      companyId: 'cmfay1xh50041juer3vb4v5gg'
    }
  };
  
  // Create a mock response object to capture the response
  let responseStatus = null;
  let responseData = null;
  
  const mockRes = {
    status: function(code) {
      responseStatus = code;
      console.log(`Response status set to: ${code}`);
      return this;
    },
    json: function(data) {
      responseData = data;
      console.log(`Response data:`, JSON.stringify(data, null, 2));
      return this;
    }
  };
  
  try {
    console.log('Calling getCategory function...');
    await productController.getCategory(mockReq, mockRes);
    
    console.log(`\n✅ Test completed successfully`);
    console.log(`Final status: ${responseStatus}`);
    console.log(`Final data:`, JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    console.error('Error stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testCategoriesApi();