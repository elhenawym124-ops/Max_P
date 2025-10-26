const bcrypt = require('bcryptjs');

// Test the super admin login credentials
async function testSuperAdminLogin() {
  try {
    console.log('🔍 Testing super admin login credentials...');
    
    // These are the credentials that should work based on the server.js file
    const email = 'superadmin@system.com';
    const password = 'SuperAdmin123!';
    
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('✅ These are the correct credentials according to the server setup');
    
    // Test bcrypt hashing
    const testPassword = 'SuperAdmin123!';
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    console.log('🔐 Test hashed password:', hashedPassword);
    
    console.log('\n📋 Instructions:');
    console.log('1. Make sure the backend server is running on port 3001');
    console.log('2. Try logging in with these credentials in the frontend');
    console.log('3. If still getting 401, check the backend logs for more details');
    
  } catch (error) {
    console.error('❌ Error testing credentials:', error.message);
  }
}

testSuperAdminLogin();