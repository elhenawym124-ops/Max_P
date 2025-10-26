// Simple login test for ali@ali.com to get a working token

const axios = require('axios');

async function testLoginAndFacebookAPI() {
    try {
        console.log('🔍 [TEST] Testing login and Facebook API for ali@ali.com...');

        // Step 1: Login to get a valid token
        console.log('\n📋 [STEP 1] Logging in...');
        const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
            email: 'ali@ali.com',
            password: 'admin123'
        });

        if (!loginResponse.data.success) {
            console.log('❌ Login failed:', loginResponse.data);
            return;
        }

        const token = loginResponse.data.data.token;
        const user = loginResponse.data.data.user;
        
        console.log('✅ Login successful!');
        console.log('   User:', user.email, 'Company:', user.company.name);
        console.log('   Token:', token.substring(0, 50) + '...');

        // Step 2: Test /auth/me endpoint
        console.log('\n📋 [STEP 2] Testing /auth/me...');
        const meResponse = await axios.get('http://localhost:3001/api/v1/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ /auth/me successful!');
        console.log('   Response:', meResponse.data.data.email);

        // Step 3: Test Facebook pages API
        console.log('\n📋 [STEP 3] Testing Facebook pages API...');
        const pagesResponse = await axios.get('http://localhost:3001/api/v1/integrations/facebook/connected', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Facebook pages API successful!');
        console.log('   Status:', pagesResponse.status);
        console.log('   Response:', JSON.stringify(pagesResponse.data, null, 2));

        console.log('\n🎉 [RESULT] All tests passed! The issue is likely in the frontend token handling.');

    } catch (error) {
        console.error('❌ [ERROR] Test failed:');
        console.error('   Status:', error.response?.status);
        console.error('   Data:', error.response?.data);
        console.error('   Message:', error.message);
    }
}

// Run the test
testLoginAndFacebookAPI();