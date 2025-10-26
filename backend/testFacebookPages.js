const axios = require('axios');

async function testFacebookPages() {
  try {
    console.log('🔍 Testing Facebook pages endpoint...');
    
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
      
      // Get all companies first to get a company ID
      console.log('\n📤 Getting all companies...');
      const companiesResponse = await axios.get('http://localhost:3001/api/v1/admin/companies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (companiesResponse.data.success && companiesResponse.data.data.companies.length > 0) {
        const companyId = companiesResponse.data.data.companies[0].id;
        console.log('🏢 Using company ID:', companyId);
        
        // Test getting Facebook pages for the company
        console.log('\n📤 Testing /api/v1/admin/companies/:companyId/facebook-pages endpoint...');
        try {
          const facebookPagesResponse = await axios.get(`http://localhost:3001/api/v1/admin/companies/${companyId}/facebook-pages`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (facebookPagesResponse.data.success) {
            console.log('✅ Facebook pages endpoint working!');
            console.log('📊 Facebook pages found:', facebookPagesResponse.data.data.length);
          }
        } catch (error) {
          console.log('❌ Facebook pages endpoint failed:', error.response?.data || error.message);
        }
      }
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testFacebookPages();