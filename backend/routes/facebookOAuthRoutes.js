const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

// Import authentication middleware
const { requireAuth } = require('../middleware/auth');

// Import environment configuration
const envConfig = require('../config/environment');

// Facebook OAuth Configuration
const FACEBOOK_APP_ID = "762328696481583";
const FACEBOOK_APP_SECRET = "9ef40d290082e1d2455ac38646f2b379";

// Dynamic Facebook Redirect URI based on environment
const getFacebookRedirectUri = () => {
  if (envConfig.environment === 'development') {
    return 'http://localhost:3000/api/v1/facebook-oauth/callback';
  } else {
    return 'https://mokhtarelhenawy.online/api/v1/facebook-oauth/callback';
  }
};

const FACEBOOK_REDIRECT_URI = getFacebookRedirectUri();

// Facebook OAuth Scopes
const FACEBOOK_SCOPES = 'public_profile,email,pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_metadata,pages_messaging,instagram_basic,instagram_manage_comments,pages_read_user_content,pages_manage_engagement,business_management';

// 🎯 NEW: Function to subscribe page to app webhooks
const subscribePageToApp = async (pageId, pageAccessToken) => {
  try {
    console.log(`🔔 Subscribing page ${pageId} to app webhooks...`);

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
      {},
      {
        params: {
          access_token: pageAccessToken,
          subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads,message_echoes,feed'
        }
      }
    );

    console.log(`✅ Successfully subscribed page ${pageId} to webhooks:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ Failed to subscribe page ${pageId}:`, error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

// 🎯 NEW: Function to check if page is subscribed
const checkPageSubscription = async (pageId, pageAccessToken) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
      {
        params: { access_token: pageAccessToken }
      }
    );

    console.log(`📋 Page ${pageId} subscriptions:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to check page ${pageId} subscriptions:`, error.response?.data || error.message);
    return null;
  }
};


/**
 * Step 1: Generate Facebook OAuth URL
 * GET /api/v1/facebook-oauth/authorize
 * ✅ REQUIRES AUTHENTICATION
 */
router.get('/authorize', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required',
        message: 'معرف الشركة مطلوب'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company',
        message: 'غير مصرح لك بالوصول لهذه الشركة'
      });
    }

    const state = JSON.stringify({
      companyId,
      userId: req.user.id,
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(7)
    });

    const encodedState = Buffer.from(state).toString('base64');

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&` +
      `scope=${FACEBOOK_SCOPES}&` +
      `response_type=code&` +
      `state=${encodedState}`;

    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Facebook authorization URL generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate Facebook authorization URL'
    });
  }
});

/**
 * Step 2: Handle Facebook OAuth Callback
 * GET /api/v1/facebook-oauth/callback
 * ⚠️ NO AUTHENTICATION - Facebook redirects here directly
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    console.log('📥 Received Facebook OAuth callback');

    const redirectBaseUrl = envConfig.environment === 'development'
      ? 'http://localhost:3000'
      : 'https://mokhtarelhenawy.online';

    if (error) {
      console.error(`❌ Facebook OAuth error: ${error}`);
      return res.redirect(`${redirectBaseUrl}/settings/facebook?error=facebook_oauth_${error}`);
    }

    if (!code || !state) {
      console.error('❌ Missing code or state in callback');
      return res.redirect(`${redirectBaseUrl}/settings/facebook?error=missing_code_or_state`);
    }

    let stateData;
    try {
      const decodedState = Buffer.from(state, 'base64').toString('utf8');
      stateData = JSON.parse(decodedState);
    } catch (stateError) {
      console.error('❌ Invalid state parameter:', stateError);
      return res.redirect(`${redirectBaseUrl}/settings/facebook?error=invalid_state`);
    }

    const { companyId, userId, timestamp } = stateData;

    if (!companyId) {
      console.error('❌ No companyId in state');
      return res.redirect(`${redirectBaseUrl}/settings/facebook?error=no_company_id`);
    }

    const stateAge = Date.now() - timestamp;
    const maxStateAge = 10 * 60 * 1000; // 10 minutes
    if (stateAge > maxStateAge) {
      console.error('❌ State expired');
      return res.redirect(`${redirectBaseUrl}/settings/facebook?error=state_expired`);
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      console.error(`❌ Company not found: ${companyId}`);
      return res.redirect(`${redirectBaseUrl}/settings/facebook?error=company_not_found`);
    }

    // ✅ تبادل الكود مع Facebook Access Token
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: FACEBOOK_REDIRECT_URI,
        code: code
      }
    });

    const { access_token: userAccessToken } = tokenResponse.data;
    console.log('✅ Got user access token');

    // ✅ الحصول على كل الصفحات المرتبطة بالحساب مع دعم paging
    let allPages = [];
    let currentLimit = 20; // ابدأ بـ limit أصغر
    let nextUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token&limit=${currentLimit}`;
    let pageCount = 0;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (nextUrl && retryCount <= maxRetries) {
      try {
        const pagesResponse = await axios.get(nextUrl, {
          timeout: 30000, // 30 seconds timeout
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (pagesResponse.data && Array.isArray(pagesResponse.data.data)) {
          allPages = allPages.concat(pagesResponse.data.data);
          pageCount += pagesResponse.data.data.length;
          console.log(`📄 Fetched ${pageCount} pages so far...`);
          retryCount = 0; // reset retry count on success
        }
        
        // تحقق من وجود paging.next
        nextUrl = pagesResponse.data.paging && pagesResponse.data.paging.next ? pagesResponse.data.paging.next : null;
        
      } catch (pagingError) {
        console.error('❌ Error fetching pages batch:', pagingError.response?.data || pagingError.message);
        
        // إذا Facebook طلب تقليل البيانات
        if (pagingError.response?.data?.error?.code === 1 && currentLimit > 10) {
          currentLimit = Math.max(10, Math.floor(currentLimit / 2));
          console.log(`⚠️ Reducing limit to ${currentLimit} and retrying...`);
          nextUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token&limit=${currentLimit}`;
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1 second
          continue;
        }
        
        // لو فيه صفحات اتجمعت، استخدمهم
        if (allPages.length > 0) {
          console.log(`⚠️ Using ${allPages.length} pages fetched before error`);
          break;
        }
        
        throw pagingError;
      }
    }
    console.log(`✅ Found ${allPages.length} pages (with paging)`);

    if (!allPages || !Array.isArray(allPages) || allPages.length === 0) {
      const redirectUrl = `${redirectBaseUrl}/settings/facebook?success=true&pages=0&message=no_pages_found`;
      return res.redirect(redirectUrl);
    }

    console.log(`⚡ Fast processing ${allPages.length} pages...`);

    // 🚀 جلب كل الصفحات الموجودة مرة واحدة (بدلاً من استعلام لكل صفحة)
    const pageIds = allPages.map(p => p.id);
    const existingPagesInDB = await prisma.facebookPage.findMany({
      where: {
        pageId: { in: pageIds }
      },
      select: {
        pageId: true,
        companyId: true,
        pageAccessToken: true
      }
    });

    // إنشاء Map للوصول السريع
    const existingPagesMap = new Map(
      existingPagesInDB.map(p => [p.pageId, p])
    );

    console.log(`📊 Found ${existingPagesInDB.length} existing pages in database`);

    // ✅ حفظ الصفحات وربطها مع التحقق من عدم نقل الصفحات بين الشركات
    const savedPages = [];
    const subscriptionResults = [];
    const skippedPages = []; // 🆕 صفحات تم تخطيها لأنها مربوطة بشركات أخرى

    for (const page of allPages) {
      try {
        // 🔍 التحقق من وجود الصفحة في قاعدة البيانات (من الـ Map)
        const existingPageInDB = existingPagesMap.get(page.id);

        // 🚫 إذا كانت الصفحة مربوطة بشركة أخرى، لا تربطها
        if (existingPageInDB && existingPageInDB.companyId && existingPageInDB.companyId !== companyId) {
          console.log(`⚠️ Skipping page "${page.name}" (${page.id}) - already connected to another company (${existingPageInDB.companyId})`);
          
          skippedPages.push({
            pageId: page.id,
            pageName: page.name,
            reason: 'already_connected_to_another_company',
            connectedCompanyId: existingPageInDB.companyId,
            attemptedCompanyId: companyId
          });
          continue; // تخطي هذه الصفحة
        }

        let savedPage;
        
        // ✅ إذا كانت الصفحة مربوطة بنفس الشركة، حدّث فقط إذا تغير التوكن
        if (existingPageInDB && existingPageInDB.companyId === companyId) {
          // تحديث فقط إذا تغير التوكن (توفير database writes)
          if (existingPageInDB.pageAccessToken !== page.access_token) {
            savedPage = await prisma.facebookPage.update({
              where: { pageId: page.id },
              data: {
                pageAccessToken: page.access_token,
                pageName: page.name,
                status: 'connected',
                connectedAt: new Date(),
                disconnectedAt: null
              }
            });
            console.log(`✅ Updated page: ${page.name} (token changed)`);
          } else {
            // التوكن لم يتغير - لا داعي للتحديث
            savedPage = { pageId: page.id, pageName: page.name };
            console.log(`⏭️ Skipped update: ${page.name} (token unchanged)`);
          }
        } 
        // ➕ إذا كانت الصفحة غير مربوطة أو مربوطة بدون companyId، اربطها
        else {
          savedPage = await prisma.facebookPage.upsert({
            where: { pageId: page.id },
            update: {
              pageAccessToken: page.access_token,
              pageName: page.name,
              status: 'connected',
              connectedAt: new Date(),
              disconnectedAt: null,
              companyId: companyId
            },
            create: {
              pageId: page.id,
              pageName: page.name,
              pageAccessToken: page.access_token,
              status: 'connected',
              connectedAt: new Date(),
              company: {
                connect: { id: companyId }
              }
            }
          });
          console.log(`✅ Created page: ${page.name}`);
        }

        savedPages.push(savedPage);

        // 🎯 Subscribe page to webhooks (without blocking)
        subscribePageToApp(page.id, page.access_token)
          .then(result => {
            if (result.success) {
              console.log(`✅ ${page.name} subscribed to webhooks`);
            } else {
              console.error(`⚠️ ${page.name} subscription failed:`, result.error);
            }
          })
          .catch(err => console.error(`❌ Subscription error for ${page.name}:`, err.message));
        
        subscriptionResults.push({
          pageId: page.id,
          pageName: page.name,
          subscribed: true // Will be processed in background
        });

      } catch (pageError) {
        console.error(`❌ Error saving page ${page.name}:`, pageError.message);
        subscriptionResults.push({
          pageId: page.id,
          pageName: page.name,
          subscribed: false,
          error: pageError.message
        });
      }
    }

    // Log subscription summary
    const successfulSubscriptions = subscriptionResults.filter(r => r.subscribed).length;
    console.log(`📊 Subscription Summary: ${successfulSubscriptions}/${subscriptionResults.length} pages subscribed`);
    subscriptionResults.forEach(result => {
      if (result.subscribed) {
        console.log(`  ✅ ${result.pageName}: Subscribed`);
      } else {
        console.log(`  ❌ ${result.pageName}: Failed - ${result.error || 'Unknown error'}`);
      }
    });

    // 📊 Log skipped pages summary & save to database in batch
    if (skippedPages.length > 0) {
      console.log(`⚠️ Skipped Pages Summary: ${skippedPages.length} pages were not connected`);
      skippedPages.forEach(skipped => {
        console.log(`  ⚠️ ${skipped.pageName} (${skipped.pageId}): ${skipped.reason}`);
      });
      
      // 💾 حفظ جميع الصفحات المتخطاة دفعة واحدة (batch insert)
      try {
        await prisma.skippedFacebookPage.createMany({
          data: skippedPages.map(sp => ({
            pageId: sp.pageId,
            pageName: sp.pageName,
            reason: sp.reason,
            attemptedCompanyId: sp.attemptedCompanyId,
            connectedToCompanyId: sp.connectedCompanyId,
            isResolved: false
          })),
          skipDuplicates: true
        });
        console.log(`✅ Saved ${skippedPages.length} skipped pages to database`);
      } catch (skipError) {
        console.error(`❌ Error saving skipped pages:`, skipError.message);
      }
    }

    // تحويل معلومات الصفحات المتخطاة إلى Base64 لإرسالها في URL
    let skippedPagesEncoded = '';
    if (skippedPages.length > 0) {
      const skippedPagesData = skippedPages.map(sp => ({
        pageId: sp.pageId,
        pageName: sp.pageName,
        reason: sp.reason
      }));
      skippedPagesEncoded = Buffer.from(JSON.stringify(skippedPagesData)).toString('base64');
    }

    const redirectUrl = `${redirectBaseUrl}/settings/facebook?success=true&pages=${savedPages.length}&skipped=${skippedPages.length}&skippedData=${encodeURIComponent(skippedPagesEncoded)}&companyId=${companyId}`;
    console.log(`✅ Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);

  } catch (error) {
    // تحسين طباعة الخطأ
    if (error.response) {
      console.error('❌ Error in OAuth callback:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('❌ Error in OAuth callback: No response received from Facebook.', error.message);
    } else {
      console.error('❌ Error in OAuth callback:', error.message);
    }

    let errorMessage = 'unknown_error';
    if (error.response) {
      // لو فيه رسالة خطأ واضحة من فيسبوك
      errorMessage = error.response.data?.error?.message || `Facebook API error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      errorMessage = 'network_error';
    } else {
      errorMessage = error.message;
    }

    const redirectBaseUrl = envConfig.environment === 'development'
      ? 'http://localhost:3000'
      : 'https://mokhtarelhenawy.online';

    // إضافة تفاصيل أكثر للمستخدم لو فيه status code
    let userError = errorMessage;
    if (error.response && error.response.status) {
      userError = `Facebook API error (${error.response.status}): ${errorMessage}`;
    }

    const redirectUrl = `${redirectBaseUrl}/settings/facebook?error=${encodeURIComponent(userError)}`;
    res.redirect(redirectUrl);
  }
});




/**
 * 🎯 NEW: Test webhook subscription for a specific page
 * POST /api/v1/facebook-oauth/test-subscription
 * ✅ REQUIRES AUTHENTICATION
 */
router.post('/test-subscription', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.body;
    const { companyId } = req.query;

    if (!companyId || !pageId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID and Page ID are required'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company'
      });
    }

    // Get page from database
    const page = await prisma.facebookPage.findFirst({
      where: {
        pageId: pageId,
        companyId: companyId
      }
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    // Check current subscription
    const currentSubscription = await checkPageSubscription(page.pageId, page.pageAccessToken);

    // Try to subscribe
    const subscriptionResult = await subscribePageToApp(page.pageId, page.pageAccessToken);

    // Check subscription again
    const newSubscription = await checkPageSubscription(page.pageId, page.pageAccessToken);

    res.json({
      success: subscriptionResult.success,
      pageId: page.pageId,
      pageName: page.pageName,
      currentSubscription,
      subscriptionResult: subscriptionResult.data || subscriptionResult.error,
      newSubscription,
      message: subscriptionResult.success
        ? 'Page subscribed to webhooks successfully'
        : 'Failed to subscribe page to webhooks'
    });

  } catch (error) {
    console.error('❌ Error testing subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to test webhook subscription'
    });
  }
});


/**
 * Step 3: Get OAuth Status
 * GET /api/v1/facebook-oauth/status
 * ✅ REQUIRES AUTHENTICATION
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required',
        message: 'معرف الشركة مطلوب'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company'
      });
    }

    const connectedPages = await prisma.facebookPage.findMany({
      where: {
        companyId: companyId,
        status: 'connected'
      },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        status: true,
        connectedAt: true,
        updatedAt: true,
      },
      orderBy: {
        connectedAt: 'desc'
      }
    });

    res.json({
      success: true,
      connected: connectedPages.length > 0,
      pagesCount: connectedPages.length,
      pages: connectedPages,
      message: connectedPages.length > 0
        ? 'Facebook pages connected successfully'
        : 'No Facebook pages connected'
    });

  } catch (error) {
    console.error('❌ Error getting status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get Facebook OAuth status'
    });
  }
});


/**
 * Step 4: Disconnect Facebook Pages
 * DELETE /api/v1/facebook-oauth/disconnect
 * ✅ REQUIRES AUTHENTICATION
 */
router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    const { pageIds } = req.body;
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    if (!pageIds || !Array.isArray(pageIds)) {
      return res.status(400).json({
        success: false,
        error: 'Page IDs array is required'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company'
      });
    }

    const result = await prisma.facebookPage.updateMany({
      where: {
        id: { in: pageIds },
        companyId: companyId
      },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date()
      }
    });

    res.json({
      success: true,
      disconnectedCount: result.count,
      message: `تم قطع الاتصال مع ${result.count} صفحة بنجاح`
    });

  } catch (error) {
    console.error('❌ Error disconnecting pages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to disconnect Facebook pages'
    });
  }
});

/**
 * Step 5: Get Skipped Pages
 * GET /api/v1/facebook-oauth/skipped-pages
 * ✅ REQUIRES AUTHENTICATION
 */
router.get('/skipped-pages', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company'
      });
    }

    // جلب الصفحات المتخطاة الغير محلولة
    const skippedPages = await prisma.skippedFacebookPage.findMany({
      where: {
        attemptedCompanyId: companyId,
        isResolved: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      skippedPages: skippedPages,
      count: skippedPages.length
    });

  } catch (error) {
    console.error('❌ Error getting skipped pages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Step 6: Mark Skipped Pages as Resolved
 * POST /api/v1/facebook-oauth/resolve-skipped
 * ✅ REQUIRES AUTHENTICATION
 */
router.post('/resolve-skipped', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;
    const { pageIds } = req.body; // Array of skipped page IDs to resolve

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company'
      });
    }

    let resolvedCount = 0;

    if (pageIds && Array.isArray(pageIds) && pageIds.length > 0) {
      // Mark specific pages as resolved
      const result = await prisma.skippedFacebookPage.updateMany({
        where: {
          id: { in: pageIds },
          attemptedCompanyId: companyId
        },
        data: {
          isResolved: true,
          resolvedAt: new Date()
        }
      });
      resolvedCount = result.count;
    } else {
      // Mark all skipped pages for this company as resolved
      const result = await prisma.skippedFacebookPage.updateMany({
        where: {
          attemptedCompanyId: companyId,
          isResolved: false
        },
        data: {
          isResolved: true,
          resolvedAt: new Date()
        }
      });
      resolvedCount = result.count;
    }

    res.json({
      success: true,
      resolvedCount: resolvedCount,
      message: `تم وضع علامة على ${resolvedCount} صفحة كمحلولة`
    });

  } catch (error) {
    console.error('❌ Error resolving skipped pages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Step 7: Debug - check pages for a company
 * GET /api/v1/facebook-oauth/debug
 */
router.get('/debug', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const allPages = await prisma.facebookPage.findMany({
      where: {
        company: {
          id: companyId
        }
      },
      include: {
        company: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const connectedPages = await prisma.facebookPage.findMany({
      where: {
        company: {
          id: companyId
        },
        status: 'connected'
      },
      include: {
        company: true
      }
    });

    res.json({
      success: true,
      companyId,
      totalPages: allPages.length,
      connectedPages: connectedPages.length,
      disconnectedPages: allPages.filter(p => p.status === 'disconnected').length,
      allPages: allPages.map(page => ({
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        status: page.status,
        companyId: page.company ? page.company.id : null,
        connectedAt: page.connectedAt,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt
      })),
      connectedPages: connectedPages.map(page => ({
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        status: page.status,
        connectedAt: page.connectedAt
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



module.exports = router;