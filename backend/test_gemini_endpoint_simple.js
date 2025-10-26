/**
 * Simple test for Gemini Key Addition API endpoint
 * This will trigger the actual request and show us the real error
 */

const axios = require('axios');

async function testGeminiEndpoint() {
    try {
        console.log('🧪 Testing Gemini Key Addition Endpoint...');
        
        // Test data matching what frontend sends
        const testData = {
            name: "ali2",
            apiKey: "AIzaSyChIIlqr04fB2SjZ8-JtrUq_Bc0VUcN0wI",
            description: "",
            model: "gemini-2.5-flash",
            companyId: "cmem8ayyr004cufakqkcsyn97"
        };
        
        // Use a valid JWT token (you'll need to replace this with a current one)
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWVtOGF6bHYwMDRldWZha2JrbzB3bW4xIiwiZW1haWwiOiJhbGlAYWxpLmNvbSIsInJvbGUiOiJDT01QQU5ZX0FETUlOIiwiY29tcGFueUlkIjoiY21lbThhenlmb3NlaTI0Z2ZydnNhZyIsImlhdCI6MTc1ODM5NzE5MSwiZXhwIjoxNzU4NDgzNTkxfQ.mTDJZ9O1iIhM9rSDbxVHS26eIV24DEY8Cf2uak4WaAU";
        
        console.log('📤 Sending POST request...');
        console.log('Data:', JSON.stringify(testData, null, 2));
        
        const response = await axios.post(
            'http://localhost:3001/api/v1/ai/gemini-keys',
            testData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    companyId: 'cmem8ayyr004cufakqkcsyn97'
                }
            }
        );
        
        console.log('✅ Success!');
        console.log('Response:', response.data);
        
    } catch (error) {
        console.log('❌ Error occurred:');
        console.log('Status:', error.response?.status);
        console.log('Status Text:', error.response?.statusText);
        console.log('Error Data:', error.response?.data);
        console.log('Error Message:', error.message);
        
        if (error.response?.data) {
            console.log('\n📋 Detailed Error Response:');
            console.log(JSON.stringify(error.response.data, null, 2));
        }
    }
}

testGeminiEndpoint();