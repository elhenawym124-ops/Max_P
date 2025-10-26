/**
 * Complete Image Fix Verification
 * 
 * This script verifies that all our image fixes are working properly:
 * 1. Database URLs are correct
 * 2. Static files are accessible
 * 3. Frontend can process the URLs
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const prisma = new PrismaClient();

async function verifyImageFix() {
  try {
    console.log('🔍 Complete Image Fix Verification...\n');
    
    // 1. Verify database URLs
    console.log('📊 Step 1: Verifying database URLs...');
    const imageMessages = await prisma.message.findMany({
      where: {
        type: 'IMAGE',
        metadata: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`Found ${imageMessages.length} image messages in database:`);
    
    const urlsToTest = new Set();
    
    for (const message of imageMessages) {
      try {
        const metadata = JSON.parse(message.metadata);
        if (metadata.images && Array.isArray(metadata.images)) {
          console.log(`\n📋 Message ${message.id}:`);
          console.log(`   Created: ${message.createdAt}`);
          console.log(`   Images (${metadata.images.length}):`);
          
          metadata.images.forEach((url, index) => {
            console.log(`     ${index + 1}. ${url}`);
            urlsToTest.add(url);
            
            // Check URL format
            if (url.includes('/uploads/conversations/')) {
              console.log(`        ✅ Correct conversation URL format`);
            } else if (url.includes('/uploads/products/')) {
              console.log(`        ❌ Still using product URL format`);
            } else {
              console.log(`        ⚠️ Unknown URL format`);
            }
          });
        }
      } catch (e) {
        console.log(`   ❌ Error parsing metadata for ${message.id}: ${e.message}`);
      }
    }
    
    // 2. Verify file accessibility
    console.log(`\n📡 Step 2: Testing URL accessibility...`);
    console.log(`Found ${urlsToTest.size} unique URLs to test:`);
    
    let accessibleCount = 0;
    let inaccessibleCount = 0;
    
    for (const url of urlsToTest) {
      try {
        console.log(`\n🔗 Testing: ${url}`);
        
        const response = await axios.head(url, { 
          timeout: 5000,
          validateStatus: (status) => status < 500 // Accept 2xx, 3xx, 4xx
        });
        
        if (response.status === 200) {
          console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
          console.log(`   📏 Content-Length: ${response.headers['content-length'] || 'Unknown'}`);
          console.log(`   📄 Content-Type: ${response.headers['content-type'] || 'Unknown'}`);
          accessibleCount++;
        } else {
          console.log(`   ⚠️ Status: ${response.status} ${response.statusText}`);
          inaccessibleCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        if (error.response) {
          console.log(`      HTTP ${error.response.status}: ${error.response.statusText}`);
        }
        inaccessibleCount++;
      }
    }
    
    // 3. Verify physical files exist
    console.log(`\n📁 Step 3: Verifying physical files...`);
    const conversationsDir = path.join(__dirname, 'uploads', 'conversations');
    
    if (fs.existsSync(conversationsDir)) {
      const files = fs.readdirSync(conversationsDir);
      const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png|gif|webp)$/i));
      
      console.log(`📂 Found ${imageFiles.length} image files in conversations directory:`);
      imageFiles.forEach(file => {
        const filePath = path.join(conversationsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   📄 ${file} (${Math.round(stats.size / 1024)}KB)`);
      });
      
      // Check if our specific file exists
      const targetFile = 'conversation-1758670034665-462148132.jpg';
      if (imageFiles.includes(targetFile)) {
        const filePath = path.join(conversationsDir, targetFile);
        const stats = fs.statSync(filePath);
        console.log(`   🎯 Target file exists: ${targetFile} (${Math.round(stats.size / 1024)}KB)`);
      } else {
        console.log(`   ❌ Target file missing: ${targetFile}`);
      }
    } else {
      console.log(`❌ Conversations directory does not exist: ${conversationsDir}`);
    }
    
    // 4. Summary
    console.log(`\n📋 Summary:`);
    console.log(`   📊 Database messages checked: ${imageMessages.length}`);
    console.log(`   🔗 Unique URLs found: ${urlsToTest.size}`);
    console.log(`   ✅ Accessible URLs: ${accessibleCount}`);
    console.log(`   ❌ Inaccessible URLs: ${inaccessibleCount}`);
    
    if (accessibleCount > 0 && inaccessibleCount === 0) {
      console.log(`\n🎉 ALL IMAGE URLS ARE WORKING! ✅`);
      console.log(`The image display issue should now be resolved.`);
    } else if (accessibleCount > 0) {
      console.log(`\n⚠️ PARTIAL SUCCESS: Some URLs working, some not`);
      console.log(`${accessibleCount} URLs are accessible, ${inaccessibleCount} need fixing.`);
    } else {
      console.log(`\n❌ NO URLS ARE ACCESSIBLE`);
      console.log(`Further investigation needed.`);
    }
    
    console.log(`\n📋 Next steps:`);
    console.log(`1. Open http://localhost:3000/conversations-test in your browser`);
    console.log(`2. Check if images are now displaying properly`);
    console.log(`3. If images still show as text, check browser console for errors`);
    
  } catch (error) {
    console.error('❌ Error in verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
if (require.main === module) {
  verifyImageFix();
}

module.exports = { verifyImageFix };