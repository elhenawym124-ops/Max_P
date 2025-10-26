const { getSharedPrismaClient } = require('./services/sharedDatabase');
const axios = require('axios');

const prisma = getSharedPrismaClient();

/**
 * Comprehensive solution for Facebook page disconnect/reconnect issues
 * This script fixes the webhook subscription problem that occurs when pages are disconnected and reconnected
 */

// Get environment configuration
const envConfig = {
  environment: process.env.NODE_ENV || 'development',
  backendUrl: process.env.NODE_ENV === 'production' 
    ? 'https://www.mokhtarelhenawy.online' 
    : 'http://localhost:5000'
};

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || 'your_facebook_app_id';
const WEBHOOK_URL = `${envConfig.backendUrl}/webhook`;

/**
 * Function to subscribe a page to webhook events
 */
async function subscribePageToWebhook(pageId, pageAccessToken) {
  try {
    console.log(`🔗 Subscribing page ${pageId} to webhook...`);
    
    const subscribeResponse = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
      subscribed_fields: 'messages,messaging_postbacks,message_attachments'
    }, {
      params: {
        access_token: pageAccessToken
      },
      timeout: 10000
    });
    
    console.log(`✅ Page ${pageId} subscribed to webhook successfully`);
    console.log('   Response:', subscribeResponse.data);
    return { success: true, data: subscribeResponse.data };
    
  } catch (error) {
    console.log(`❌ Failed to subscribe page ${pageId} to webhook`);
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

/**
 * Function to check if page is subscribed to webhook
 */
async function checkWebhookSubscription(pageId, pageAccessToken) {
  try {
    const subscriptionsResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
      params: {
        access_token: pageAccessToken
      },
      timeout: 10000
    });
    
    const isSubscribed = subscriptionsResponse.data.data && subscriptionsResponse.data.data.length > 0;
    console.log(`🔍 Page ${pageId} webhook subscription status: ${isSubscribed ? 'SUBSCRIBED' : 'NOT SUBSCRIBED'}`);
    
    return { success: true, isSubscribed, data: subscriptionsResponse.data };
    
  } catch (error) {
    console.log(`❌ Failed to check webhook subscription for page ${pageId}`);
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

/**
 * Function to check page permissions
 */
async function checkPagePermissions(pageAccessToken) {
  try {
    const permissionsResponse = await axios.get(`https://graph.facebook.com/v18.0/me/permissions`, {
      params: {
        access_token: pageAccessToken
      },
      timeout: 10000
    });
    
    console.log('🔐 Checking page permissions:');
    const permissions = {};
    const requiredPermissions = ['pages_messaging', 'pages_manage_metadata', 'pages_read_engagement'];
    
    permissionsResponse.data.data.forEach(perm => {
      permissions[perm.permission] = perm.status;
      const status = perm.status === 'granted' ? '✅' : '❌';
      console.log(`   ${status} ${perm.permission}: ${perm.status}`);
    });
    
    const allRequiredGranted = requiredPermissions.every(perm => permissions[perm] === 'granted');
    console.log(`\n   All required permissions granted: ${allRequiredGranted ? '✅ YES' : '❌ NO'}`);
    
    return { success: true, permissions, allRequiredGranted };
    
  } catch (error) {
    console.log('❌ Failed to check permissions');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

/**
 * Function to validate and fix a single page
 */
async function validateAndFixPage(page) {
  console.log(`\n🔧 VALIDATING PAGE: ${page.pageName} (${page.pageId})`);
  console.log('=' * 60);
  
  const results = {
    pageId: page.pageId,
    pageName: page.pageName,
    issues: [],
    fixes: [],
    status: 'unknown'
  };
  
  try {
    // 1. Check if token is valid
    console.log('1. 🧪 Testing page access token...');
    try {
      const testResponse = await axios.get(`https://graph.facebook.com/v18.0/${page.pageId}`, {
        params: {
          access_token: page.pageAccessToken,
          fields: 'name,id'
        },
        timeout: 5000
      });
      
      console.log('   ✅ Page token is valid');
      console.log(`   Page: ${testResponse.data.name} (${testResponse.data.id})`);
      
    } catch (tokenError) {
      console.log('   ❌ Page token is invalid or expired');
      console.log(`   Error: ${tokenError.response?.data?.error?.message || tokenError.message}`);
      results.issues.push('Invalid or expired page access token');
      results.status = 'token_invalid';
      return results;
    }
    
    // 2. Check permissions
    console.log('2. 🔐 Checking permissions...');
    const permissionCheck = await checkPagePermissions(page.pageAccessToken);
    
    if (!permissionCheck.success) {
      results.issues.push('Failed to check permissions');
    } else if (!permissionCheck.allRequiredGranted) {
      results.issues.push('Missing required permissions (especially pages_manage_metadata)');
    }
    
    // 3. Check webhook subscription
    console.log('3. 🔗 Checking webhook subscription...');
    const subscriptionCheck = await checkWebhookSubscription(page.pageId, page.pageAccessToken);
    
    if (!subscriptionCheck.success) {
      results.issues.push('Failed to check webhook subscription');
    } else if (!subscriptionCheck.isSubscribed) {
      console.log('   ❌ Page is NOT subscribed to webhook - this is the problem!');
      results.issues.push('Page not subscribed to webhook events');
      
      // Try to fix by subscribing to webhook
      console.log('4. 🔧 Attempting to fix by subscribing to webhook...');
      const subscribeResult = await subscribePageToWebhook(page.pageId, page.pageAccessToken);
      
      if (subscribeResult.success) {
        console.log('   ✅ Successfully subscribed page to webhook!');
        results.fixes.push('Subscribed page to webhook events');
        results.status = 'fixed';
      } else {
        console.log('   ❌ Failed to subscribe page to webhook');
        results.fixes.push('Attempted webhook subscription (failed)');
        results.status = 'needs_manual_fix';
      }
    } else {
      console.log('   ✅ Page is already subscribed to webhook');
      results.status = 'working';
    }
    
    // 4. Check for conversations to confirm the page was affected
    console.log('5. 💬 Checking for conversations...');
    const conversations = await prisma.conversation.count({
      where: {
        companyId: page.companyId,
        customer: {
          facebookId: {
            not: null
          }
        }
      }
    });
    
    console.log(`   Found ${conversations} conversations for this company`);
    if (conversations === 0) {
      results.issues.push('No conversations found - indicating webhook delivery problems');
    }
    
  } catch (error) {
    console.log(`❌ Error validating page: ${error.message}`);
    results.issues.push(`Validation error: ${error.message}`);
    results.status = 'error';
  }
  
  return results;
}

/**
 * Main function to fix all affected pages
 */
async function fixReconnectionIssues() {
  try {
    console.log('🚀 FACEBOOK RECONNECTION ISSUE FIX');
    console.log('=' * 50);
    console.log(`Environment: ${envConfig.environment}`);
    console.log(`Webhook URL: ${WEBHOOK_URL}`);
    console.log(`Facebook App ID: ${FACEBOOK_APP_ID}`);
    console.log('');
    
    // 1. Get all connected Facebook pages
    console.log('📋 Getting all connected Facebook pages...');
    const allPages = await prisma.facebookPage.findMany({
      where: {
        status: 'connected'
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    console.log(`Found ${allPages.length} connected pages`);
    
    if (allPages.length === 0) {
      console.log('✅ No connected pages found');
      return;
    }
    
    console.log('\nPages to check:');
    allPages.forEach((page, index) => {
      console.log(`${index + 1}. ${page.pageName} (${page.pageId}) - Company: ${page.companyId}`);
    });
    
    console.log('\n🔧 STARTING VALIDATION AND FIXES...\n');
    
    // 2. Validate and fix each page
    const results = [];
    for (let i = 0; i < allPages.length; i++) {
      const page = allPages[i];
      const result = await validateAndFixPage(page);
      results.push(result);
      
      // Add a small delay between API calls to avoid rate limiting
      if (i < allPages.length - 1) {
        console.log('\n   ⏳ Waiting 2 seconds before next page...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 3. Summary report
    console.log('\n📊 FINAL SUMMARY REPORT');
    console.log('=' * 50);
    
    const statusCounts = {
      working: 0,
      fixed: 0,
      needs_manual_fix: 0,
      token_invalid: 0,
      error: 0
    };
    
    results.forEach(result => {
      statusCounts[result.status]++;
      console.log(`\n📄 ${result.pageName} (${result.pageId})`);
      console.log(`   Status: ${result.status.toUpperCase()}`);
      
      if (result.issues.length > 0) {
        console.log('   Issues:');
        result.issues.forEach(issue => console.log(`     - ${issue}`));
      }
      
      if (result.fixes.length > 0) {
        console.log('   Fixes Applied:');
        result.fixes.forEach(fix => console.log(`     - ${fix}`));
      }
    });
    
    console.log('\n🎯 OVERALL RESULTS:');
    console.log(`   ✅ Working pages: ${statusCounts.working}`);
    console.log(`   🔧 Fixed pages: ${statusCounts.fixed}`);
    console.log(`   ⚠️  Need manual fix: ${statusCounts.needs_manual_fix}`);
    console.log(`   🔑 Invalid tokens: ${statusCounts.token_invalid}`);
    console.log(`   ❌ Errors: ${statusCounts.error}`);
    
    // 4. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (statusCounts.fixed > 0) {
      console.log(`   ✅ Successfully fixed ${statusCounts.fixed} pages`);
      console.log('   These pages should now receive messages normally');
    }
    
    if (statusCounts.needs_manual_fix > 0) {
      console.log(`   ⚠️  ${statusCounts.needs_manual_fix} pages need manual attention`);
      console.log('   For these pages:');
      console.log('     1. Go to Facebook Developer Console');
      console.log('     2. Check app permissions include pages_manage_metadata');
      console.log('     3. Manually subscribe pages to webhook events');
      console.log('     4. Generate new page access tokens if needed');
    }
    
    if (statusCounts.token_invalid > 0) {
      console.log(`   🔑 ${statusCounts.token_invalid} pages have invalid tokens`);
      console.log('   These pages need to be reconnected with fresh tokens');
    }
    
    console.log('\n🎉 RECONNECTION ISSUE FIX COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error during reconnection fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  fixReconnectionIssues();
}

module.exports = { 
  fixReconnectionIssues, 
  validateAndFixPage, 
  subscribePageToWebhook, 
  checkWebhookSubscription, 
  checkPagePermissions 
};