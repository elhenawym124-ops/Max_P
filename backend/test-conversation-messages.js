/**
 * Test API Endpoint to Check What Frontend Is Getting
 * 
 * This creates a test endpoint that mimics the conversation API
 * to see exactly what data the frontend is receiving
 */

const { PrismaClient } = require('@prisma/client');
const express = require('express');

const prisma = new PrismaClient();

async function testConversationMessages() {
  try {
    console.log('🔍 Testing what the frontend receives...');
    
    // Get recent messages like the frontend would
    const messages = await prisma.message.findMany({
      where: {
        conversationId: {
          in: ['cmfx3gdd8000buflwrgobbnim', 'ai-test'] // Common conversation IDs
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });
    
    console.log(`📊 Found ${messages.length} messages for frontend test:`);
    
    for (const message of messages) {
      console.log(`\n📋 Message ID: ${message.id}`);
      console.log(`   Type: ${message.type}`);
      console.log(`   Content: ${message.content.substring(0, 100)}...`);
      
      if (message.metadata) {
        try {
          const metadata = JSON.parse(message.metadata);
          if (metadata.images && Array.isArray(metadata.images)) {
            console.log(`   📸 Images (${metadata.images.length}):`);
            metadata.images.forEach((img, index) => {
              console.log(`     ${index + 1}. ${img}`);
              
              // Test URL format
              if (img.includes('files.easy-orders.net')) {
                console.log(`        ❌ Still external URL`);
              } else if (img.includes('/uploads/conversations/')) {
                console.log(`        ✅ Correct conversation URL`);
              } else if (img.includes('localhost:3001') && !img.includes('/uploads/')) {
                console.log(`        ⚠️ Incorrect localhost format (missing /uploads/)`);
              }
            });
          }
        } catch (e) {
          console.log(`   ❌ Error parsing metadata: ${e.message}`);
        }
      }
    }
    
    // Test the API endpoint that frontend calls
    console.log(`\n🌐 Testing API response format...`);
    
    const formattedMessages = messages.map(msg => {
      let images = [];
      if (msg.metadata) {
        try {
          const metadata = JSON.parse(msg.metadata);
          if (metadata.images && Array.isArray(metadata.images)) {
            images = metadata.images;
          }
        } catch (e) {
          console.warn('Failed to parse metadata for message:', msg.id);
        }
      }
      
      return {
        id: msg.id,
        content: msg.content,
        type: msg.type,
        senderId: msg.senderId,
        timestamp: msg.createdAt,
        images: images,
        metadata: msg.metadata
      };
    });
    
    console.log(`📤 API Response sample (first 3 messages):`);
    formattedMessages.slice(0, 3).forEach((msg, index) => {
      console.log(`${index + 1}. ID: ${msg.id}`);
      console.log(`   Type: ${msg.type}`);
      console.log(`   Images: ${JSON.stringify(msg.images)}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing conversation messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testConversationMessages();
}

module.exports = { testConversationMessages };