const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const socketService = require('../services/socketService');

// ⚠️ CRITICAL: Always use safeQuery() instead of direct prisma calls
// This ensures proper connection management and retry logic
function getPrisma() {
  return getSharedPrismaClient();
}

// Simple in-memory storage for tracking processed messages
const processedMessages = new Map();
let lastWebhookPageId = null;

// ⚡ Cache for AI-generated messages (to mark them as AI when echo arrives)
const aiMessagesCache = new Map();
const AI_CACHE_DURATION = 60 * 1000; // 1 minute

// ⚡ Cache for Facebook pages to avoid repeated database queries
const facebookPagesCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to get Facebook page with caching
async function getCachedFacebookPage(pageId) {
  const cached = facebookPagesCache.get(pageId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    // Using cached data
    return cached.data;
  }
  
  // Cache miss - fetching from database
  const pageData = await safeQuery(async () => {
    const prisma = getPrisma();
    return await prisma.facebookPage.findUnique({
      where: { pageId: pageId }
    });
  }, 2);
  
  if (pageData && pageData.status === 'connected') {
    //console.log(`✅ [PAGE-CACHE] Using connected page: ${pageData.pageName}`);
  }
  
  facebookPagesCache.set(pageId, {
    data: pageData,
    timestamp: Date.now()
  });
  
  return pageData;
}

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

// Auto-cleanup for processedMessages and cache to prevent memory leak
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  let cleanedCount = 0;
  
  // Clean processed messages
  for (const [messageId, timestamp] of processedMessages.entries()) {
    if (timestamp < oneHourAgo) {
      processedMessages.delete(messageId);
      cleanedCount++;
    }
  }
  
  // Clean Facebook pages cache
  let cacheCleanedCount = 0;
  for (const [pageId, cached] of facebookPagesCache.entries()) {
    if ((Date.now() - cached.timestamp) > CACHE_DURATION) {
      facebookPagesCache.delete(pageId);
      cacheCleanedCount++;
    }
  }
  
  if (cleanedCount > 0 || cacheCleanedCount > 0) {
     //console.log(`🧹 [CLEANUP] Messages: ${cleanedCount}, Cache: ${cacheCleanedCount}`);
  }
}, 30 * 60 * 1000); // Every 30 minutes

const getWebhook = async (req, res) => {
  const VERIFY_TOKEN = 'simple_chat_verify_token_2025';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      //console.log('✅ Facebook webhook verified');
      res.status(200).send(challenge);
    } else {
      //console.log('❌ Webhook verification failed - token mismatch');
      res.sendStatus(403);
    }
  } else {
    //console.log('❌ Missing mode or token');
    res.sendStatus(400);
  }
}

const postWebhook = async (req, res) => {
  try {
    // CRITICAL: Respond to Facebook immediately (within 5 seconds)
    res.status(200).send('EVENT_RECEIVED');

    const body = req.body;

    // Validate request body
    if (!body || !body.entry) {
      //console.log('⚠️ [WEBHOOK] Invalid webhook body received');
      return;
    }

  // Check if webhook contains actual messages
  const hasActualMessages = body?.entry?.some(entry =>
    entry.messaging?.some(msg => msg.message?.text || msg.message?.attachments)
  );

  // Check if webhook contains feed events (which may include comments)
  const hasFeedEvents = body?.entry?.some(entry =>
    entry.changes?.some(change => change.field === 'feed' && change.value)
  );

  // Skip logging for non-message events (delivery, read, etc.)
  if (!hasActualMessages && !hasFeedEvents) {
    return;
  }

  if (body?.object === 'page') {
      // Process each entry in the webhook
      for (const entry of body?.entry || []) {
        try {
      
          // NEW: Check if this page still exists in our database AND is connected
          // If not, ignore the webhook event to prevent processing orphaned events
          // ⚡ Using cache to avoid repeated database queries
          const pageExists = await getCachedFacebookPage(entry.id);
      
      // 🔒 CRITICAL FIX: Check both existence AND connection status
      if (!pageExists) {
        //console.log(`⚠️ [WEBHOOK] Ignoring webhook event from unregistered page: ${entry.id}`);
        continue;
      }
      
      if (pageExists.status === 'disconnected') {
        //console.log(`⚠️ [WEBHOOK] Ignoring webhook event from DISCONNECTED page: ${pageExists.pageName} (${entry.id})`);
        console.log(`   This page was disconnected at: ${pageExists.disconnectedAt}`);
        console.log(`   Please unsubscribe this page from webhooks in Facebook settings`);
        continue;
      }
      
      // Save Page ID from webhook
      if (entry.id) {
        lastWebhookPageId = entry.id;
      }

          // Process messaging events (existing code)
          if (entry.messaging && entry.messaging.length > 0) {
            try {
              // ⚡ Process messages in parallel for better performance
              const messagePromises = entry.messaging.map(async (webhookEvent) => {
                try {
          
          // Check if this is an echo message (sent from the page itself)
          const isEchoMessage = webhookEvent.message?.is_echo;
          const senderId = webhookEvent.sender?.id;
          const recipientId = webhookEvent.message?.from?.id || webhookEvent.recipient?.id || entry.id;
          
          // NEW: Store the page ID that received this message
          // This is critical for replying correctly
          const receivingPageId = entry.id;
          
          // If this is an echo message, it means the message was sent from the page
          if (isEchoMessage) {
            //console.log(`📤 [ECHO] ${webhookEvent.message.mid.slice(-8)} -> Customer ${webhookEvent.recipient?.id}`);
            
            // Handle echo messages (replies from page)
            await handlePageReply(webhookEvent, receivingPageId);
            return;
          }

          // 🎯 Customer message
          //console.log(`📨 [MSG] ${webhookEvent.message?.mid?.slice(-8)} from ${senderId}`);

          // Check for text message
          if (webhookEvent.message && webhookEvent.message.text) {
            await handleMessage(webhookEvent, receivingPageId);
          } else if (webhookEvent.message) {
            // Non-text message (images, files, etc.)
            const messageId = webhookEvent.message.mid;
            if (processedMessages.has(messageId)) {
              return;
            }
            processedMessages.set(messageId, Date.now());
            await handleMessage(webhookEvent, receivingPageId);
          }
                } catch (msgError) {
                  //console.error('❌ [WEBHOOK] Error processing message event:', msgError.message);
                }
              });
              
              // ⚡ Wait for all messages to be processed in parallel
              await Promise.all(messagePromises);
            } catch (messagingError) {
              console.error('❌ [WEBHOOK] Error processing messaging events:', messagingError.message);
            }
          }

          // Process feed events (NEW CODE - includes comments, posts, etc.)
          if (entry.changes && entry.changes.length > 0) {
            try {
              for (const change of entry.changes) {
                try {
                  if (change.field === 'feed' && change.value) {
                    // Check if this is a comment event
                    if (change.value.item === 'comment') {
                      // NEW: Check if this comment is from our own page (our bot's reply)
                      if (isCommentFromOurPage(change.value, entry.id)) {
                        //console.log(`🤖 [COMMENT] Ignoring comment from our own page: ${change.value.comment_id}`);
                        continue;
                      }
                      
                      await handleComment(change.value, entry.id);
                    }
                    // We can add more feed event types here in the future
                  }
                } catch (changeError) {
                  console.error('❌ [WEBHOOK] Error processing feed change:', changeError.message);
                  // Continue to next change instead of crashing
                }
              }
            } catch (feedError) {
              console.error('❌ [WEBHOOK] Error processing feed events:', feedError.message);
              // Continue to next entry instead of crashing
            }
          }
        } catch (entryError) {
          console.error('❌ [WEBHOOK] Error processing entry:', entryError.message);
          // Continue to next entry instead of crashing
        }
      }
    }
  } catch (error) {
    console.error('❌ [WEBHOOK] Critical error in postWebhook:', error);
    // Already sent response to Facebook, so just log and continue
  }
}

// NEW: Function to handle Facebook page replies (echo messages)
async function handlePageReply(webhookEvent, pageId = null) {
  try {
    const messageId = webhookEvent.message.mid;
    const messageText = webhookEvent.message.text || '';
    const hasAttachments = webhookEvent.message.attachments && webhookEvent.message.attachments.length > 0;
    
    // ⚡ CRITICAL: Check if this echo message was already processed
    //console.log(`🔍 [PAGE-REPLY] Processing echo: ${messageId.slice(-8)} | Already processed? ${processedMessages.has(messageId)}`);
    
    if (processedMessages.has(messageId)) {
      //console.log(`⚠️ [PAGE-REPLY] Echo message already processed - skipping duplicate: ${messageId.slice(-8)}`);
      return;
    }
    
    // Mark as processed immediately to prevent duplicates
    processedMessages.set(messageId, Date.now());
    //console.log(`✅ [PAGE-REPLY] Marked as processed: ${messageId.slice(-8)}`);
    
    // Better extraction of recipient ID from echo messages
    // For echo messages, the recipient is actually the customer who receives the message
    const recipientId = webhookEvent.recipient?.id; // Customer who received the message
    const pageSenderId = webhookEvent.sender.id; // Page that sent the message
    
    // Processing page reply (already logged in postWebhook)
    
    // Validate that we have a recipient ID
    if (!recipientId) {
      //console.log(`⚠️ [PAGE-REPLY] No recipient ID found in webhook event`);
      return;
    }
    
    // ⚡ Step 2 disabled for performance (manual message check)
    
    // Get companyId from the Facebook page first
    const facebookPage = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.facebookPage.findUnique({
        where: { pageId: pageId }
      });
    }, 3);
    
    if (!facebookPage || !facebookPage.companyId) {
      //console.log(`❌ [PAGE-REPLY] Facebook page not found or not linked to company: ${pageId}`);
      return;
    }
    
    // Find the customer who received this message with BOTH facebookId AND companyId
    let customer = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.customer.findUnique({
        where: {
          customer_facebook_company: {
            facebookId: recipientId,
            companyId: facebookPage.companyId
          }
        }
      });
    }, 5);
    
    if (!customer) {
      //console.log(`⚠️ [PAGE-REPLY] Customer not found for Facebook ID: ${recipientId}`);
     // console.log(`🚫 [PAGE-REPLY] Skipping echo message - customer should exist from previous conversation`);
      return;
    }
    
    // Customer found
    
    // Find existing conversation for this customer
    let conversation = await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.conversation.findFirst({
        where: {
          customerId: customer.id,
          status: { in: ['ACTIVE', 'RESOLVED'] }
        },
        orderBy: { lastMessageAt: 'desc' }
      });
    }, 5);
    
    // If no conversation exists, create one
    if (!conversation) {
      // Creating new conversation
      // Create a user-friendly preview for new conversation
      let initialPreview = messageText;
      if (hasAttachments && (!messageText || messageText.trim().length === 0)) {
        const attachment = webhookEvent.message.attachments[0];
        const attachmentType = attachment.type.toUpperCase();
        if (attachmentType === 'TEMPLATE') {
          initialPreview = '📋 رسالة منتج';
        } else if (attachmentType === 'IMAGE') {
          initialPreview = '📷 صورة';
        } else if (attachmentType === 'VIDEO') {
          initialPreview = '🎥 فيديو';
        } else if (attachmentType === 'FILE') {
          initialPreview = '📎 ملف';
        } else if (attachmentType === 'AUDIO') {
          initialPreview = '🎵 صوت';
        } else {
          initialPreview = `[${attachmentType}]`;
        }
      } else if (initialPreview && initialPreview.length > 100) {
        initialPreview = initialPreview.substring(0, 100) + '...';
      }
      
      conversation = await safeQuery(async () => {
        const prisma = getPrisma();
        return await prisma.conversation.create({
          data: {
            customerId: customer.id,
            companyId: customer.companyId,
            channel: 'FACEBOOK',
            status: 'ACTIVE',
            lastMessageAt: new Date(webhookEvent.timestamp),
            lastMessagePreview: initialPreview
          }
        });
      }, 3);
      
      // Conversation created
    }
    
    // التحقق من صحة محتوى الرسالة قبل الحفظ
    // ✅ السماح بالرسائل التي تحتوي على attachments حتى بدون نص
    // ❌ رفض فقط الرسائل التي لا تحتوي على نص ولا attachments
    if (!isValidMessageContent(messageText) && !hasAttachments) {
      //console.log(`⚠️ [PAGE-REPLY] رسالة بدون نص صالح أو attachments تم تجاهلها: "${messageText}"`);
      return; // Exit function without saving
    }
    
    // تحديد نوع الرسالة بناءً على المحتوى
    let messageType = 'TEXT';
    let messageContent = messageText;
    
    // إذا كانت الرسالة تحتوي على attachments فقط بدون نص
    if (hasAttachments && (!messageText || messageText.trim().length === 0)) {
      const attachment = webhookEvent.message.attachments[0];
      messageType = attachment.type.toUpperCase(); // IMAGE, VIDEO, FILE, TEMPLATE, etc.
      
      // Handle different attachment types
      if (attachment.type === 'template') {
        // Extract template content
        const template = attachment.payload;
        if (template.template_type === 'generic' && template.elements && template.elements.length > 0) {
          const element = template.elements[0];
          // Use image URL as content, or button URL if no image
          messageContent = element.image_url || 
                          (element.buttons && element.buttons[0]?.url) || 
                          '[Template Message]';
        } else {
          messageContent = '[Template Message]';
        }
      } else {
        // For other types (IMAGE, VIDEO, FILE, etc.)
        messageContent = attachment.payload?.url || `[${attachment.type}]`;
      }
    }
    
    // ⚡ Check if this message is AI-generated
    const aiMetadata = aiMessagesCache.get(messageId);
    const isAIGenerated = !!aiMetadata;
    
    if (isAIGenerated) {
      //console.log(`🤖 [AI-ECHO] Detected AI-generated message: ${messageId.slice(-8)}`);
      // Clean up cache
      aiMessagesCache.delete(messageId);
    }
    
    // ✅ Check if message already exists (to prevent duplicates from echo)
    const prisma = getPrisma();
    const existingMessage = await safeQuery(async () => {
      return await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          content: messageContent,
          isFromCustomer: false,
          createdAt: {
            gte: new Date(Date.now() - 60000) // Check last minute
          }
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
    }, 3);

    let pageReplyMessage = existingMessage;
    
    if (existingMessage) {
      console.log(`⚠️ [ECHO-SKIP] Message already exists (sent via API) - skipping duplicate save`);
    } else {
      // Save the page reply as a message in the existing conversation
      pageReplyMessage = await safeQuery(async () => {
        return await prisma.message.create({
          data: {
            content: messageContent,
            type: messageType,
            conversationId: conversation.id,
            isFromCustomer: false, // This is from the page, not the customer
            attachments: hasAttachments ? JSON.stringify(webhookEvent.message.attachments) : null,
            metadata: JSON.stringify({
              platform: 'facebook',
              source: isAIGenerated ? 'ai_agent' : 'page_reply',
              senderId: pageSenderId,
              recipientId: recipientId,
              isFacebookReply: true, // Mark as Facebook page reply
              facebookMessageId: messageId, // Store the Facebook message ID
              hasAttachments: hasAttachments,
              timestamp: new Date(webhookEvent.timestamp),
              // ⚡ Add AI metadata if available
              ...(isAIGenerated && aiMetadata ? {
                isAIGenerated: true,
                intent: aiMetadata.intent,
                sentiment: aiMetadata.sentiment,
                confidence: aiMetadata.confidence
              } : {})
            }),
            createdAt: new Date(webhookEvent.timestamp)
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });
      }, 5);
      console.log(`💾 [ECHO-SAVE] Message saved from echo`);
    }
    
    // Emit Socket.IO event to display in the frontend
    const io = socketService.getIO();
    if (io) {
      const parsedMetadata = JSON.parse(pageReplyMessage.metadata);
      const socketData = {
        id: pageReplyMessage.id,
        conversationId: pageReplyMessage.conversationId,
        content: pageReplyMessage.content,
        type: pageReplyMessage.type.toLowerCase(),
        isFromCustomer: pageReplyMessage.isFromCustomer,
        timestamp: pageReplyMessage.createdAt,
        metadata: parsedMetadata,
        attachments: pageReplyMessage.attachments, // Keep as string for frontend to parse
        isFacebookReply: true, // Mark as Facebook page reply for frontend
        facebookMessageId: messageId, // Include Facebook message ID
        // ⚡ Add isAiGenerated flag for frontend styling
        isAiGenerated: parsedMetadata.isAIGenerated || false,
        // ✅ Add sender information
        sender: pageReplyMessage.sender ? {
          id: pageReplyMessage.sender.id,
          name: `${pageReplyMessage.sender.firstName} ${pageReplyMessage.sender.lastName}`
        } : null
      };
      
      io.emit('new_message', socketData);
     // console.log(`✅ [SAVED] ${messageId.slice(-8)} -> Conv ${conversation.id}`);
    } else {
      //console.log(`❌ [PAGE-REPLY] Socket.IO not available - message saved but not broadcast`);
    }
    
    // Update conversation last message
    // Create a user-friendly preview based on message type
    let preview = messageContent;
    if (messageType === 'TEMPLATE') {
      preview = '📋 رسالة منتج';
    } else if (messageType === 'IMAGE') {
      preview = '📷 صورة';
    } else if (messageType === 'VIDEO') {
      preview = '🎥 فيديو';
    } else if (messageType === 'FILE') {
      preview = '📎 ملف';
    } else if (messageType === 'AUDIO') {
      preview = '🎵 صوت';
    } else if (preview && preview.length > 100) {
      preview = preview.substring(0, 100) + '...';
    }
    
    await safeQuery(async () => {
      const prisma = getPrisma();
      return await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(webhookEvent.timestamp),
          lastMessagePreview: preview
        }
      });
    }, 3);
    
    // Processing completed
    
  } catch (error) {
    console.error('❌ [PAGE-REPLY] Error processing Facebook page reply:', error);
  }
}

// NEW: Function to check if a comment is from our own page
function isCommentFromOurPage(commentData, pageId) {
  try {
    // PRIMARY CHECK: If sender ID matches page ID, this is definitely our own comment
    if (commentData.from?.id === pageId) {
     // console.log(`🤖 [COMMENT] Detected our own comment by sender ID match: ${commentData.comment_id}`);
      return true;
    }
    
    // SECONDARY CHECK: If the comment text matches our standard response
    // We'll check against a more generic pattern since responses can be customized
    if (commentData.message.includes("Thank you for your comment") || 
        commentData.message.includes("We'll get back to you soon")) {
     // console.log(`🤖 [COMMENT] Detected our standard response pattern: ${commentData.comment_id}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ [COMMENT] Error checking if comment is from our page:', error);
    return false;
  }
}

// Simplified message handling function
async function handleMessage(webhookEvent, pageId = null) {
  try {
    const senderId = webhookEvent.sender.id;
    const messageText = webhookEvent.message.text;
    const attachments = webhookEvent.message.attachments;

    // Extract the recipient page ID from the webhook event
    const recipientPageId = webhookEvent.recipient?.id || pageId;

    // 🤖 Call the proper AI processing function
    const { handleFacebookMessage } = require('../utils/allFunctions');
    await handleFacebookMessage(webhookEvent, recipientPageId);

  } catch (error) {
    console.error('❌ Error processing Facebook message:', error);
  }
}

// NEW: Function to handle Facebook comments
async function handleComment(commentData, pageId = null) {
  try {
   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
   console.log('💬 NEW COMMENT FROM FACEBOOK:');
   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
   console.log('📄 Page ID:', pageId);
   console.log('💬 Comment ID:', commentData.comment_id);
   console.log('💬 Post ID:', commentData.post_id);
    console.log('👤 Sender ID:', commentData.from?.id);
    console.log('👤 Sender Name:', commentData.from?.name);
    console.log('💬 Comment Text:', commentData.message);
   console.log('🕐 Created Time:', new Date(commentData.created_time * 1000).toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 🤖 Call the proper AI processing function for comments
    const { handleFacebookComment } = require('../utils/allFunctions');
    await handleFacebookComment(commentData, pageId);

  } catch (error) {
    console.error('❌ Error processing Facebook comment:', error);
  }
}

// Simple function to send response to Facebook
async function sendFacebookResponse(recipientId, messageText) {
  try {
    // Implementation would go here
  } catch (error) {
    console.error('❌ Error sending Facebook response:', error);
  }
}

// ⚡ Function to mark a message as AI-generated (called from allFunctions.js)
function markMessageAsAI(facebookMessageId, aiMetadata) {
  if (facebookMessageId) {
    aiMessagesCache.set(facebookMessageId, {
      ...aiMetadata,
      timestamp: Date.now()
    });
    console.log(`🤖 [AI-CACHE] Marked message as AI: ${facebookMessageId.slice(-8)}`);
  }
}

module.exports = { getWebhook, postWebhook, markMessageAsAI }