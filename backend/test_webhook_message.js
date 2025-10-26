const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testWebhookMessage() {
  try {
    console.log('=== Testing Webhook Message Processing ===');
    
    // Simulate a Facebook message webhook event
    const webhookEvent = {
      sender: { id: '7860282113999106' }, // The sender from recent logs
      recipient: { id: '189010987632941' }, // The page from recent logs
      message: {
        text: 'مرحبا، عايز اعرف الاسعار',
        mid: 'test_message_' + Date.now()
      },
      timestamp: Date.now()
    };
    
    console.log('📨 Simulating webhook event:', webhookEvent);
    
    // Import and call the handleFacebookMessage function directly
    const { handleFacebookMessage } = require('./utils/allFunctions');
    
    console.log('🤖 Processing with AI...');
    await handleFacebookMessage(webhookEvent, '189010987632941');
    
    console.log('✅ Webhook message processing test completed');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
  }
}

testWebhookMessage();