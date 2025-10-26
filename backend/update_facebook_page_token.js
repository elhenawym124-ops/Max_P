/**
 * Script to update Facebook page token in the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateFacebookPageToken(pageId, newAccessToken) {
  try {
    console.log(`🔍 Updating Facebook page token for page ID: ${pageId}`);
    
    // Check if page exists
    const existingPage = await prisma.facebookPage.findUnique({
      where: { pageId: pageId }
    });

    if (!existingPage) {
      console.log(`❌ Page with ID ${pageId} not found in database`);
      return;
    }
    
    console.log(`📄 Found page: ${existingPage.pageName} (${existingPage.pageId})`);
    console.log(`   Current token length: ${existingPage.pageAccessToken?.length || 0}`);
    console.log(`   New token length: ${newAccessToken.length}`);
    
    // Update the page with new access token
    const updatedPage = await prisma.facebookPage.update({
      where: { pageId: pageId },
      data: {
        pageAccessToken: newAccessToken,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Successfully updated page token for: ${updatedPage.pageName}`);
    console.log(`   New token length: ${updatedPage.pageAccessToken.length}`);
    
  } catch (error) {
    console.error('❌ Error updating Facebook page token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly with arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node update_facebook_page_token.js <pageId> <newAccessToken>');
    console.log('Example: node update_facebook_page_token.js 453471574524139 EAAG...');
    process.exit(1);
  }
  
  const pageId = args[0];
  const newAccessToken = args[1];
  
  updateFacebookPageToken(pageId, newAccessToken).catch(console.error);
}

module.exports = { updateFacebookPageToken };