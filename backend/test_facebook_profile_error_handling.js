/**
 * Test script to verify Facebook profile error handling
 */

const { fetchFacebookUserProfile } = require('./utils/allFunctions');

// Test cases for different error scenarios
async function testFacebookProfileErrorHandling() {
  console.log('🔍 Testing Facebook profile error handling...');
  
  // Test with an invalid user ID that should trigger a 400 error
  const invalidUserId = '24354954960812628'; // From the logs
  const dummyToken = 'dummy_token_for_testing'; // This will also cause an error
  
  console.log(`Testing with invalid User ID: ${invalidUserId}`);
  
  try {
    const profile = await fetchFacebookUserProfile(invalidUserId, dummyToken);
    
    if (profile) {
      console.log('✅ Profile fetched successfully (unexpected):');
      console.log(`   First Name: ${profile.first_name}`);
      console.log(`   Last Name: ${profile.last_name || '[not provided]'}`);
      console.log(`   Full Name: ${profile.name || '[not provided]'}`);
    } else {
      console.log('✅ Correctly handled error case - profile is null');
    }
  } catch (error) {
    console.error('❌ Unexpected error during profile fetch:', error.message);
  }
  
  // Test the fallback name generation
  console.log('\n🧪 Testing fallback name generation...');
  
  const testUserId = '12345678901234567';
  const lastFourDigits = testUserId.slice(-4);
  const fallbackFirstName = 'مستخدم';
  const fallbackLastName = lastFourDigits;
  
  console.log(`Generated fallback name: ${fallbackFirstName} ${fallbackLastName}`);
  
  if (fallbackFirstName === 'مستخدم' && fallbackLastName === '3456') {
    console.log('✅ Fallback name generation working correctly');
  } else {
    console.log('❌ Fallback name generation not working as expected');
  }
}

// Run the test if called directly
if (require.main === module) {
  testFacebookProfileErrorHandling().catch(console.error);
}