const { login } = require('./controller/authController');
const { getSharedPrismaClient } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');

// Mock request and response objects
const mockReq = {
  body: {
    email: 'ali@ali.com',
    password: 'admin123'
  },
  headers: {}
};

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.data = data;
    console.log(`Status: ${this.statusCode}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return this;
  }
};

async function testLogin() {
  console.log('🔍 Testing login function directly...');
  
  try {
    await login(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Error in login function:', error);
  }
}

testLogin();