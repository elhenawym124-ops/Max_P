/**
 * Script to check and fix Facebook page tokens in the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFacebookPageTokens() {
  try {
    console.log('🔍 Checking Facebook page tokens...');
    
    // Get all Facebook pages
    const facebookPages = await prisma.facebookPage.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        pageAccessToken: true,
        status: true,
        companyId: true,
        connectedAt: true
      }
    });

    console.log(`📊 Found ${facebookPages.length} Facebook pages`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const page of facebookPages) {
      console.log(`\n📄 Checking page: ${page.pageName} (${page.pageId})`);
      
      // Check if token exists
      if (!page.pageAccessToken) {
        console.log(`❌ No access token for page ${page.pageName}`);
        errorCount++;
        continue;
      }
      
      // Check if token looks valid (not the verification token)
      if (page.pageAccessToken.includes('simple_chat_verify_token_2025')) {
        console.log(`❌ Page ${page.pageName} has webhook verification token instead of page access token`);
        console.log(`   Current token: ${page.pageAccessToken.substring(0, 50)}...`);
        errorCount++;
        continue;
      }
      
      // Check token length (page access tokens are usually quite long)
      if (page.pageAccessToken.length < 50) {
        console.log(`⚠️ Page ${page.pageName} has suspiciously short token (${page.pageAccessToken.length} characters)`);
        console.log(`   Token: ${page.pageAccessToken}`);
        errorCount++;
        continue;
      }
      
      console.log(`✅ Page ${page.pageName} has valid-looking token (${page.pageAccessToken.length} characters)`);
      fixedCount++;
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Valid pages: ${fixedCount}`);
    console.log(`   ❌ Invalid pages: ${errorCount}`);
    
    // If there are invalid pages, suggest next steps
    if (errorCount > 0) {
      console.log(`\n🔧 Next steps:`);
      console.log(`   1. Go to Facebook Developer Console`);
      console.log(`   2. Get the correct Page Access Tokens for each page`);
      console.log(`   3. Update the database with correct tokens`);
      console.log(`   4. Reconnect pages if necessary`);
    }
    
  } catch (error) {
    console.error('❌ Error checking Facebook page tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  fixFacebookPageTokens().catch(console.error);
}

module.exports = { fixFacebookPageTokens };