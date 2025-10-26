// Test JWT token decoding to see if it contains companyId
function testJwtToken() {
  try {
    // Get token from localStorage (this would be done in the browser)
    // For testing, let's simulate what the token might look like
    
    // Example JWT token structure (this is just for testing)
    // In a real scenario, you would get this from localStorage
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItaWQiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJmaXJzdE5hbWUiOiJKb2huIiwibGFzdE5hbWUiOiJEb2UiLCJjb21wYW55SWQiOiJjb21wYW55LWlkIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    
    console.log('Testing JWT token decoding...');
    
    // Split the token into parts
    const parts = token.split('.');
    console.log('Token parts:', parts.length);
    
    if (parts.length !== 3) {
      console.log('Invalid JWT token format');
      return;
    }
    
    // Decode the payload (second part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('Decoded payload:', payload);
    
    // Check if companyId exists
    if (payload.companyId) {
      console.log('✅ companyId found in token:', payload.companyId);
    } else {
      console.log('❌ companyId NOT found in token');
      console.log('Available fields:', Object.keys(payload));
    }
    
  } catch (error) {
    console.error('Error decoding JWT token:', error);
  }
}

testJwtToken();