/**
 * Test script to verify Facebook profile fetching with a proper access token
 */

const { fetchFacebookUserProfile } = require('./utils/allFunctions');

async function testFacebookProfileWithToken() {
  console.log('🔍 Testing Facebook profile fetching with proper access token...');
  
  // You would need to replace these with actual values
  const testUserId = '453471574524139'; // Example user ID
  const testPageAccessToken = 'YOUR_ACTUAL_PAGE_ACCESS_TOKEN'; // Replace with actual token
  
  console.log(`Testing with User ID: ${testUserId}`);
  console.log(`Token length: ${testPageAccessToken.length}`);
  
  // Check if token looks valid
  if (testPageAccessToken.includes('simple_chat_verify_token_2025')) {
    console.log('❌ Error: This looks like the webhook verification token, not a page access token');
    console.log('Please use a proper Facebook Page Access Token');
    return;
  }
  
  if (testPageAccessToken.length < 50) {
    console.log('⚠️ Warning: This token seems unusually short for a Facebook Page Access Token');
  }
  
  try {
    const profile = await fetchFacebookUserProfile(testUserId, testPageAccessToken);
    
    if (profile) {
      console.log('✅ Profile fetched successfully:');
      console.log(`   First Name: ${profile.first_name}`);
      console.log(`   Last Name: ${profile.last_name || '[not provided]'}`);
      console.log(`   Full Name: ${profile.name || '[not provided]'}`);
    } else {
      console.log('❌ Failed to fetch profile');
      console.log('This could be due to:');
      console.log('1. Invalid access token');
      console.log('2. User privacy settings');
      console.log('3. User has blocked the page');
      console.log('4. Network issues');
    }
  } catch (error) {
    console.error('❌ Error during profile fetch:', error.message);
  }
}

// Run the test if called directly
if (require.main === module) {
  testFacebookProfileWithToken().catch(console.error);
}