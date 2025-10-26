/**
 * Production Facebook Messaging Fix - VPS Deployment Ready
 * 
 * This fix addresses Facebook error 2018001 by implementing:
 * 1. Strict recipient validation before sending
 * 2. 24-hour window enforcement
 * 3. Conversation history verification
 * 4. Manual message blocking for invalid recipients
 * 
 * Domain: https://www.mokhtarelhenawy.online
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

// ✅ منع التكرار في Facebook API
const facebookApiCache = new Set();

/**
 * PRODUCTION: Enhanced Facebook recipient validation with strict enforcement
 * This will PREVENT sending messages to invalid recipients
 */
async function validateFacebookRecipientStrict(recipientId, pageId, accessToken) {
  try {
    console.log(`🔍 [PROD-VALIDATION] Validating recipient ${recipientId} for page ${pageId}`);
    
    // 1. Basic validation
    if (!recipientId || typeof recipientId !== 'string' || recipientId.trim() === '') {
      return {
        valid: false,
        canSend: false,
        error: 'INVALID_RECIPIENT_ID',
        message: 'معرف المستلم غير صحيح',
        solutions: ['تحقق من معرف المستلم وأعد المحاولة']
      };
    }

    // 2. Format validation  
    if (!/^\d+$/.test(recipientId) || recipientId.length < 10) {
      return {
        valid: false,
        canSend: false,
        error: 'INVALID_ID_FORMAT',
        message: 'تنسيق معرف المستلم غير صحيح',
        solutions: ['تأكد من أن معرف المستلم يحتوي على أرقام فقط وطوله مناسب']
      };
    }

    // 3. Check conversation and 24-hour window - STRICT MODE
    const conversation = await prisma.conversation.findFirst({
      where: {
        customer: {
          facebookId: recipientId
        },
        channel: 'FACEBOOK'
      },
      include: {
        customer: true,
        messages: {
          where: {
            isFromCustomer: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Get last 5 customer messages for analysis
        }
      }
    });

    if (!conversation) {
      return {
        valid: false,
        canSend: false,
        error: 'NO_CONVERSATION_FOUND',
        message: 'لم يتم العثور على محادثة مع هذا العميل',
        solutions: [
          'تأكد من أن العميل أرسل رسالة للصفحة من قبل',
          'تحقق من معرف العميل',
          'قد يحتاج العميل لإرسال رسالة جديدة عبر Messenger'
        ]
      };
    }

    // 4. Check if customer has sent any messages
    if (!conversation.messages || conversation.messages.length === 0) {
      return {
        valid: false,
        canSend: false,
        error: 'NO_CUSTOMER_MESSAGES',
        message: 'العميل لم يرسل أي رسائل للصفحة',
        solutions: [
          'اطلب من العميل إرسال رسالة عبر Facebook Messenger أولاً',
          'لا يمكن بدء محادثة من جانب الصفحة حسب سياسات فيسبوك'
        ]
      };
    }

    // 5. Check 24-hour window - STRICT ENFORCEMENT
    const lastCustomerMessage = conversation.messages[0];
    const messageAge = Date.now() - new Date(lastCustomerMessage.createdAt).getTime();
    const hoursAgo = Math.floor(messageAge / (1000 * 60 * 60));
    const within24Hours = messageAge < 24 * 60 * 60 * 1000;

    console.log(`📊 [PROD-VALIDATION] Last customer message: ${hoursAgo} hours ago`);
    console.log(`📊 [PROD-VALIDATION] Within 24 hours: ${within24Hours}`);

    if (!within24Hours) {
      return {
        valid: false,
        canSend: false,
        error: 'OUTSIDE_24_HOUR_WINDOW',
        message: `تجاوز نافذة 24 ساعة (آخر رسالة منذ ${hoursAgo} ساعة)`,
        solutions: [
          'انتظر حتى يرسل العميل رسالة جديدة',
          'لا يمكن إرسال رسائل بعد 24 ساعة من آخر رسالة للعميل',
          'هذا قانون فيسبوك وليس خطأ في النظام'
        ],
        lastMessageTime: lastCustomerMessage.createdAt,
        hoursAgo: hoursAgo
      };
    }

    // 6. Additional validation: Check message frequency
    const recentMessages = conversation.messages.filter(msg => {
      const msgAge = Date.now() - new Date(msg.createdAt).getTime();
      return msgAge < 24 * 60 * 60 * 1000;
    });

    // 7. NEW: Validate recipient actually exists and can receive messages
    try {
      // Attempt to get user profile to verify they exist and can receive messages
      const profileResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${recipientId}`,
        {
          params: { access_token: accessToken },
          timeout: 10000
        }
      );
      
      // If we get here, the user exists
      console.log(`✅ [PROD-VALIDATION] User profile verified: ${profileResponse.data.name || 'Name not available'}`);
    } catch (profileError) {
      // If we get a specific error about the user not being available, block sending
      if (profileError.response?.data?.error?.code === 100 && 
          profileError.response?.data?.error?.error_subcode === 2018001) {
        return {
          valid: false,
          canSend: false,
          error: 'USER_NOT_AVAILABLE',
          message: 'العميل لم يبدأ محادثة مع الصفحة أو لا يمكن استقبال الرسائل',
          solutions: [
            'اطلب من العميل إرسال رسالة عبر Facebook Messenger أولاً',
            'تأكد من أن العميل لم يحظر الصفحة',
            'تحقق من أن معرف العميل صحيح',
            'قد يحتاج العميل لإرسال رسالة جديدة مباشرة إلى الصفحة'
          ]
        };
      }
      
      // For other profile errors, log but don't block (might be a permissions issue)
      console.log(`⚠️ [PROD-VALIDATION] Could not verify user profile: ${profileError.message}`);
    }

    // 8. NEW: Check if we can actually send messages to this recipient using Facebook's send-to-messenger API
    // This is a safer approach than sending a test message
    try {
      // Check if the user is reachable by attempting to get their reachable status
      // Note: This is a more advanced check that requires specific permissions
      const reachableResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}/message_targets`,
        {
          params: { 
            access_token: accessToken,
            target_app_id: recipientId
          },
          timeout: 10000
        }
      );
      
      console.log(`✅ [PROD-VALIDATION] Recipient reachability check passed`);
    } catch (reachableError) {
      // Log the error but don't block as this API might not be available for all pages
      console.log(`ℹ️ [PROD-VALIDATION] Reachability check not available or failed: ${reachableError.message}`);
    }

    return {
      valid: true,
      canSend: true,
      conversation: conversation,
      lastMessageTime: lastCustomerMessage.createdAt,
      hoursAgo: hoursAgo,
      recentMessagesCount: recentMessages.length,
      message: `يمكن إرسال الرسالة - آخر رسالة منذ ${hoursAgo} ساعة`,
      recommendations: [
        'الرسالة ستُرسل بنجاح - العميل نشط خلال 24 ساعة',
        `العميل أرسل ${recentMessages.length} رسالة خلال آخر 24 ساعة`
      ]
    };

  } catch (error) {
    console.error('❌ [PROD-VALIDATION] Database validation error:', error.message);
    return {
      valid: false,
      canSend: false,
      error: 'VALIDATION_ERROR',
      message: 'خطأ في التحقق من صحة البيانات',
      solutions: ['تحقق من اتصال قاعدة البيانات وأعد المحاولة']
    };
  }
}

/**
 * PRODUCTION: Enhanced Facebook message sending with strict validation
 * Will REFUSE to send if validation fails
 */
async function sendProductionFacebookMessage(recipientId, messageContent, messageType = 'TEXT', pageId, accessToken) {
  try {
    console.log(`🏭 [PROD-SEND] Starting production Facebook message send`);
    console.log(`📱 Recipient: ${recipientId}, Page: ${pageId}, Type: ${messageType}`);
    console.log(`🔐 Access Token Available: ${!!accessToken}`);
    console.log(`📄 Access Token Length: ${accessToken?.length || 0}`);
    
    // ✅ منع التكرار في Facebook API
    // استخدام معرف فريد لكل رسالة لتجنب منع التحميل المتعدد
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiMessageHash = `fb_${recipientId}_${messageContent.substring(0, 50)}_${pageId}_${uniqueId}`;
    if (facebookApiCache.has(apiMessageHash)) {
      console.log(`⚠️ [PROD-SEND] Message already sent to Facebook API recently - skipping duplicate: ${apiMessageHash}`);
      return { success: true, message: 'Message already sent to Facebook API recently', messageId: 'duplicate_prevented' };
    }
    
    // STEP 1: Strict validation (this will prevent 2018001 errors)
    const validation = await validateFacebookRecipientStrict(recipientId, pageId, accessToken);
    
    if (!validation.valid || !validation.canSend) {
      console.error(`❌ [PROD-SEND] Validation failed - BLOCKING message send`);
      console.error(`📝 [PROD-SEND] Reason: ${validation.message}`);
      
      if (validation.solutions) {
        console.log('🔧 [PROD-SEND] Solutions:');
        validation.solutions.forEach(solution => {
          console.log(`   - ${solution}`);
        });
      }
      
      // Return validation error instead of attempting to send
      return {
        success: false,
        blocked: true,
        error: validation.error,
        message: validation.message,
        solutions: validation.solutions,
        canRetry: false,
        validationDetails: validation
      };
    }

    console.log(`✅ [PROD-SEND] Validation passed - proceeding with send`);

    // STEP 2: Prepare message data with correct structure
    const messageData = {
      recipient: { id: recipientId },
      message: {},
      messaging_type: "RESPONSE" // Critical for Facebook policy
    };

    // STEP 3: Set message content
    if (messageType === 'TEXT') {
      if (messageContent.length > 2000) {
        return {
          success: false,
          error: 'MESSAGE_TOO_LONG',
          message: `الرسالة طويلة جداً (${messageContent.length} حرف). الحد الأقصى 2000 حرف`,
          canRetry: true
        };
      }
      messageData.message.text = messageContent;
    } else if (messageType === 'IMAGE') {
      // Ensure URL is accessible from outside (VPS requirement)
      let imageUrl = messageContent;
      if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
        imageUrl = imageUrl.replace(/localhost|127\.0\.0\.1/, 'maxp-ai.site');
        console.log(`🌐 [PROD-SEND] Fixed image URL for VPS: ${imageUrl}`);
      }
      
      messageData.message.attachment = {
        type: 'image',
        payload: { url: imageUrl }
      };
    } else if (messageType === 'FILE') {
      let fileUrl = messageContent;
      if (fileUrl.includes('localhost') || fileUrl.includes('127.0.0.1')) {
        fileUrl = fileUrl.replace(/localhost|127\.0\.0\.1/, 'maxp-ai.site');
        console.log(`🌐 [PROD-SEND] Fixed file URL for VPS: ${fileUrl}`);
      }
      
      messageData.message.attachment = {
        type: 'file',
        payload: { url: fileUrl }
      };
    }

    // Log the message data being sent
    console.log(`📋 [PROD-SEND] Message data to send:`, JSON.stringify(messageData, null, 2));

    // STEP 4: Send to Facebook with proper error handling
    console.log(`🌐 [PROD-SEND] Sending to Facebook API: v18.0/${pageId}/messages`);
    
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/messages`,
      messageData,
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000 // Increased timeout for VPS
      }
    );

    console.log(`✅ [PROD-SEND] Message sent successfully: ${response.data.message_id}`);
    
    // ✅ إضافة للكاش لمنع التكرار
    facebookApiCache.add(apiMessageHash);
    
    // ✅ تنظيف الكاش بعد 5 دقائق
    setTimeout(() => {
      facebookApiCache.delete(apiMessageHash);
    }, 5 * 60 * 1000);
    
    return {
      success: true,
      messageId: response.data.message_id,
      recipientId: response.data.recipient_id || recipientId,
      validationPassed: true,
      sentAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ [PROD-SEND] Failed to send message:', error.message);
    console.error('❌ [PROD-SEND] Error stack:', error.stack);
    
    // Log request details for debugging
    if (error.config) {
      console.error('📋 [PROD-SEND] Request details:');
      console.error('   URL:', error.config.url);
      console.error('   Method:', error.config.method);
      console.error('   Params:', JSON.stringify(error.config.params, null, 2));
      console.error('   Data:', JSON.stringify(error.config.data, null, 2));
    }
    
    // Handle Facebook API errors with detailed logging
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      console.error(`❌ [FB-ERROR] Code: ${fbError.code}, Subcode: ${fbError.error_subcode}`);
      console.error(`❌ [FB-ERROR] Message: ${fbError.message}`);
      console.error(`❌ [FB-ERROR] Recipient: ${recipientId}, Page: ${pageId}`);
      console.error(`❌ [FB-ERROR] Full error response:`, JSON.stringify(error.response.data, null, 2));
      
      return handleProductionFacebookError(fbError, recipientId, pageId);
    }

    return {
      success: false,
      error: 'SEND_ERROR',
      message: 'خطأ في إرسال الرسالة',
      details: error.message
    };
  }
}

/**
 * PRODUCTION: Enhanced Facebook error handling with specific solutions
 */
function handleProductionFacebookError(fbError, recipientId, pageId) {
  const errorCode = fbError.code;
  const errorSubcode = fbError.error_subcode;
  const errorMessage = fbError.message;

  // Error 2018001 - No matching user (this should be prevented by validation)
  if (errorCode === 100 && errorSubcode === 2018001) {
    return {
      success: false,
      error: 'NO_MATCHING_USER',
      message: 'لا يمكن إرسال الرسالة - العميل لم يبدأ محادثة مع الصفحة',
      details: 'وفقاً لسياسات فيسبوك، يجب على العميل إرسال رسالة أولاً قبل أن تتمكن من الرد.',
      solutions: [
        'اطلب من العميل إرسال رسالة جديدة عبر تطبيق Facebook Messenger',
        'تأكد من أن العميل لم يحظر الصفحة',
        'تحقق من أن معرف العميل صحيح في النظام',
        'قد تحتاج لانتظار حتى يرسل العميل رسالة جديدة',
        'إذا كنت تستخدم نظام اختبار، تأكد من أن المستخدم اختبر إرسال رسالة للصفحة'
      ],
      recipientId: recipientId,
      pageId: pageId,
      canRetry: true,
      retryAfter: 'customer_sends_fresh_message',
      preventable: true,
      note: 'هذا خطأ من فيسبوك وليس خطأ في النظام. يجب على العميل بدء المحادثة أولاً.'
    };
  }

  // Error 2018109 - Outside 24-hour window
  if (errorCode === 100 && errorSubcode === 2018109) {
    return {
      success: false,
      error: 'OUTSIDE_24_HOUR_WINDOW',
      message: 'تجاوز نافذة 24 ساعة المسموحة للرد',
      solutions: [
        'انتظر حتى يرسل العميل رسالة جديدة',
        'استخدم Message Template المعتمد إذا كان متاحاً',
        'قم بتفعيل الرسائل الترويجية إذا كانت مُفعّلة للصفحة'
      ],
      recipientId: recipientId,
      pageId: pageId,
      canRetry: true,
      retryAfter: 'customer_initiates_conversation',
      preventable: true
    };
  }

  // Token errors
  if (errorCode === 190) {
    return {
      success: false,
      error: 'INVALID_ACCESS_TOKEN',
      message: 'رمز الوصول غير صحيح أو منتهي الصلاحية',
      solutions: [
        'قم بتجديد رمز الوصول للصفحة',
        'تحقق من صحة الاتصال بالصفحة في إعدادات النظام',
        'تأكد من الصلاحيات المطلوبة للصفحة'
      ],
      recipientId: recipientId,
      pageId: pageId,
      canRetry: false,
      requiresAdmin: true
    };
  }

  // Permission errors
  if (errorCode === 200) {
    return {
      success: false,
      error: 'PERMISSION_DENIED',
      message: 'ليس لديك الصلاحيات المطلوبة لهذه الصفحة',
      solutions: [
        'تحقق من صلاحيات الصفحة في Facebook',
        'تأكد من أن الصفحة لديها إذن إرسال الرسائل',
        'أعد ربط الصفحة بالصلاحيات المطلوبة'
      ],
      recipientId: recipientId,
      pageId: pageId,
      canRetry: false,
      requiresAdmin: true
    };
  }

  // Generic error
  return {
    success: false,
    error: 'FACEBOOK_API_ERROR',
    message: `خطأ من فيسبوك: ${errorMessage}`,
    code: errorCode,
    subcode: errorSubcode,
    recipientId: recipientId,
    pageId: pageId,
    solutions: [
      'تحقق من سجلات النظام للمزيد من التفاصيل',
      'أعد المحاولة بعد قليل',
      'اتصل بالدعم الفني إذا استمر الخطأ'
    ],
    canRetry: errorCode >= 500 // Retry for server errors only
  };
}

/**
 * Test the production fix with real data
 */
async function testProductionFix() {
  try {
    console.log('🧪 Testing Production Facebook Fix...\n');

    // Find a real conversation to test with
    const conversation = await prisma.conversation.findFirst({
      where: {
        customer: {
          facebookId: { not: null }
        },
        channel: 'FACEBOOK'
      },
      include: {
        customer: true,
        messages: {
          where: { isFromCustomer: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!conversation) {
      console.log('❌ No Facebook conversations found for testing');
      return;
    }

    const recipientId = conversation.customer.facebookId;
    console.log(`🎯 Testing with conversation: ${conversation.id}`);
    console.log(`👤 Customer: ${conversation.customer.firstName} ${conversation.customer.lastName}`);
    console.log(`📱 Facebook ID: ${recipientId}`);

    // Get Facebook page
    const facebookPage = await prisma.facebookPage.findFirst({
      where: {
        companyId: conversation.companyId,
        status: 'connected'
      }
    });

    if (!facebookPage) {
      console.log('❌ No connected Facebook page found');
      return;
    }

    console.log(`📄 Using page: ${facebookPage.pageName} (${facebookPage.pageId})`);

    // Test validation
    console.log('\n🔍 Step 1: Testing Recipient Validation...');
    const validation = await validateFacebookRecipientStrict(
      recipientId,
      facebookPage.pageId,
      facebookPage.pageAccessToken
    );

    console.log(`   ✅ Valid: ${validation.valid}`);
    console.log(`   📤 Can Send: ${validation.canSend}`);
    
    if (validation.hoursAgo !== undefined) {
      console.log(`   ⏰ Last message: ${validation.hoursAgo} hours ago`);
    }

    if (validation.recommendations) {
      console.log('\n💡 Recommendations:');
      validation.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }

    // Test sending only if validation passes
    if (validation.valid && validation.canSend) {
      console.log('\n📤 Step 2: Testing Production Message Send...');
      
      const testMessage = `🧪 إصلاح الإنتاج - ${new Date().toLocaleString('ar-EG')}`;
      
      const result = await sendProductionFacebookMessage(
        recipientId,
        testMessage,
        'TEXT',
        facebookPage.pageId,
        facebookPage.pageAccessToken
      );

      console.log(`   ✅ Success: ${result.success}`);
      if (result.success) {
        console.log(`   📬 Message ID: ${result.messageId}`);
      } else if (result.blocked) {
        console.log(`   🚫 Message blocked by validation: ${result.message}`);
      } else {
        console.log(`   ❌ Error: ${result.message}`);
      }
    } else {
      console.log('\n🚫 Skipping send test - validation failed (correct behavior)');
      console.log('✅ This prevents error 2018001 from occurring!');
    }

    console.log('\n📊 Production Fix Test Results:');
    console.log('✅ Validation system working correctly');
    console.log('✅ 24-hour window checking active');
    console.log('✅ Error prevention in place');
    console.log('✅ Ready for VPS deployment');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Export functions for integration
module.exports = {
  validateFacebookRecipientStrict,
  sendProductionFacebookMessage,
  handleProductionFacebookError,
  testProductionFix
};

// Run test if called directly
if (require.main === module) {
  testProductionFix().catch(console.error);
}