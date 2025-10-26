const axios = require('axios');

async function checkDevSetup() {
  try {
    console.log('🔍 CHECKING DEVELOPMENT SETUP');
    console.log('=' * 40);
    
    // Check if backend is running
    console.log('1. 🧪 Checking backend server...');
    try {
      const response = await axios.get('http://localhost:3001/health', { timeout: 5000 });
      console.log('   ✅ Backend server is running');
      console.log(`   Status: ${response.status}`);
    } catch (error) {
      console.log('   ❌ Backend server is NOT running');
      console.log('   Please start it with: node server.js');
      return;
    }
    
    // Check webhook endpoint
    console.log('\n2. 🔗 Checking webhook endpoint...');
    try {
      const webhookResponse = await axios.get('http://localhost:3001/webhook', {
        params: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'simple_chat_verify_token_2025',
          'hub.challenge': 'test_123'
        },
        timeout: 5000
      });
      
      if (webhookResponse.data === 'test_123') {
        console.log('   ✅ Webhook endpoint working correctly');
      } else {
        console.log('   ⚠️ Webhook endpoint responding incorrectly');
      }
    } catch (error) {
      console.log('   ❌ Webhook endpoint failed');
      console.log(`   Error: ${error.message}`);
    }
    
    // Check Facebook page in database
    console.log('\n3. 📄 Checking ns store 3 page in database...');
    try {
      const { getSharedPrismaClient } = require('./services/sharedDatabase');
      const prisma = getSharedPrismaClient();
      
      const page = await prisma.facebookPage.findUnique({
        where: { pageId: '453471574524139' }
      });
      
      if (page) {
        console.log('   ✅ ns store 3 page found in database');
        console.log(`   Name: ${page.pageName}`);
        console.log(`   Status: ${page.status}`);
        console.log(`   Token length: ${page.pageAccessToken?.length || 0}`);
      } else {
        console.log('   ❌ ns store 3 page not found in database');
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.log('   ❌ Database check failed');
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. ✅ Make sure ngrok is running: ngrok http 3001');
    console.log('2. ✅ Copy the ngrok HTTPS URL (e.g., https://abc123.ngrok.io)');
    console.log('3. ✅ Run the ngrok test script and paste the URL');
    console.log('4. ✅ Configure Facebook Developer Console with ngrok URL');
    
  } catch (error) {
    console.error('❌ Error checking setup:', error);
  }
}

// Run the check
if (require.main === module) {
  checkDevSetup();
}

module.exports = { checkDevSetup };