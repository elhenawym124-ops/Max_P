/**
 * Test script to verify Facebook profile fetching functionality
 */

const { fetchFacebookUserProfile } = require('./utils/allFunctions');

// Test function
async function testFacebookProfileFetch() {
  console.log('🔍 Testing Facebook profile fetching...');
  
  // You would need to replace these with actual values from your system
  const testUserId = '453471574524139'; // Example user ID
  const testPageAccessToken = 'YOUR_PAGE_ACCESS_TOKEN'; // Replace with actual token
  
  console.log(`Testing with User ID: ${testUserId}`);
  
  try {
    const profile = await fetchFacebookUserProfile(testUserId, testPageAccessToken);
    
    if (profile) {
      console.log('✅ Profile fetched successfully:');
      console.log(`   First Name: ${profile.first_name}`);
      console.log(`   Last Name: ${profile.last_name || '[not provided]'}`);
      console.log(`   Full Name: ${profile.name || '[not provided]'}`);
    } else {
      console.log('❌ Failed to fetch profile');
    }
  } catch (error) {
    console.error('❌ Error during profile fetch:', error.message);
  }
}

// Run the test if called directly
if (require.main === module) {
  testFacebookProfileFetch().catch(console.error);
}