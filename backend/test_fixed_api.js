/**
 * Test Gemini Key Addition API Endpoint
 * 
 * This script tests the fixed API endpoint to ensure it's working properly
 */

async function testGeminiKeyAPI() {
    try {
        console.log('🧪 Testing Gemini Key Addition API...');
        console.log('=' .repeat(50));
        
        // Step 1: Login to get authentication token
        console.log('🔐 Step 1: Authenticating...');
        
        const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'superadmin@system.com',
                password: 'SuperAdmin123!'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('Login response status:', loginResponse.status);
        
        if (!loginData.success) {
            console.log('❌ Login failed:', loginData.message);
            return;
        }
        
        const authToken = loginData.token;
        console.log('✅ Authentication successful');
        
        // Step 2: Test adding a Gemini key
        console.log('\n🔑 Step 2: Testing Gemini Key Addition...');
        
        const testKeyData = {
            name: 'API Test Key - Fixed',
            apiKey: 'AIzaSyChIIlqr04fB2SjZ8-JtrUq_Bc0VUcN0wI', // The real key from your request
            description: 'Test key after fixing the generateId issue'
        };
        
        console.log('📝 Request data:', {
            name: testKeyData.name,
            apiKey: testKeyData.apiKey.substring(0, 20) + '...',
            description: testKeyData.description
        });
        
        const addKeyResponse = await fetch('http://localhost:3001/api/v1/ai/gemini-keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(testKeyData)
        });
        
        console.log('API Response status:', addKeyResponse.status);
        console.log('API Response status text:', addKeyResponse.statusText);
        
        const responseText = await addKeyResponse.text();
        console.log('Raw response:', responseText);
        
        try {
            const jsonResponse = JSON.parse(responseText);
            console.log('\n📊 Parsed response:');
            console.log(JSON.stringify(jsonResponse, null, 2));
            
            if (jsonResponse.success) {
                console.log('\n🎉 SUCCESS! Gemini key was added successfully!');
                console.log('✅ Key ID:', jsonResponse.data.id);
                console.log('✅ Models created:', jsonResponse.data.modelsCreated);
                console.log('✅ Available models:', jsonResponse.data.models?.join(', '));
            } else {
                console.log('\n❌ API Error:', jsonResponse.error);
                console.log('Details:', jsonResponse.details);
            }
        } catch (parseError) {
            console.log('❌ Failed to parse JSON response');
            console.log('Parse error:', parseError.message);
        }
        
        // Step 3: Verify by getting all keys
        console.log('\n📋 Step 3: Verifying by retrieving all keys...');
        
        const getKeysResponse = await fetch('http://localhost:3001/api/v1/ai/gemini-keys', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const keysData = await getKeysResponse.json();
        console.log('Get keys response status:', getKeysResponse.status);
        
        if (keysData.success) {
            console.log(`✅ Found ${keysData.data.length} Gemini keys for the company`);
            keysData.data.forEach((key, index) => {
                console.log(`   ${index + 1}. ${key.name} (${key.apiKey}) - Priority: ${key.priority}`);
            });
        } else {
            console.log('❌ Failed to retrieve keys:', keysData.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error(error);
    }
}

// Run the test
testGeminiKeyAPI();