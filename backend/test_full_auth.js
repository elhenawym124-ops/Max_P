const jwt = require('jsonwebtoken');
const { login, me } = require('./controller/authController');

// Mock request and response objects for login
const loginReq = {
  body: {
    email: 'ali@ali.com',
    password: 'admin123'
  },
  headers: {}
};

let loginToken = null;

const loginRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.data = data;
    console.log(`Login Status: ${this.statusCode}`);
    if (data.success && data.data && data.data.token) {
      loginToken = data.data.token;
      console.log('✅ Login successful, token obtained');
    } else {
      console.log('Login Response:', JSON.stringify(data, null, 2));
    }
    return this;
  }
};

// Mock request and response objects for me
const meReq = {
  headers: {}
};

const meRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.data = data;
    console.log(`Me Status: ${this.statusCode}`);
    if (data.success) {
      console.log('✅ Me endpoint successful');
      console.log('User data:', JSON.stringify(data.data, null, 2));
    } else {
      console.log('Me Response:', JSON.stringify(data, null, 2));
    }
    return this;
  }
};

async function testFullAuth() {
  console.log('🔍 Testing full authentication flow...');
  
  try {
    // Test login
    console.log('\n1. Testing login...');
    await login(loginReq, loginRes);
    
    if (!loginToken) {
      console.log('❌ Failed to get token from login');
      return;
    }
    
    // Test me endpoint
    console.log('\n2. Testing me endpoint...');
    meReq.headers.authorization = `Bearer ${loginToken}`;
    await me(meReq, meRes);
    
    console.log('\n✅ Full authentication flow test completed');
    
  } catch (error) {
    console.error('❌ Error in authentication flow:', error);
  }
}

testFullAuth();