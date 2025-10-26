const axios = require('axios');

async function testApiEndpoints() {
  const baseUrl = 'http://localhost:3001/api/v1/monitor/quality';
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWVtOGF6bHYwMDRldWZha2JrbzB3bW4xIiwiZW1haWwiOiJhbGlAYWxpLmNvbSIsInJvbGUiOiJDT01QQU5ZX0FETUlOIiwiY29tcGFueUlkIjoiY21lbThhenlycjAwNGN1ZmFrcWtjc3luOTciLCJpYXQiOjE3NTYwMDY0MDAsImV4cCI6OTk5OTk5OTk5OX0.mock-signature-for-dev';
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('🔍 Testing quality monitoring API endpoints...\n');

    // 1. Test initial stats (should be empty)
    console.log('1. Testing initial stats...');
    const initialStats = await axios.get(`${baseUrl}/stats`, { headers });
    console.log('✅ Initial stats retrieved successfully');
    console.log('Initial responses count:', initialStats.data.data.responses.totalResponses);

    // 2. Log a response
    console.log('\n2. Logging a response...');
    const logResponse = await axios.post(`${baseUrl}/response`, {
      messageId: 'api-test-msg-1',
      conversationId: 'api-test-conv-1',
      metrics: {
        responseTime: 1800,
        contentLength: 300,
        hasImages: false,
        intent: 'shipping_inquiry',
        confidence: 0.88,
        model: 'gemini-2.0-flash',
        ragUsed: true
      }
    }, { headers });
    
    console.log('✅ Response logged successfully');
    console.log('Log response result:', logResponse.data.message);

    // 3. Test stats after logging (should show 1 response)
    console.log('\n3. Testing stats after logging response...');
    const updatedStats = await axios.get(`${baseUrl}/stats`, { headers });
    console.log('✅ Updated stats retrieved successfully');
    console.log('Updated responses count:', updatedStats.data.data.responses.totalResponses);
    console.log('Unrated responses:', updatedStats.data.data.responses.unrated);

    // 4. Test performance metrics
    console.log('\n4. Testing performance metrics...');
    const performance = await axios.get(`${baseUrl}/performance`, { headers });
    console.log('✅ Performance metrics retrieved successfully');
    console.log('Average response time:', performance.data.data.responseTime.average);

    console.log('\n🎉 All API endpoint tests passed!');

  } catch (error) {
    console.error('❌ Error testing API endpoints:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testApiEndpoints();