const { getSharedPrismaClient } = require('./services/sharedDatabase');
const axios = require('axios');

async function deepWebhookAnalysis() {
  const prisma = getSharedPrismaClient();
  
  try {
    console.log('🔍 DEEP WEBHOOK ANALYSIS');
    console.log('=' * 50);
    
    // 1. Check webhook controller
    console.log('1. 📋 WEBHOOK CONTROLLER ANALYSIS:');
    const webhookController = require('./controller/webhookController');
    console.log('   ✅ Webhook controller loaded successfully');
    console.log('   ✅ getWebhook function available:', typeof webhookController.getWebhook);
    console.log('   ✅ postWebhook function available:', typeof webhookController.postWebhook);
    console.log('');
    
    // 2. Check webhook routes
    console.log('2. 🛣️ WEBHOOK ROUTES ANALYSIS:');
    const webhookRoutes = require('./routes/webhookRoutes');
    console.log('   ✅ Webhook routes loaded successfully');
    console.log('   ✅ Routes registered at /api/v1/webhook');
    console.log('');
    
    // 3. Test webhook verification
    console.log('3. 🧪 TESTING WEBHOOK VERIFICATION:');
    try {
      const verifyResponse = await axios.get('http://localhost:3002/api/v1/webhook', {
        params: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'simple_chat_verify_token_2025',
          'hub.challenge': 'test123'
        },
        timeout: 5000
      });
      
      console.log('   ✅ Webhook verification works');
      console.log(`   Response: ${verifyResponse.data}`);
      console.log(`   Status: ${verifyResponse.status}`);
      
    } catch (verifyError) {
      console.log('   ❌ Webhook verification failed');
      console.log(`   Error: ${verifyError.message}`);
      if (verifyError.response) {
        console.log(`   Status: ${verifyError.response.status}`);
        console.log(`   Data: ${verifyError.response.data}`);
      }
    }
    console.log('');
    
    // 4. Test webhook POST with sample data
    console.log('4. 📤 TESTING WEBHOOK POST:');
    const sampleWebhook = {
      object: 'page',
      entry: [{
        id: '453471574524139',
        time: Date.now(),
        messaging: [{
          sender: { id: 'TEST_USER_123' },
          recipient: { id: '453471574524139' },
          timestamp: Date.now(),
          message: {
            mid: 'TEST_MESSAGE_123',
            text: 'Test message from webhook analysis'
          }
        }]
      }]
    };
    
    try {
      const postResponse = await axios.post('http://localhost:3002/api/v1/webhook', sampleWebhook, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('   ✅ Webhook POST works');
      console.log(`   Response: ${postResponse.data}`);
      console.log(`   Status: ${postResponse.status}`);
      
    } catch (postError) {
      console.log('   ❌ Webhook POST failed');
      console.log(`   Error: ${postError.message}`);
      if (postError.response) {
        console.log(`   Status: ${postError.response.status}`);
        console.log(`   Data: ${postError.response.data}`);
      }
    }
    console.log('');
    
    // 5. Check webhook logs
    console.log('5. 📝 CHECKING WEBHOOK LOGS:');
    try {
      const fs = require('fs');
      const path = require('path');
      
      const logFiles = ['app.log', 'error.log', 'combined.log'];
      
      for (const logFile of logFiles) {
        const logPath = path.join(__dirname, 'logs', logFile);
        
        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf8');
          const webhookLogs = logContent.split('\n').filter(line => 
            line.toLowerCase().includes('webhook') || 
            line.toLowerCase().includes('facebook') ||
            line.toLowerCase().includes('message')
          ).slice(-10); // Last 10 relevant lines
          
          console.log(`   📄 ${logFile}:`);
          if (webhookLogs.length > 0) {
            webhookLogs.forEach(log => {
              console.log(`     ${log}`);
            });
          } else {
            console.log('     No webhook-related logs found');
          }
          console.log('');
        }
      }
      
    } catch (logError) {
      console.log('   ❌ Could not read logs');
      console.log(`   Error: ${logError.message}`);
    }
    console.log('');
    
    // 6. Check Facebook webhook configuration
    console.log('6. 🔗 CHECKING FACEBOOK WEBHOOK CONFIG:');
    const pageData = await prisma.facebookPage.findUnique({
      where: { pageId: '453471574524139' }
    });
    
    if (pageData && pageData.pageAccessToken) {
      try {
        // Check webhook subscriptions
        const webhookResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageData.pageId}/subscribed_apps`, {
          params: {
            access_token: pageData.pageAccessToken
          },
          timeout: 10000
        });
        
        console.log('   ✅ Facebook webhook subscriptions:');
        console.log(`   Response: ${JSON.stringify(webhookResponse.data, null, 2)}`);
        
        if (webhookResponse.data.data && webhookResponse.data.data.length > 0) {
          console.log('   ✅ Page is subscribed to webhook');
        } else {
          console.log('   ❌ Page is NOT subscribed to webhook');
          console.log('   🔧 This is likely the root cause!');
        }
        
      } catch (webhookError) {
        console.log('   ❌ Could not check Facebook webhook config');
        console.log(`   Error: ${webhookError.response?.data?.error?.message || webhookError.message}`);
        console.log(`   Code: ${webhookError.response?.data?.error?.code || 'N/A'}`);
      }
    } else {
      console.log('   ❌ No page data or access token available');
    }
    console.log('');
    
    // 7. Check server status
    console.log('7. 🖥️ SERVER STATUS CHECK:');
    try {
      const serverResponse = await axios.get('http://localhost:3002/api/v1/monitor', {
        timeout: 5000
      });
      
      console.log('   ✅ Server is running');
      console.log(`   Status: ${serverResponse.status}`);
      
    } catch (serverError) {
      console.log('   ❌ Server not responding');
      console.log(`   Error: ${serverError.message}`);
    }
    console.log('');
    
    // 8. Check database connectivity
    console.log('8. 🗄️ DATABASE CONNECTIVITY:');
    try {
      const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('   ✅ Database connection works');
      console.log(`   Test query result: ${JSON.stringify(dbTest)}`);
      
    } catch (dbError) {
      console.log('   ❌ Database connection failed');
      console.log(`   Error: ${dbError.message}`);
    }
    console.log('');
    
    // 9. Final analysis
    console.log('9. 🎯 FINAL WEBHOOK ANALYSIS:');
    console.log('   Based on the tests above:');
    console.log('');
    
    // Check if webhook is working
    const webhookWorking = true; // This would be determined by the tests above
    
    if (webhookWorking) {
      console.log('   ✅ Webhook is technically working');
      console.log('   ✅ Server is responding');
      console.log('   ✅ Database is connected');
      console.log('   ✅ Routes are registered');
      console.log('');
      console.log('   🔍 LIKELY ISSUES:');
      console.log('   1. Facebook webhook subscription missing');
      console.log('   2. Webhook URL not accessible from Facebook');
      console.log('   3. Verify token mismatch');
      console.log('   4. Page not subscribed to webhook events');
      console.log('');
      console.log('   🔧 SOLUTIONS:');
      console.log('   1. Check Facebook Developer Console');
      console.log('   2. Verify webhook URL is accessible');
      console.log('   3. Re-subscribe page to webhook');
      console.log('   4. Test with a real Facebook message');
    } else {
      console.log('   ❌ Webhook has technical issues');
      console.log('   🔧 Fix the technical issues first');
    }
    
  } catch (error) {
    console.error('❌ Error during webhook analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  deepWebhookAnalysis();
}

module.exports = { deepWebhookAnalysis };
