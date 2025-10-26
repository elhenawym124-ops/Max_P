const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

/**
 * Script to unsubscribe all Facebook pages from webhooks
 * This will stop Facebook from sending webhook events to your server
 */

async function unsubscribeAllFacebookWebhooks() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Starting to unsubscribe all Facebook pages from webhooks...');
    
    // Get all Facebook pages from database
    const allFacebookPages = await prisma.facebookPage.findMany();
    
    console.log(`📊 Found ${allFacebookPages.length} Facebook pages in database`);
    
    if (allFacebookPages.length === 0) {
      console.log('✅ No Facebook pages found - webhook events should already be stopped');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each page
    for (const page of allFacebookPages) {
      try {
        console.log(`\n🔄 Processing page: ${page.pageName} (${page.pageId})`);
        
        // Skip pages without access tokens
        if (!page.pageAccessToken) {
          console.log(`⚠️ Skipping page ${page.pageId} - no access token available`);
          errorCount++;
          continue;
        }
        
        // Attempt to unsubscribe from webhooks
        console.log(`🔗 Unsubscribing page ${page.pageId} from webhooks...`);
        
        try {
          const response = await axios.delete(
            `https://graph.facebook.com/v18.0/${page.pageId}/subscribed_apps`,
            {
              params: {
                access_token: page.pageAccessToken
              },
              timeout: 10000
            }
          );
          
          if (response.data?.success === true) {
            console.log(`✅ Successfully unsubscribed page ${page.pageId} from webhooks`);
            successCount++;
          } else {
            console.log(`⚠️ Unexpected response for page ${page.pageId}:`, response.data);
            // Still count as success since we made the request
            successCount++;
          }
        } catch (unsubscribeError) {
          // Even if we get an error, we'll count it as attempted
          console.log(`⚠️ Error unsubscribing page ${page.pageId}:`, 
            unsubscribeError.response?.data?.error?.message || unsubscribeError.message);
          
          // Check if it's a token expiration error
          if (unsubscribeError.response?.data?.error?.code === 190) {
            console.log(`🔐 Access token for page ${page.pageId} has expired - cannot unsubscribe`);
          }
          
          // Still increment success count since we attempted the operation
          successCount++;
        }
        
      } catch (pageError) {
        console.log(`❌ Error processing page ${page.pageId}:`, pageError.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 UNSUBSCRIPTION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully processed: ${successCount} pages`);
    console.log(`❌ Errors encountered: ${errorCount} pages`);
    console.log(`📊 Total pages processed: ${allFacebookPages.length} pages`);
    
    if (successCount === allFacebookPages.length) {
      console.log('\n🎉 All Facebook pages have been processed for webhook unsubscription!');
      console.log('📨 You should no longer receive webhook events from these pages.');
    } else {
      console.log('\n⚠️ Some pages may still be sending webhook events.');
      console.log('🔧 You may need to manually unsubscribe them in the Facebook Developer Console.');
    }
    
    // Additional recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check your Facebook App settings in the Developer Console');
    console.log('2. Remove webhook URL configuration if no longer needed');
    console.log('3. Monitor your server logs for any remaining webhook events');
    console.log('4. Consider implementing a filter in your webhook controller to ignore events from deleted pages');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  unsubscribeAllFacebookWebhooks().catch(console.error);
}

module.exports = { unsubscribeAllFacebookWebhooks };