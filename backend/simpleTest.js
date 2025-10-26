const axios = require('axios');

async function simpleTest() {
  try {
    console.log('🔍 Testing products access for super admin...');
    
    // First, let's login as super admin to get a token
    const loginData = {
      email: 'superadmin@system.com',
      password: 'SuperAdmin123!'
    };
    
    console.log('📤 Logging in as super admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/super-admin/login', loginData);
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful!');
      const token = loginResponse.data.data.token;
      console.log('🔑 Token:', token.substring(0, 20) + '...');
      
      // Test getting all products
      console.log('\n📤 Testing /api/v1/products endpoint...');
      try {
        const productsResponse = await axios.get('http://localhost:3001/api/v1/products', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (productsResponse.data.success) {
          console.log('✅ Products endpoint working!');
          console.log('📊 Products found:', productsResponse.data.data.length);
        }
      } catch (error) {
        console.log('❌ Products endpoint failed:', error.response?.data || error.message);
      }
      
      // Test getting product categories
      console.log('\n📤 Testing /api/v1/products/categories endpoint...');
      try {
        const categoriesResponse = await axios.get('http://localhost:3001/api/v1/products/categories', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (categoriesResponse.data.success) {
          console.log('✅ Categories endpoint working!');
          console.log('📊 Categories found:', categoriesResponse.data.data.length);
        } else {
          console.log('❌ Categories endpoint failed:', categoriesResponse.data);
        }
      } catch (error) {
        console.log('❌ Categories endpoint failed:', error.response?.data || error.message);
      }
      
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }
  } catch (error) {
    console.log('❌ Test failed:');
    if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Data:', error.response.data);
    } else {
      console.log('  Error:', error.message);
    }
  }
}

simpleTest();