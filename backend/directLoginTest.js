const axios = require('axios');

async function testSuperAdminLogin() {
  try {
    console.log('🔍 Testing super admin login directly...');
    
    const loginData = {
      email: 'superadmin@system.com',
      password: 'SuperAdmin123!'
    };
    
    console.log('📤 Sending login request to: http://localhost:3001/api/v1/super-admin/login');
    console.log('📧 Email:', loginData.email);
    console.log('🔑 Password:', loginData.password);
    
    const response = await axios.post('http://localhost:3001/api/v1/super-admin/login', loginData);
    
    console.log('✅ Login successful!');
    console.log('📊 Response:', response.data);
    
  } catch (error) {
    console.log('❌ Login failed:');
    if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Data:', error.response.data);
    } else {
      console.log('  Error:', error.message);
    }
  }
}

testSuperAdminLogin();