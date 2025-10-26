const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();
const socketService = require('../services/socketService');
const axios = require('axios');
const MessageHealthChecker = require('../utils/messageHealthChecker');
// Import production Facebook fix functions
const { sendProductionFacebookMessage } = require('../production-facebook-fix');
// Import cache invalidation utility
const { conversationCache } = require('../utils/cachingUtils');

// Add this cache for page tokens (same as backend)
const pageTokenCache = require('../utils/pageTokenCache');

// Track messages that have been processed to prevent duplicates
const processedMessages = new Set();

// دالة للتحقق من صحة محتوى الرسالة
function isValidMessageContent(content) {
  if (!content) return false;
  const trimmed = content.trim();
  // تجاهل الرسائل الفارغة أو التي تحتوي فقط على علامات التوصيل أو مسافات
  if (trimmed.length === 0) return false;
  // تجاهل الرسائل التي تحتوي فقط على علامات ✓✗×
  if (/^[✓✗×\s]+$/.test(trimmed)) return false;
  return true;
}

function updatePageTokenCache(pageId, pageAccessToken, pageName, companyId) {
  pageTokenCache.set(pageId, {
    pageAccessToken: pageAccessToken,
    pageName: pageName,
    companyId: companyId,
    lastUsed: Date.now()
  });

  //console.log(`💾 [PAGE-CACHE] تم تحديث cache للصفحة: ${pageName} (${pageId}) - شركة: ${companyId}`);
}

async function getPageToken(pageId) {
  // 🔒 CRITICAL FIX: Always check database for status, even if cached
  // This ensures disconnected pages are not used
  try {
    const page = await prisma.facebookPage.findUnique({
      where: { pageId: pageId }
    });

    // Check if page exists and is connected
    if (!page) {
      //console.log(`⚠️ [PAGE-CACHE] Page ${pageId} not found in database`);
      // Remove from cache if exists
      if (pageTokenCache.has(pageId)) {
        pageTokenCache.delete(pageId);
        //console.log(`🗑️ [PAGE-CACHE] Removed ${pageId} from cache`);
      }
      return null;
    }

    // 🔒 CRITICAL: Check if page is disconnected
    if (page.status === 'disconnected') {
      //console.log(`❌ [PAGE-CACHE] Page ${page.pageName} (${pageId}) is DISCONNECTED - cannot use`);
      //console.log(`   Disconnected at: ${page.disconnectedAt}`);
      // Remove from cache if exists
      if (pageTokenCache.has(pageId)) {
        pageTokenCache.delete(pageId);
        //console.log(`🗑️ [PAGE-CACHE] Removed disconnected page from cache`);
      }
      return null;
    }

    // Page is connected - update cache and return
    if (page.pageAccessToken) {
      updatePageTokenCache(pageId, page.pageAccessToken, page.pageName, page.companyId);
      ////console.log(`✅ [PAGE-CACHE] Using connected page: ${page.pageName}`);
      return {
        pageAccessToken: page.pageAccessToken,
        pageName: page.pageName,
        companyId: page.companyId,
        status: page.status,
        lastUsed: Date.now()
      };
    }
  } catch (error) {
    console.error(`❌ [PAGE-CACHE] خطأ في البحث عن الصفحة ${pageId}:`, error);
  }

  return null;
}

// Global variable to store last webhook page ID (same as backend)
let lastWebhookPageId = null;

const deleteConverstation = async (req, res) => {
  try {
    const { id } = req.params;

    //console.log(`🗑️ Attempting to delete conversation: ${id}`);

    // Check if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true,
        _count: {
          select: { messages: true }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    // Delete all messages first (due to foreign key constraints)
    const deletedMessages = await prisma.message.deleteMany({
      where: { conversationId: id }
    });

    // Delete conversation memory
    await prisma.conversationMemory.deleteMany({
      where: { conversationId: id }
    });

    // Delete the conversation
    await prisma.conversation.delete({
      where: { id }
    });

    //console.log(`✅ Deleted conversation ${id} with ${deletedMessages.count} messages`);

    res.json({
      success: true,
      message: 'تم حذف المحادثة بنجاح',
      data: {
        deletedConversation: {
          id: conversation.id,
          customerName: conversation.customer?.firstName || 'عميل غير معروف'
        },
        deletedMessagesCount: deletedMessages.count
      }
    });

  } catch (error) {
    console.error('❌ Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      message: error.message
    });
  }
};

const postMessageConverstation = async (req, res) => {
  try {
    //console.log(`🔥 POST /api/v1/conversations/${req.params.id}/messages received`);
    //console.log(`📦 Request body:`, req.body);

    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      //console.log(`❌ No message content provided`);
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    // التحقق من صحة محتوى الرسالة
    if (!isValidMessageContent(message)) {
      //console.log(`⚠️ [VALIDATION] رسالة فارغة أو غير صالحة تم رفضها: "${message}"`);
      return res.status(400).json({
        success: false,
        error: 'رسالة فارغة أو غير صالحة',
        message: 'لا يمكن إرسال رسائل فارغة أو تحتوي فقط على علامات'
      });
    }

    // Prevent duplicate processing of the same message
    const messageKey = `${id}_${message}_${Date.now()}`;
    if (processedMessages.has(messageKey)) {
      //console.log(`⚠️ Message already processed, skipping duplicate: ${messageKey}`);
      return res.status(200).json({
        success: true,
        message: 'Message already processed'
      });
    }
    
    // Add to processed messages set and clean up after 1 minute
    processedMessages.add(messageKey);
    setTimeout(() => {
      processedMessages.delete(messageKey);
    }, 60000);

    //console.log(`📤 Sending message to conversation ${id}: ${message}`);

    // 🔧 FIX: Move conversation variable definition to the beginning
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true
      }
    });

    // 🆕 FIX: حفظ معرف المستخدم (الموظف) في metadata حتى نستخدمه عند حفظ الـ echo
    let conversationMetadata = {};
    if (conversation.metadata) {
      try {
        conversationMetadata = JSON.parse(conversation.metadata);
      } catch (e) {
        console.warn('⚠️ Error parsing conversation metadata');
      }
    }
    
    // حفظ معرف المستخدم الحالي في metadata مؤقتاً
    // 🔧 FIX: استخدام userId من JWT token
    const senderId = req.user?.userId || req.user?.id;
    
    if (req.user && senderId) {
      // 🔧 FIX: جلب اسم الموظف من قاعدة البيانات
      let senderName = 'موظف';
      
      try {
        const user = await prisma.user.findUnique({
          where: { id: senderId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        });
        
        if (user) {
          senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'موظف';
        }
      } catch (e) {
        console.warn('⚠️ Error fetching user info:', e.message);
      }
      
      //console.log(`🔍 [DEBUG] req.user data:`, {
      //   userId: req.user.userId,
      //   id: req.user.id,
      //   email: req.user.email,
      //   role: req.user.role,
      //   calculatedName: senderName
      // });
      
      conversationMetadata.lastSenderId = senderId; // معرف الموظف اللي بعت الرسالة
      conversationMetadata.lastSenderName = senderName; // اسم الموظف
      
      // حفظ الـ metadata المحدث في المحادثة
      await prisma.conversation.update({
        where: { id },
        data: {
          metadata: JSON.stringify(conversationMetadata)
        }
      });
      
      //console.log(`👤 [SENDER-INFO] Saved sender info: ${senderId} - ${senderName}`);
      //console.log(`📝 [SENDER-INFO] Updated conversation metadata:`, JSON.stringify(conversationMetadata));
    } else {
      console.warn(`⚠️ [SENDER-INFO] req.user or senderId is missing!`, req.user);
    }

    // ⚡ OPTIMIZATION: لا نحفظ الرسالة هنا - سيتم حفظها تلقائياً عند استقبال echo من Facebook
    // هذا يمنع التكرار ويضمن أن الرسالة تُحفظ فقط إذا تم إرسالها بنجاح
    //console.log(`⏳ [SEND] Sending message to Facebook - will be saved via echo...`);

    // 🔧 FIX: Invalidate cache for this conversation to ensure fresh data on refresh
    if (conversation && conversation.companyId) {
      conversationCache.invalidateConversation(id, conversation.companyId);
      //console.log(`🧹 [CACHE] Invalidated cache for conversation ${id} in company ${conversation.companyId}`);
    }

    // 🔧 FIX: Update conversation last message (only if message is not empty)
    if (message && message.trim() !== '') {
      await prisma.conversation.update({
        where: { id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: message.length > 100 ? message.substring(0, 100) + '...' : message,
          updatedAt: new Date()
        }
      });
    }

    // 📤 إرسال الرسالة إلى Facebook فعلياً
    let facebookSent = false;
    let facebookMessageId = null; // Store Facebook message ID
    let facebookErrorDetails = null; // Store error details for frontend
    try {
      if (conversation && conversation.customer) {
        const recipientId = conversation.customer.facebookId;
        
        //console.log(`🔍 [FACEBOOK-SEND] Attempting to send to recipient: ${recipientId}`);
        
        if (!recipientId) {
          //console.log('⚠️ No Facebook ID found for customer');
          facebookSent = false;
        } else {
          // 🔧 إصلاح: البحث عن صفحة Facebook صالحة بدلاً من الاعتماد على lastWebhookPageId
          let pageData = null;
          let actualPageId = null;
          
          // NEW: First try to get the page ID from the conversation metadata
          // This ensures we reply using the same page that received the original message
          if (conversation.metadata) {
            try {
              const metadata = JSON.parse(conversation.metadata);
              if (metadata.pageId) {
                //console.log(`🎯 [FACEBOOK-SEND] Using page ID from conversation metadata: ${metadata.pageId}`);
                const pageTokenData = await getPageToken(metadata.pageId);
                if (pageTokenData) {
                  pageData = pageTokenData;
                  actualPageId = metadata.pageId;
                } else {
                  //console.log('⚠️ [FACEBOOK-SEND] Page token not found for metadata page ID');
                }
              }
            } catch (parseError) {
              //console.log('⚠️ [FACEBOOK-SEND] Error parsing conversation metadata:', parseError.message);
            }
          }
          
          // أولاً: البحث عن صفحة Facebook متصلة
          if (!pageData) {
            const facebookPage = await prisma.facebookPage.findFirst({
              where: { 
                status: 'connected',
                companyId: conversation.companyId // 🔐 عزل الشركات
              },
              orderBy: { connectedAt: 'desc' }
            });
            
            if (facebookPage) {
              pageData = {
                pageAccessToken: facebookPage.pageAccessToken,
                pageName: facebookPage.pageName,
                companyId: facebookPage.companyId
              };
              actualPageId = facebookPage.pageId;
              //console.log(`✅ [FACEBOOK-SEND] Found Facebook page: ${facebookPage.pageName} (${actualPageId})`);
            } else {
              //console.log('⚠️ No connected Facebook page found for company');
            }
          }
          
          // ثانياً: استخدام lastWebhookPageId كبديل
          if (!pageData && lastWebhookPageId) {
            const pageTokenData = await getPageToken(lastWebhookPageId);
            if (pageTokenData) {
              pageData = pageTokenData;
              actualPageId = lastWebhookPageId;
              //console.log(`🔄 [FACEBOOK-SEND] Using last webhook page: ${lastWebhookPageId}`);
            }
          }
          
          if (pageData && pageData.pageAccessToken && actualPageId) {
            //console.log(`📤 [FACEBOOK-SEND] Sending message via Facebook API...`);
            
            // استخدام دالة الإرسال المحسنة
            // 🔧 FIX: استخدم نفس الطريقة التي تستخدمها الصور للإرسال
            const { sendProductionFacebookMessage } = require('../production-facebook-fix');
            const response = await sendProductionFacebookMessage(
              recipientId, 
              message, 
              'TEXT', 
              actualPageId, 
              pageData.pageAccessToken
            );
            
            facebookSent = response.success;
            facebookMessageId = response.messageId; // Store Facebook message ID
            facebookErrorDetails = response; // Store full error details
            //console.log(`📤 [FACEBOOK-SEND] Facebook message sent: ${facebookSent}`);
            
            // NEW: Handle the specific Facebook error 2018001 more gracefully
            if (!facebookSent && response.error === 'NO_MATCHING_USER') {
              //console.log(`⚠️ [FACEBOOK-SEND] User hasn't started conversation with page`);
              
              // Update the conversation to indicate this issue
              await prisma.conversation.update({
                where: { id },
                data: {
                  metadata: JSON.stringify({
                    ...conversation.metadata ? JSON.parse(conversation.metadata) : {},
                    facebookSendError: 'USER_NOT_STARTED_CONVERSATION',
                    facebookErrorMessage: 'العميل لم يبدأ محادثة مع الصفحة',
                    lastFacebookErrorAt: new Date().toISOString()
                  })
                }
              });
            } else if (!facebookSent) {
              console.error(`❌ [FACEBOOK-SEND] Failed to send: ${response.message}`);
              if (response.solutions) {
                //console.log('🔧 [FACEBOOK-SEND] Solutions:');
                response.solutions.forEach(solution => {
                  //console.log(`   - ${solution}`);
                });
              }
            } else {
              //console.log(`✅ [FACEBOOK-SEND] Message sent successfully - will be saved via echo`);
            }
          } else {
            //console.log('⚠️ [FACEBOOK-SEND] No valid page access token or page ID available');
            //console.log(`   - Page Data: ${!!pageData}`);
            //console.log(`   - Page Access Token: ${!!pageData?.pageAccessToken}`);
            //console.log(`   - Actual Page ID: ${actualPageId}`);
            //console.log(`   - Last Webhook Page ID: ${lastWebhookPageId}`);
          }
        }
      } else {
        //console.log('⚠️ [FACEBOOK-SEND] Conversation or customer not found');
      }
    } catch (fbError) {
      console.error('❌ [FACEBOOK-SEND] Error sending Facebook message:', fbError);
      facebookErrorDetails = {
        success: false,
        error: 'FACEBOOK_SEND_ERROR',
        message: fbError.message,
        details: 'حدث خطأ أثناء إرسال الرسالة إلى فيسبوك'
      };
      // Don't fail the whole operation if Facebook sending fails
    }

    //console.log(`✅ Manual reply sent to Facebook - waiting for echo to save`);

    res.json({
      success: true,
      data: {
        conversationId: id,
        content: message,
        type: 'TEXT',
        isFromCustomer: false,
        isFacebookReply: true,
        facebookMessageId: facebookMessageId,
        sentAt: new Date()
      },
      message: facebookSent ? 'Reply sent successfully - message will appear when echo is received' : 'Failed to send to Facebook',
      facebookSent: facebookSent,
      facebookError: facebookErrorDetails,
      debug: {
        hasCustomer: !!conversation?.customer,
        hasFacebookId: !!conversation?.customer?.facebookId,
        facebookSent: facebookSent
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const uploadFile = async (req, res) => {
  try {
    const { id } = req.params;

    // Handle both single file (req.file) and multiple files (req.files)
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    //console.log(`📎 ${files.length} file(s) uploaded for conversation ${id}`);

    const uploadedFiles = [];

    // Process each file
    for (const file of files) {
      const fileUrl = `/uploads/conversations/${file.filename}`;

      // 🔧 تحسين: استخدام ngrok URL إذا كان متاحاً
      let fullUrl;
      const ngrokUrl = 'https://www.mokhtarelhenawy.online';
      if (ngrokUrl && ngrokUrl.startsWith('http')) {
        // استخدام ngrok للصور ليتمكن Facebook من الوصول إليها
        fullUrl = `${ngrokUrl}${fileUrl}`;
      } else {
        // العودة للرابط المحلي العادي
        fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;
      }

      // Determine message type
      const messageType = file.mimetype.startsWith('image/') ? 'IMAGE' : 'FILE';

      // Create attachment object
      const attachment = {
        url: fullUrl,
        name: file.originalname,
        size: file.size,
        type: messageType.toLowerCase(),
        mimeType: file.mimetype
      };

      // ⚡ OPTIMIZATION: لا نحفظ الملف هنا - سيتم حفظه تلقائياً عند استقبال echo من Facebook
      //console.log(`⏳ [FILE-SEND] Sending ${messageType} to Facebook - will be saved via echo...`);

      // Update conversation last message
      await prisma.conversation.update({
        where: { id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: messageType === 'IMAGE' ? '📷 صورة' : `📎 ${file.originalname}`,
          updatedAt: new Date()
        }
      });

      // Add to uploaded files array (without message ID since it will be created via echo)
      uploadedFiles.push({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        url: fileUrl,
        fullUrl: fullUrl,
        type: messageType
      });

      // Send file to customer via Facebook if conversation is from Facebook
      let facebookSent = false;
      let facebookMessageId = null; // Store Facebook message ID
      try {
        //console.log(`🔍 [FACEBOOK-FILE] Checking conversation ${id} for Facebook integration...`);
        const conversation = await prisma.conversation.findUnique({
          where: { id },
          include: { customer: true }
        });

        // التحقق من وجود Facebook ID للعميل
        const facebookUserId = conversation?.customer?.facebookId;

        if (conversation && conversation.customer && facebookUserId) {
          //console.log(`📤 [FACEBOOK-FILE] Sending ${messageType} to customer:`, facebookUserId);

          // Get Facebook page info - NEW: First try to get from conversation metadata
          let facebookPage = null;
          let actualPageId = null;
          
          // NEW: First try to get the page ID from the conversation metadata
          // This ensures we reply using the same page that received the original message
          if (conversation.metadata) {
            try {
              const metadata = JSON.parse(conversation.metadata);
              if (metadata.pageId) {
                //console.log(`🎯 [FACEBOOK-FILE] Using page ID from conversation metadata: ${metadata.pageId}`);
                const pageTokenData = await getPageToken(metadata.pageId);
                if (pageTokenData) {
                  facebookPage = {
                    pageId: metadata.pageId,
                    pageAccessToken: pageTokenData.pageAccessToken,
                    pageName: pageTokenData.pageName,
                    companyId: pageTokenData.companyId
                  };
                  actualPageId = metadata.pageId;
                } else {
                  //console.log('⚠️ [FACEBOOK-FILE] Page token not found for metadata page ID');
                }
              }
            } catch (parseError) {
              //console.log('⚠️ [FACEBOOK-FILE] Error parsing conversation metadata:', parseError.message);
            }
          }
          
          // If we still don't have a page, find the default connected page
          if (!facebookPage) {
            facebookPage = await prisma.facebookPage.findFirst({
              where: {
                companyId: conversation.companyId,
                status: 'connected'
              }
            });
            
            if (facebookPage) {
              actualPageId = facebookPage.pageId;
              //console.log(`✅ [FACEBOOK-FILE] Found Facebook page: ${facebookPage.pageName} (${actualPageId})`);
            }
          }

          if (facebookPage && facebookPage.pageAccessToken) {
            try {
              //console.log(`📤 [FACEBOOK-FILE] Using production Facebook sending for ${messageType}`);

              // 🔧 PRODUCTION: Use strict validation for file sending
              const result = await sendProductionFacebookMessage(
                facebookUserId,
                fullUrl,
                messageType,
                actualPageId || facebookPage.pageId,
                facebookPage.pageAccessToken
              );

              if (result.success) {
                //console.log(`✅ [FACEBOOK-FILE] ${messageType} sent successfully - will be saved via echo`);
                facebookSent = true;
                facebookMessageId = result.messageId;
              } else if (result.blocked) {
                console.warn(`🚫 [FACEBOOK-FILE] ${messageType} blocked: ${result.message}`);
                if (result.solutions) {
                  //console.log('🔧 [FACEBOOK-FILE] Suggested solutions:');
                  result.solutions.forEach(solution => {
                    //console.log(`   - ${solution}`);
                  });
                }
              } else {
                console.error(`❌ [FACEBOOK-FILE] Failed to send ${messageType}: ${result.message}`);
                if (result.solutions) {
                  //console.log('🔧 [FACEBOOK-FILE] Suggested solutions:');
                  result.solutions.forEach(solution => {
                    //console.log(`   - ${solution}`);
                  });
                }
                
                // Update conversation with error info for user experience
                if (result.error === 'NO_MATCHING_USER') {
                  await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: {
                      metadata: JSON.stringify({
                        ...conversation.metadata ? JSON.parse(conversation.metadata) : {},
                        lastFacebookError: 'NO_MATCHING_USER',
                        lastFacebookErrorMessage: 'العميل لم يبدأ محادثة مع الصفحة',
                        lastFacebookErrorAt: new Date().toISOString()
                      })
                    }
                  });
                }
              }
            } catch (fbError) {
              console.error(`❌ [FACEBOOK-FILE] Production send error:`, fbError.message);
            }
          } else {
            //console.log(`⚠️ [FACEBOOK-FILE] No Facebook page configured for company ${conversation.companyId}`);
          }
        } else {
          //console.log(`⚠️ [FACEBOOK-FILE] Conversation ${id} is not from Facebook or customer has no Facebook ID`);
        }
      } catch (facebookError) {
        console.error(`❌ [FACEBOOK-FILE] Error in Facebook integration:`, facebookError.message);
      }
    }

    // Return success response with all uploaded files
    res.json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      data: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    });
  }
} 

const postReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, quickReplyId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    // Prevent duplicate processing of the same message
    const messageKey = `${id}_${message}_${Date.now()}`;
    if (processedMessages.has(messageKey)) {
      //console.log(`⚠️ Message already processed, skipping duplicate: ${messageKey}`);
      return res.status(200).json({
        success: true,
        message: 'Message already processed'
      });
    }
    
    // Add to processed messages set and clean up after 1 minute
    processedMessages.add(messageKey);
    setTimeout(() => {
      processedMessages.delete(messageKey);
    }, 60000);

    //console.log(`📤 Sending reply to conversation ${id}: ${message}`);

    // ⚡ OPTIMIZATION: لا نحفظ الرسالة هنا - سيتم حفظها تلقائياً عند استقبال echo من Facebook
    //console.log(`⏳ [REPLY] Sending message to Facebook - will be saved via echo...`);

    // NEW: Send message to Facebook Messenger if conversation is from Facebook
    let facebookSent = false;
    let facebookMessageId = null; // Store Facebook message ID
    let facebookErrorDetails = null; // Store error details for frontend
    try {
      //console.log(`🔍 [FACEBOOK-REPLY] Checking conversation ${id} for Facebook integration...`);
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: { customer: true }
      });

      // التحقق من وجود Facebook ID للعميل
      const facebookUserId = conversation?.customer?.facebookId;

      if (conversation && conversation.customer && facebookUserId) {
        //console.log(`📤 [FACEBOOK-REPLY] Sending reply to customer:`, facebookUserId);

        // Get Facebook page info - NEW: First try to get from conversation metadata
        let facebookPage = null;
        let actualPageId = null;
        
        // NEW: First try to get the page ID from the conversation metadata
        // This ensures we reply using the same page that received the original message
        if (conversation.metadata) {
          try {
            const metadata = JSON.parse(conversation.metadata);
            if (metadata.pageId) {
              //console.log(`🎯 [FACEBOOK-REPLY] Using page ID from conversation metadata: ${metadata.pageId}`);
              const pageTokenData = await getPageToken(metadata.pageId);
              if (pageTokenData) {
                facebookPage = {
                  pageId: metadata.pageId,
                  pageAccessToken: pageTokenData.pageAccessToken,
                  pageName: pageTokenData.pageName,
                  companyId: pageTokenData.companyId
                };
                actualPageId = metadata.pageId;
              } else {
                //console.log('⚠️ [FACEBOOK-REPLY] Page token not found for metadata page ID');
              }
            }
          } catch (parseError) {
            //console.log('⚠️ [FACEBOOK-REPLY] Error parsing conversation metadata:', parseError.message);
          }
        }
        
        // If we still don't have a page, find the default connected page
        if (!facebookPage) {
          facebookPage = await prisma.facebookPage.findFirst({
            where: {
              companyId: conversation.companyId,
              status: 'connected'
            }
          });
          
          if (facebookPage) {
            actualPageId = facebookPage.pageId;
            //console.log(`✅ [FACEBOOK-REPLY] Found Facebook page: ${facebookPage.pageName} (${actualPageId})`);
          }
        }

        if (facebookPage && facebookPage.pageAccessToken) {
          try {
            //console.log(`📤 [FACEBOOK-REPLY] Using production Facebook sending for TEXT message`);

            // 🔧 PRODUCTION: Use strict validation for sending
            const response = await sendProductionFacebookMessage(
              facebookUserId,
              message,
              'TEXT',
              actualPageId || facebookPage.pageId,
              facebookPage.pageAccessToken
            );

            facebookSent = response.success;
            facebookMessageId = response.messageId; // Store Facebook message ID
            facebookErrorDetails = response; // Store full error details
            //console.log(`📤 [FACEBOOK-REPLY] Facebook message sent: ${facebookSent}`);
            
            // NEW: Handle the specific Facebook error 2018001 more gracefully
            if (!facebookSent && response.error === 'NO_MATCHING_USER') {
              //console.log(`⚠️ [FACEBOOK-REPLY] User hasn't started conversation with page`);
              
              // Update the conversation to indicate this issue
              await prisma.conversation.update({
                where: { id },
                data: {
                  metadata: JSON.stringify({
                    ...conversation.metadata ? JSON.parse(conversation.metadata) : {},
                    facebookSendError: 'USER_NOT_STARTED_CONVERSATION',
                    facebookErrorMessage: 'العميل لم يبدأ محادثة مع الصفحة',
                    lastFacebookErrorAt: new Date().toISOString()
                  })
                }
              });
            } else if (!facebookSent) {
              console.error(`❌ [FACEBOOK-REPLY] Failed to send: ${response.message}`);
              if (response.solutions) {
                //console.log('🔧 [FACEBOOK-REPLY] Solutions:');
                response.solutions.forEach(solution => {
                  //console.log(`   - ${solution}`);
                });
              }
            } else {
              //console.log(`✅ [FACEBOOK-REPLY] Message sent successfully - will be saved via echo`);
            }
          } catch (sendError) {
            console.error(`❌ [FACEBOOK-REPLY] Error in production sending:`, sendError);
            facebookSent = false;
            facebookErrorDetails = {
              success: false,
              error: 'FACEBOOK_SEND_ERROR',
              message: sendError.message,
              details: 'حدث خطأ أثناء إرسال الرسالة إلى فيسبوك'
            };
          }
        } else {
          //console.log('⚠️ [FACEBOOK-REPLY] No valid Facebook page or access token found');
          facebookErrorDetails = {
            success: false,
            error: 'NO_FACEBOOK_PAGE',
            message: 'لم يتم العثور على صفحة فيسبوك متصلة',
            details: 'تأكد من ربط الصفحة بشكل صحيح في إعدادات النظام'
          };
        }
      } else {
        //console.log(`🔍 [FACEBOOK-REPLY] Conversation is not from Facebook or customer has no Facebook ID`);
        if (facebookUserId) {
          facebookErrorDetails = {
            success: false,
            error: 'NO_FACEBOOK_ID',
            message: 'العميل ليس لديه معرف فيسبوك',
            details: 'هذا العميل لم يبدأ محادثة عبر فيسبوك'
          };
        }
      }
    } catch (facebookError) {
      console.error('❌ [FACEBOOK-REPLY] Error processing Facebook reply:', facebookError);
      facebookErrorDetails = {
        success: false,
        error: 'FACEBOOK_PROCESSING_ERROR',
        message: facebookError.message,
        details: 'حدث خطأ أثناء معالجة إرسال الرسالة إلى فيسبوك'
      };
      // Don't fail the whole operation if Facebook sending fails
    }

    // ⚡ OPTIMIZATION: لا نرسل Socket event هنا - سيتم إرساله تلقائياً عند استقبال echo من Facebook
    // هذا يمنع ظهور الرسالة مرتين في الفرونت إند
    //console.log(`⏳ [REPLY] Message will appear in frontend when echo is received`);

    // 🔧 FIX: Update conversation (only if message is not empty)
    if (message && message.trim() !== '') {
      await prisma.conversation.update({
        where: { id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: message.length > 100 ?
            message.substring(0, 100) + '...' : message
        }
      });
    }

    //console.log(`✅ Manual reply sent to Facebook - waiting for echo`);

    res.json({
      success: true,
      data: {
        conversationId: id,
        content: message,
        type: 'TEXT',
        isFromCustomer: false,
        isFacebookReply: true,
        facebookMessageId: facebookMessageId,
        sentAt: new Date()
      },
      message: facebookSent ? 'Reply sent successfully - message will appear when echo is received' : 'Failed to send to Facebook',
      facebookSent: facebookSent,
      facebookError: facebookErrorDetails
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// 🔧 FIX: Mark all messages in a conversation as read
const markConversationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    //console.log(`📖 [MARK-READ] Marking conversation ${id} as read for company ${companyId}`);

    // Verify conversation belongs to this company
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة أو غير مصرح بالوصول'
      });
    }

    // Update all unread messages from customer to read
    const result = await prisma.message.updateMany({
      where: {
        conversationId: id,
        isFromCustomer: true,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    //console.log(`✅ [MARK-READ] Marked ${result.count} messages as read in conversation ${id}`);

    res.json({
      success: true,
      message: `تم تحديد ${result.count} رسالة كمقروءة`,
      markedCount: result.count
    });

  } catch (error) {
    console.error('❌ [MARK-READ] Error marking conversation as read:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      message: error.message
    });
  }
};

const checkHealth = async (req, res) => {
  try {
    const { id } = req.params;
    //console.log(`🔍 [HEALTH-CHECK] Manual check for conversation: ${id}`);
    
    // ✅ إضافة companyId للعزل الأمني
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }
    
    const checker = new MessageHealthChecker();

    // ✅ تمرير companyId لل_checker
    const results = await checker.checkConversation(id, companyId);
    await checker.disconnect();

    const summary = {
      conversationId: id,
      totalChecked: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      fixed: results.filter(r => r.status === 'fixed').length,
      unfixable: results.filter(r => r.status === 'unfixable').length,
      details: results
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ [HEALTH-CHECK] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
module.exports = { deleteConverstation, postMessageConverstation, uploadFile, postReply, checkHealth, markConversationAsRead }