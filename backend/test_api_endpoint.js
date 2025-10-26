const fetch = require('node-fetch');

async function testApiEndpoint() {
    try {
        console.log('🔍 Testing real API endpoint...');
        
        // First, let's get a valid auth token by logging in
        console.log('📝 Step 1: Login to get auth token...');
        
        const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'ali@ali.com',
                password: 'ali123'  // You might need to adjust this password
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('Login response status:', loginResponse.status);
        console.log('Login response:', loginData);
        
        if (!loginData.success) {
            console.log('❌ Login failed, cannot test API endpoint');
            return;
        }
        
        const authToken = loginData.token;
        console.log('✅ Got auth token:', authToken.substring(0, 20) + '...');
        
        // Now test the Gemini keys endpoint
        console.log('\n📝 Step 2: Test adding Gemini key...');
        
        const testKeyData = {
            name: 'API Test Key',
            apiKey: 'fake_api_key_test_Test_Key_123',
            description: 'Test key from direct API call',
        };
        
        console.log('Request data:', testKeyData);
        
        const addKeyResponse = await fetch('http://localhost:3001/api/v1/ai/gemini-keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(testKeyData)
        });
        
        console.log('Add key response status:', addKeyResponse.status);
        
        const addKeyData = await addKeyResponse.text(); // Get as text first to see raw response
        console.log('Raw response:', addKeyData);
        
        try {
            const jsonData = JSON.parse(addKeyData);
            console.log('Parsed response:', jsonData);
        } catch (parseError) {
            console.log('❌ Failed to parse JSON response');
        }
        
    } catch (error) {
        console.error('❌ Error testing API endpoint:', error.message);
        console.error(error);
    }
}

testApiEndpoint();