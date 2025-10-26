const axios = require('axios');

async function testEndpoints() {
  try {
    console.log('🔍 Testing endpoints...');
    
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
      
      // Test getting all companies (admin endpoint)
      console.log('\n📤 Testing /api/v1/admin/companies endpoint...');
      try {
        const companiesResponse = await axios.get('http://localhost:3001/api/v1/admin/companies', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (companiesResponse.data.success) {
          console.log('✅ Companies endpoint working!');
          console.log('📊 Companies found:', companiesResponse.data.data.companies.length);
        }
      } catch (error) {
        console.log('❌ Companies endpoint failed:', error.response?.data || error.message);
      }
      
      // Test getting current company
      console.log('\n📤 Testing /api/v1/companies/current endpoint...');
      try {
        const currentCompanyResponse = await axios.get('http://localhost:3001/api/v1/companies/current', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (currentCompanyResponse.data.success) {
          console.log('✅ Current company endpoint working!');
          console.log('🏢 Company name:', currentCompanyResponse.data.data.name);
        }
      } catch (error) {
        console.log('❌ Current company endpoint failed:', error.response?.data || error.message);
      }
      
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testEndpoints();