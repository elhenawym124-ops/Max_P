const { PrismaClient } = require('@prisma/client');
const memoryService = require('./memoryService');
const ContinuousLearningServiceV2 = require('./continuousLearningServiceV2');
const QualityMonitorService = require('./qualityMonitorService');
const PatternApplicationService = require('./patternApplicationService');
const PromptEnhancementService = require('./promptEnhancementService');
const ResponseOptimizer = require('./responseOptimizer');
const AIErrorHandler = require('./aiErrorHandler'); // نظام معالجة أخطاء الذكاء الاصطناعي

const prisma = new PrismaClient();

class AIAgentService {
  constructor() {
    this.prisma = prisma;
    this.ragService = null;
    this.isInitialized = false;
    this.learningService = new ContinuousLearningServiceV2();
    this.qualityMonitor = new QualityMonitorService(); // نظام التقييم الذكي
    this.patternApplication = new PatternApplicationService(); // خدمة تطبيق الأنماط
    this.promptEnhancement = new PromptEnhancementService(); // خدمة تحسين الـ prompts
    this.responseOptimizer = new ResponseOptimizer(); // محسن الردود
    this.errorHandler = new AIErrorHandler(); // نظام معالجة أخطاء الذكاء الاصطناعي
    this.exhaustedModelsCache = new Set(); // ذاكرة مؤقتة للنماذج المستنفدة
    this.currentActiveModel = null; // النموذج النشط الحالي للجلسة
    //console.log('🧠 [AIAgent] Continuous Learning Service initialized');
    //console.log('📊 [AIAgent] Quality Monitor Service initialized');
    //console.log('🎯 [AIAgent] Pattern Application Service initialized');
    //console.log('🎨 [AIAgent] Prompt Enhancement Service initialized');
    //console.log('🚀 [AIAgent] Response Optimizer initialized');
    //console.log('🛡️ [AIAgent] AI Error Handler initialized');
  }

  /**
   * Get current active model for the session (with fallback to fresh lookup)
   */
  async getCurrentActiveModel(companyId = null) {
    // إذا تم تمرير companyId، احصل على نموذج جديد للشركة المحددة
    if (companyId) {
      return await this.getActiveGeminiKey(companyId);
    }

    // إذا لم يتم تمرير companyId، يجب رفض الطلب للأمان
    console.error('❌ [SECURITY] getCurrentActiveModel called without companyId - request denied');
    return null;
  }

  /**
   * Update current active model (used when switching)
   */
  updateCurrentActiveModel(newModel) {
    //console.log(`🔄 [DEBUG] Updating current active model to: ${newModel?.model}`);
    this.currentActiveModel = newModel;
  }

  /**
   * Get current time of day for pattern context
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Process customer message and generate AI response
   */
  async processCustomerMessage(messageData) {
    try {
      //console.log('🤖 Processing customer message with advanced RAG system...');
      const startTime = Date.now();

      const { conversationId, senderId, content, attachments, customerData, companyId } = messageData;

      // 🔍 فحص حالة الذكاء الاصطناعي للمحادثة
      if (conversationId) {
        try {
          const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { id: true, customerId: true }
          });

          // التحقق من وجود حقل aiEnabled في metadata
          if (conversation && conversation.metadata) {
            try {
              const metadata = JSON.parse(conversation.metadata);
              if (metadata.aiEnabled === false) {
                //console.log(`🚫 [AI-DISABLED] AI is disabled for conversation ${conversationId}, skipping AI processing`);
                return {
                  success: false,
                  content: null,
                  reason: 'AI_DISABLED',
                  message: 'الذكاء الاصطناعي معطل لهذه المحادثة'
                };
              }
            } catch (metadataError) {
              console.warn('⚠️ [AI-CHECK] Could not parse conversation metadata, proceeding with AI processing');
            }
          }
        } catch (error) {
          console.warn('⚠️ [AI-CHECK] Could not check AI status for conversation, proceeding with AI processing:', error.message);
        }
      }
      //console.log('🔍 [DEBUG] Extracted content:', content);
      //console.log('🔍 [DEBUG] Content type:', typeof content);
      //console.log('🔍 [DEBUG] Attachments:', attachments);
      //console.log('🔍 [DEBUG] messageData:', JSON.stringify(messageData, null, 2));

      // 🖼️ معالجة الصور إذا كانت موجودة
      if (attachments && attachments.length > 0) {
        //console.log(`🖼️ [IMAGE-PROCESSING] Found ${attachments.length} attachment(s)`);

        // التحقق من وجود صور
        const imageAttachments = attachments.filter(att =>
          att.type === 'image' ||
          (att.payload && att.payload.url && att.payload.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        );

        if (imageAttachments.length > 0) {
          //console.log(`🖼️ [IMAGE-PROCESSING] Found ${imageAttachments.length} image(s), processing with multimodal service...`);

          try {
            // استدعاء خدمة معالجة الصور
            const multimodalService = require('./multimodalService');
            const imageResult = await multimodalService.processImage(messageData);

            //console.log('🖼️ [IMAGE-PROCESSING] Image analysis result:', imageResult);

            if (imageResult && imageResult.type === 'image_analysis') {
              // بدلاً من الرد المباشر، نمرر النتيجة للـ AI Agent للرد بشخصية ساره
              //console.log('🖼️ [IMAGE-ANALYSIS] Processing image result with AI Agent...');

              // تحديد نوع الاستعلام بناءً على نتيجة تحليل الصورة
              const intent = imageResult.productMatch?.found ? 'product_inquiry' : 'general_inquiry';

              // إنشاء رسالة للـ AI Agent
              const imageContext = imageResult.processedContent;
              const customerMessage = messageData.content || 'العميل أرسل صورة';

              // معالجة الصورة بدون استخدام الذاكرة لضمان الاستقلالية
              const aiResponse = await this.processImageWithAI(
                imageContext,
                messageData,
                intent,
                imageResult.productMatch
              );

              // حفظ الرد النهائي في الذاكرة بدلاً من التحليل الخام
              await this.saveImageResponseToMemory(
                messageData,
                aiResponse.content,
                imageResult.productMatch
              );

              return {
                ...aiResponse,
                imageAnalysis: imageResult.analysis,
                imageUrl: imageResult.imageUrl,
                productMatch: imageResult.productMatch
              };
            } else if (imageResult && imageResult.type === 'image_error') {
              // معالجة أخطاء الصور مع الـ AI Agent للرد بشخصية ساره
              //console.log('❌ [IMAGE-ERROR] Processing image error with AI Agent...');
              //console.log('🔍 [IMAGE-ERROR] Error type:', imageResult.errorType);
              //console.log('📝 [IMAGE-ERROR] Error context:', imageResult.processedContent);

              // تحديد نوع الاستعلام بناءً على نوع الخطأ
              const intent = imageResult.errorType === 'general_error' ? 'product_inquiry' : 'general_inquiry';

              // إنشاء رسالة واضحة للـ AI Agent
              const imageContext = imageResult.processedContent;
              const customerMessage = messageData.content || 'العميل أرسل صورة';

              //console.log('🤖 [IMAGE-ERROR] Sending to AI:', `${customerMessage}\n\nتوضيح الموقف: ${imageContext}`);

              // معالجة الرسالة مع الـ AI Agent
              const aiResponse = await this.processWithAI(
                `${customerMessage}\n\nتوضيح الموقف: ${imageContext}`,
                messageData,
                intent
              );

              return {
                ...aiResponse,
                shouldEscalate: imageResult.shouldEscalate || false,
                errorType: imageResult.errorType || 'general_error'
              };
            }
          } catch (imageError) {
            console.error('❌ [IMAGE-PROCESSING] Error processing image:', imageError);
            // في حالة فشل معالجة الصورة، نكمل بالمعالجة النصية العادية
          }
        }
      }

      // Get active Gemini key using session-aware system with company isolation
      const geminiConfig = await this.getCurrentActiveModel(companyId);

      if (!geminiConfig) {
        //console.log(`❌ No active Gemini key available for company: ${companyId}`);
        return {
          success: false,
          error: 'No active Gemini API key found',
          content: null, // 🤐 النظام الصامت - لا نرسل رسالة للعميل
          shouldEscalate: false,
          silent: true, // 🤐 علامة النظام الصامت
          errorType: 'no_api_key'
        };
      }

      //console.log(`✅ Using model: ${geminiConfig.model} from key: ${geminiConfig.keyId}`);

      // Initialize RAG service if not already done
      if (!this.ragService) {
        this.ragService = require('./ragService');
        await this.ragService.ensureInitialized();
      }

      // Get company ID from message data or customer data - NO FALLBACK TO FIRST COMPANY
      let finalCompanyId = companyId || customerData?.companyId;
      //console.log('🏢 [COMPANY-DEBUG] Final companyId for processing:', finalCompanyId);
      if (!finalCompanyId) {
        console.error('❌ [SECURITY] No companyId provided - rejecting request for security');
        return {
          success: false,
          error: 'Company ID is required for security isolation',
          content: null, // 🤐 النظام الصامت - لا نرسل رسالة للعميل
          shouldEscalate: false,
          silent: true, // 🤐 علامة النظام الصامت
          errorType: 'security_error'
        };
      }

      // Get company prompts and settings
      const companyPrompts = await this.getCompanyPrompts(finalCompanyId);

      // Get conversation memory with settings
      const settings = await this.getSettings(finalCompanyId);
      const memoryLimit = settings.maxMessagesPerConversation || 50;
      const conversationMemory = await memoryService.getConversationMemory(conversationId, senderId, memoryLimit, finalCompanyId);
      //console.log(`🧠 Retrieved ${conversationMemory.length} previous interactions from memory`);

      // Enhanced conversation context analysis
      const enhancedContext = await this.analyzeEnhancedConversationContext(content, conversationMemory, finalCompanyId);
      const intent = enhancedContext.intent;
      
      //console.log(`🎯 Enhanced analysis complete:`, {
      //   intent: enhancedContext.intent,
      //   confidence: enhancedContext.confidence,
      //   phase: enhancedContext.conversationPhase,
      //   engagement: enhancedContext.customerEngagement,
      //   direction: enhancedContext.conversationFlow.direction,
      //   memorySize: conversationMemory.length
      // });

      // Get unified smart response (images + RAG data)
      const smartResponse = await this.getSmartResponse(content, intent, conversationMemory, customerData?.id, finalCompanyId);
      const images = smartResponse.images;
      const ragData = smartResponse.ragData;
      const hasImages = images && images.length > 0;

      // Build advanced prompt with RAG data and enhanced context
      const advancedPrompt = await this.buildAdvancedPrompt(
        content,
        customerData,
        companyPrompts,
        ragData,
        conversationMemory, // Use full conversation memory respecting user settings
        hasImages,
        smartResponse,
        messageData
      );

      //console.log('🧠 Using advanced prompt with RAG data');
      //console.log('📝 Prompt preview:', advancedPrompt.substring(0, 200) + '...');
      //console.log('📏 Total prompt length:', advancedPrompt.length, 'characters');

      // Generate AI response using the unified method with enhanced context
      const aiContent = await this.generateAIResponse(
        advancedPrompt,
        conversationMemory, // Use full conversation memory
        true, // useRAG
        null, // providedGeminiConfig
        finalCompanyId, // companyId for pattern tracking
        conversationId, // conversationId for pattern usage recording
        { 
          messageType: intent, 
          inquiryType: intent,
          conversationPhase: enhancedContext.conversationPhase,
          customerEngagement: enhancedContext.customerEngagement,
          topicContinuity: enhancedContext.topicContinuity
        } // Enhanced message context
      );
      
      // Enhance the response with conversation state
      const enhancedResponse = this.enhanceResponseWithConversationState(
        aiContent, 
        {
          phase: enhancedContext.conversationPhase,
          engagement: enhancedContext.customerEngagement,
          needsRedirection: enhancedContext.needsRedirection,
          direction: enhancedContext.conversationFlow.direction,
          momentum: enhancedContext.conversationFlow.momentum
        },
        enhancedContext
      );
      
      const finalResponse = enhancedResponse || aiContent; // Fallback to original if enhancement fails

      const processingTime = Date.now() - startTime;

      //console.log(`✅ AI response generated in ${processingTime}ms with RAG data`);

      // Save interaction to memory
      try {
        await memoryService.saveInteraction({
          conversationId,
          senderId,
          companyId: finalCompanyId, // ✅ إضافة companyId للعزل الأمني
          userMessage: content,
          aiResponse: finalResponse, // Use enhanced response
          intent,
          sentiment: this.analyzeSentiment(content),
          timestamp: new Date()
        });
        //console.log(`💾 Interaction saved to memory`);
      } catch (memoryError) {
        console.error('⚠️ Failed to save to memory:', memoryError.message);
      }



      // Collect learning data for continuous improvement
      try {
        const sentiment = this.analyzeSentiment(content);
        await this.collectLearningData({
          companyId,
          customerId: senderId,
          conversationId,
          userMessage: content,
          aiResponse: finalResponse, // Use enhanced response
          intent,
          sentiment,
          processingTime,
          ragDataUsed: ragData.length > 0,
          memoryUsed: conversationMemory.length > 0,
          model: this.currentActiveModel?.model || geminiConfig.model,
          confidence: enhancedContext.confidence,
          // Enhanced conversation flow data
          conversationPhase: enhancedContext.conversationPhase,
          customerEngagement: enhancedContext.customerEngagement,
          topicContinuity: enhancedContext.topicContinuity,
          conversationDirection: enhancedContext.conversationFlow.direction,
          conversationMomentum: enhancedContext.conversationFlow.momentum,
          contextualCues: enhancedContext.contextualCues
        });
        //console.log(`📊 [AIAgent] Learning data collected for conversation: ${conversationId}`);
      } catch (learningError) {
        console.error('⚠️ [AIAgent] Failed to collect learning data:', learningError.message);
      }

      // فحص إذا كان العميل يرسل بيانات مطلوبة لطلب معلق
      const pendingOrderData = await this.checkForPendingOrderData(content, conversationMemory);
      if (pendingOrderData.isProvidingData) {
        //console.log('📋 [DATA-COLLECTION] العميل يرسل بيانات لطلب معلق...');

        // محاولة إنشاء الطلب بالبيانات الجديدة
        const orderCreationResult = await this.attemptOrderCreationWithNewData(pendingOrderData, messageData, conversationId);
        if (orderCreationResult) {
          return orderCreationResult;
        }
      }

      // Check if customer is confirming an order
      const orderConfirmation = await this.detectOrderConfirmation(content, conversationMemory, messageData.customerData?.id, companyId);
      let orderCreated = null;

      if (orderConfirmation.isConfirming) {
        //console.log('✅ [ORDER-CONFIRMATION] تم اكتشاف تأكيد الطلب');

        // محاولة استخراج تفاصيل الطلب إذا لم تكن موجودة
        if (!orderConfirmation.orderDetails) {
          //console.log('🔍 [ORDER-EXTRACTION] محاولة استخراج تفاصيل الطلب من المحادثة...');
          orderConfirmation.orderDetails = await this.extractOrderDetailsFromMemory(conversationMemory, finalCompanyId);
        }

        // التحقق من أن تفاصيل الطلب تم استخراجها بنجاح
        if (!orderConfirmation.orderDetails) {
          //console.log('⚠️ [ORDER-EXTRACTION] فشل في استخراج تفاصيل الطلب، طلب البيانات من العميل...');
          
          // إنشاء رد لطلب البيانات المطلوبة
          const dataRequestResponse = await this.generateDataRequestResponse(
            ['customerName', 'customerPhone'], 
            { productName: 'المنتج المطلوب' }
          );

          // إرجاع الرد لطلب البيانات بدلاً من إنشاء الطلب
          return {
            success: true,
            content: dataRequestResponse,
            model: geminiConfig?.model,
            keyId: geminiConfig?.id,
            processingTime: Date.now() - startTime,
            intent: 'data_collection',
            sentiment: this.analyzeSentiment(content),
            confidence: 0.9,
            shouldEscalate: false,
            switchType: 'normal',
            ragDataUsed: false,
            memoryUsed: true,
            images: [],
            orderCreated: null,
            dataCollection: {
              isRequesting: true,
              missingData: ['customerName', 'customerPhone'],
              orderDetails: null
            }
          };
        }

        //console.log('🛒 Customer is confirming order, checking data completeness...');

        // فحص اكتمال البيانات قبل إنشاء الطلب
        const dataCompleteness = await this.checkDataCompleteness(orderConfirmation.orderDetails, conversationMemory);

        if (!dataCompleteness.isComplete) {
          //console.log('📋 [DATA-COLLECTION] البيانات غير مكتملة، طلب البيانات المفقودة...');
          //console.log('📋 [DATA-COLLECTION] البيانات المفقودة:', dataCompleteness.missingData);

          // إنشاء رد لطلب البيانات المفقودة
          const dataRequestResponse = await this.generateDataRequestResponse(dataCompleteness.missingData, orderConfirmation.orderDetails);

          // إرجاع الرد لطلب البيانات بدلاً من إنشاء الطلب
          return {
            success: true,
            content: dataRequestResponse,
            model: geminiConfig?.model,
            keyId: geminiConfig?.id,
            processingTime: Date.now() - startTime,
            intent: 'data_collection',
            sentiment: this.analyzeSentiment(content),
            confidence: 0.9,
            shouldEscalate: false,
            switchType: 'normal',
            ragDataUsed: false,
            memoryUsed: true,
            images: [],
            orderCreated: null,
            dataCollection: {
              isRequesting: true,
              missingData: dataCompleteness.missingData,
              orderDetails: orderConfirmation.orderDetails
            }
          };
        }

        //console.log('✅ [DATA-COLLECTION] البيانات مكتملة، إنشاء الطلب...');
        try {
          // استخدام الخدمة المحسنة للطلبات
          const EnhancedOrderService = require('./enhancedOrderService');
          const enhancedOrderService = new EnhancedOrderService();

          //console.log('🚀 [AI-AGENT] استخدام الخدمة المحسنة لإنشاء الطلب...');

          // الحصول على companyId الصحيح - يجب استخدام finalCompanyId المؤكد
          const orderCompanyId = finalCompanyId || customerData?.companyId;

          // التأكد من وجود companyId قبل إنشاء الأوردر
          if (!orderCompanyId) {
            console.error('❌ [SECURITY] لا يمكن إنشاء أوردر بدون companyId - رفض الطلب');
            throw new Error('Company ID is required for order creation');
          }

          //console.log('🏢 [ORDER-CREATION] إنشاء أوردر للشركة:', orderCompanyId);

          orderCreated = await enhancedOrderService.createEnhancedOrder({
            conversationId,
            customerId: customerData?.id,
            companyId: orderCompanyId,
            productName: orderConfirmation.orderDetails.productName,
            productColor: orderConfirmation.orderDetails.productColor,
            productSize: orderConfirmation.orderDetails.productSize,
            productPrice: orderConfirmation.orderDetails.productPrice,
            quantity: orderConfirmation.orderDetails.quantity || 1,
            customerName: customerData?.name || 'عميل جديد',
            customerPhone: orderConfirmation.orderDetails.customerPhone || '',
            customerEmail: orderConfirmation.orderDetails.customerEmail || '',
            customerAddress: orderConfirmation.orderDetails.customerAddress || '',
            city: orderConfirmation.orderDetails.city || 'غير محدد',
            notes: `طلب تلقائي من المحادثة ${conversationId} - ${new Date().toLocaleString('ar-EG')}`,
            confidence: orderConfirmation.orderDetails.confidence || 0.7,
            extractionMethod: 'ai_enhanced'
          });

          if (orderCreated.success) {
            //console.log('✅ [AI-AGENT] تم إنشاء الطلب المحسن بنجاح:', orderCreated.order.orderNumber);

            // إنشاء نسخة احتياطية بالطريقة القديمة أيضاً
            try {
              const simpleOrderService = require('./simpleOrderService');
              const backupOrder = await simpleOrderService.createSimpleOrder({
                conversationId,
                customerId: customerData?.id,
                companyId: orderCompanyId, // استخدام نفس companyId المؤكد
                productName: orderConfirmation.orderDetails.productName,
                productColor: orderConfirmation.orderDetails.productColor,
                productSize: orderConfirmation.orderDetails.productSize,
                productPrice: orderConfirmation.orderDetails.productPrice,
                quantity: orderConfirmation.orderDetails.quantity || 1,
                customerName: customerData?.name || 'عميل جديد',
                customerPhone: orderConfirmation.orderDetails.customerPhone || '',
                city: orderConfirmation.orderDetails.city || 'غير محدد',
                notes: `طلب تلقائي من المحادثة ${conversationId} - ${new Date().toLocaleString('ar-EG')}`
              });

              if (backupOrder.success) {
                await simpleOrderService.saveOrderToFile(backupOrder.order);
                //console.log('💾 [AI-AGENT] تم حفظ نسخة احتياطية في ملف');
              }
            } catch (backupError) {
              console.warn('⚠️ [AI-AGENT] فشل في إنشاء النسخة الاحتياطية:', backupError.message);
            }
            
            // Return the order creation success response immediately
            const successMessage = `تم تأكيد طلبك بنجاح! 🎉

رقم الطلب: ${orderCreated.order.orderNumber}
الإجمالي: ${orderCreated.order.total} جنيه

هيتم التواصل معاك قريباً لتأكيد التوصيل. شكراً لثقتك فينا! 😊`;

            return {
              success: true,
              content: successMessage,
              intent: 'order_created',
              sentiment: 'positive',
              confidence: 0.95,
              shouldEscalate: false,
              switchType: 'normal',
              ragDataUsed: false,
              memoryUsed: true,
              images: [],
              orderCreated: orderCreated
            };
          }

          // إغلاق الاتصال
          await enhancedOrderService.disconnect();
        } catch (error) {
          console.error('❌ Error creating automatic order:', error);
        }
      }

      // 🤖 تقييم جودة الرد بالذكاء الاصطناعي
      try {
        const messageId = `msg_${conversationId}_${Date.now()}`;
        const evaluationData = {
          messageId,
          conversationId,
          userMessage: content,
          botResponse: finalResponse, // Use enhanced response
          ragData: {
            used: ragData.length > 0,
            sources: ragData
          },
          confidence: enhancedContext.confidence,
          model: this.currentActiveModel?.model || geminiConfig.model,
          timestamp: new Date(),
          companyId: finalCompanyId, // استخدام finalCompanyId المحدد مسبقاً
          // Enhanced conversation flow data for quality evaluation
          conversationFlow: {
            phase: enhancedContext.conversationPhase,
            engagement: enhancedContext.customerEngagement,
            topicContinuity: enhancedContext.topicContinuity,
            direction: enhancedContext.conversationFlow.direction,
            momentum: enhancedContext.conversationFlow.momentum,
            contextualCues: enhancedContext.contextualCues
          }
        };

        // تقييم الرد تلقائياً (غير متزامن)
        this.qualityMonitor.evaluateResponse(evaluationData).catch(error => {
          console.error('⚠️ [QUALITY-MONITOR] Error evaluating response:', error);
        });

        //console.log(`📊 [QUALITY-MONITOR] Response queued for evaluation: ${messageId}`);
      } catch (evaluationError) {
        console.error('❌ [QUALITY-MONITOR] Failed to queue evaluation:', evaluationError);
      }

      } // إغلاق if (orderConfirmation.isConfirming) من السطر 301

      //console.log(`\n📤 [FINAL-RESPONSE] ===== إعداد الرد النهائي المحسن =====`);
      //console.log(`📝 [FINAL-RESPONSE] محتوى الرد: "${finalResponse.substring(0, 100)}..."`);
      //console.log(`📸 [FINAL-RESPONSE] عدد الصور المرفقة: ${images ? images.length : 0}`);
      //console.log(`🔍 [FINAL-RESPONSE] مرحلة المحادثة: ${enhancedContext.conversationPhase}`);
      //console.log(`📊 [FINAL-RESPONSE] مستوى التفاعل: ${enhancedContext.customerEngagement}`);
      //console.log(`🎯 [FINAL-RESPONSE] اتجاه المحادثة: ${enhancedContext.conversationFlow.direction}`);

      if (images && images.length > 0) {
        //console.log(`✅ [FINAL-RESPONSE] الصور التي سيتم إرسالها:`);
        images.forEach((img, index) => {
          //console.log(`   📸 ${index + 1}. ${img.payload?.title || 'بدون عنوان'}`);
          //console.log(`      🔗 ${img.payload?.url?.substring(0, 60)}...`);
        });
      } else {
        //console.log(`❌ [FINAL-RESPONSE] لا توجد صور للإرسال`);
      }

      //console.log(`🎯 [FINAL-RESPONSE] ===== الرد المحسن جاهز للإرسال =====`);

      return {
        success: true,
        content: finalResponse, // Use enhanced response
        model: this.currentActiveModel?.model || geminiConfig.model,
        keyId: this.currentActiveModel?.keyId || geminiConfig.keyId,
        processingTime,
        intent,
        sentiment: this.analyzeSentiment(content),
        confidence: enhancedContext.confidence, // Use enhanced confidence
        shouldEscalate: enhancedContext.needsRedirection && enhancedContext.customerEngagement === 'low',
        switchType: this.currentActiveModel?.switchType || geminiConfig.switchType || 'normal',
        ragDataUsed: ragData.length > 0,
        memoryUsed: conversationMemory.length > 0,
        images: images,
        orderCreated: orderCreated,
        // Enhanced conversation flow metadata
        conversationFlow: {
          phase: enhancedContext.conversationPhase,
          engagement: enhancedContext.customerEngagement,
          topicContinuity: enhancedContext.topicContinuity,
          direction: enhancedContext.conversationFlow.direction,
          momentum: enhancedContext.conversationFlow.momentum,
          expectedNext: enhancedContext.conversationFlow.expectedNext,
          contextualCues: enhancedContext.contextualCues,
          suggestedActions: enhancedContext.suggestedActions
        }
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('🚨 [AIAgent] Error in processCustomerMessage:', error);

      // استخدام نظام معالجة الأخطاء المحسن
      const errorContext = {
        companyId: finalCompanyId || messageData.companyId,
        conversationId,
        customerId: senderId,
        intent: messageData.intent,
        userMessage: content,
        isUrgent: this.isUrgentMessage(content),
        consecutiveFailures: messageData.consecutiveFailures || 1
      };

      // معالجة شاملة للخطأ وإرجاع رد مناسب
      const fallbackResponse = await this.errorHandler.handleError(error, errorContext);

      // إضافة معلومات المعالجة
      const enhancedResponse = {
        ...fallbackResponse,
        model: geminiConfig?.model || 'unknown',
        keyId: geminiConfig?.id || 'unknown',
        processingTime,
        intent: errorContext.intent || 'general_inquiry',
        sentiment: this.analyzeSentiment(content),
        switchType: 'error_fallback',
        ragDataUsed: false,
        memoryUsed: false,
        images: [],
        orderCreated: null
      };

      // حفظ الخطأ في الذاكرة للتعلم
      try {
        await memoryService.saveInteraction({
          conversationId,
          senderId,
          companyId: finalCompanyId,
          userMessage: content,
          aiResponse: fallbackResponse.content,
          intent: 'error_fallback',
          sentiment: 'neutral',
          timestamp: new Date(),
          metadata: {
            errorType: fallbackResponse.errorType,
            fallback: true,
            requiresHumanIntervention: fallbackResponse.requiresHumanIntervention,
            enhancedContextAvailable: false // Indicate this was a fallback without enhanced context
          }
        });
      } catch (memoryError) {
        console.error('⚠️ [AIAgent] Failed to save error interaction to memory:', memoryError);
      }

      // محاولة إعادة المحاولة مع نموذج بديل في حالات معينة
      if (error.status === 429 || error.message.includes('quota')) {
        try {
          const backupModel = await this.findNextAvailableModel(finalCompanyId);
          if (backupModel && (messageData.retryCount || 0) < 1) {
            //console.log('🔄 [AIAgent] Retrying with backup model:', backupModel.model);
            
            const retryMessageData = {
              ...messageData,
              retryCount: (messageData.retryCount || 0) + 1
            };
            
            return await this.processCustomerMessage(retryMessageData);
          }
        } catch (retryError) {
          console.error('❌ [AIAgent] Backup model also failed:', retryError);
        }
      }

      //console.log('🔄 [AI-FALLBACK] Generated enhanced fallback response:', {
      //   content: enhancedResponse.content.substring(0, 50) + '...',
      //   shouldEscalate: enhancedResponse.shouldEscalate,
      //   errorType: enhancedResponse.errorType,
      //   requiresHumanIntervention: enhancedResponse.requiresHumanIntervention
      // });

      return enhancedResponse;
    }
  }

  /**
   * معالجة الصور مع الـ AI بدون استخدام الذاكرة لضمان الاستقلالية
   */
  async processImageWithAI(imageAnalysis, messageData, intent = 'general_inquiry', productMatch = null) {
    try {
      //console.log('🖼️ [IMAGE-AI] Processing image with AI (memory-independent)...');

      // الحصول على معلومات الشركة والـ prompts
      const finalCompanyId = messageData.companyId || messageData.customerData?.companyId;
      //console.log('🏢 [IMAGE-AI] Using companyId:', finalCompanyId);
      const companyPrompts = await this.getCompanyPrompts(finalCompanyId);

      // بناء prompt خاص بالصور بدون استخدام الذاكرة
      const imagePrompt = this.buildImageResponsePrompt(
        imageAnalysis,
        companyPrompts,
        productMatch,
        messageData.customerData
      );

      // تحضير سياق الرسالة للأنماط (بدون ذاكرة)
      const messageContext = {
        messageType: 'image_analysis',
        inquiryType: intent,
        timeOfDay: this.getTimeOfDay(),
        customerHistory: {
          isReturning: false, // نعتبر كل صورة كتفاعل جديد
          previousPurchases: 0
        }
      };

      // إنشاء الرد مع الـ AI بدون ذاكرة
      const aiContent = await this.generateAIResponse(
        imagePrompt,
        [], // ذاكرة فارغة لضمان الاستقلالية
        true,
        null, // geminiConfig
        finalCompanyId,
        messageData.conversationId,
        messageContext
      );

      //console.log('✅ [IMAGE-AI] Image processed successfully with independent analysis');

      return {
        content: aiContent,
        intent: intent,
        confidence: 0.9,
        shouldEscalate: false,
        metadata: {
          processingType: 'image_independent',
          hasProductMatch: !!productMatch?.found,
          analysisTimestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ [IMAGE-AI] Error processing image with AI:', error);

      // رد افتراضي في حالة الخطأ
      return {
        content: 'عذراً، حدث خطأ في تحليل الصورة. ممكن تجربي ترسليها تاني؟',
        intent: 'error_handling',
        confidence: 0.1,
        shouldEscalate: true,
        metadata: {
          processingType: 'image_error',
          error: error.message
        }
      };
    }
  }

  /**
   * دالة معالجة منفصلة مع الـ AI Agent للصور
   */
  async processWithAI(content, messageData, intent = 'general_inquiry') {
    const startTime = Date.now();

    try {
      //console.log('🤖 [AI-PROCESSING] Processing with AI Agent...');
      //console.log('📝 [AI-PROCESSING] Content:', content.substring(0, 100) + '...');
      //console.log('🎯 [AI-PROCESSING] Intent:', intent);

      // الحصول على معلومات الشركة والـ prompts
      const finalCompanyId = messageData.companyId || messageData.customerData?.companyId;
      //console.log('🏢 [COMPANY-DEBUG] Using companyId:', finalCompanyId);
      const companyPrompts = await this.getCompanyPrompts(finalCompanyId);

      // جلب الذاكرة والتفاعلات السابقة
      // الحصول على إعدادات الذاكرة من قاعدة البيانات
      const settings = await this.getSettings(finalCompanyId);
      const memoryLimit = settings.maxMessagesPerConversation || 50;
      const conversationMemory = await memoryService.getConversationMemory(messageData.conversationId, messageData.senderId, memoryLimit, finalCompanyId);

      // معالجة الرد مع الـ RAG إذا كان مطلوباً
      let ragData = [];
      if (intent === 'product_inquiry' || intent === 'price_inquiry') {
        try {
          if (!this.ragService) {
            this.ragService = require('./ragService');
            await this.ragService.ensureInitialized();
          }
          ragData = await this.ragService.retrieveRelevantData(content, intent, customerData?.id, finalCompanyId);
        } catch (error) {
          console.error('❌ Error getting RAG data:', error);
          ragData = [];
        }
      }

      // إنشاء الـ prompt المتقدم
      const prompt = this.buildPrompt(content, companyPrompts, conversationMemory, ragData, messageData.customerData, messageData);

      // تحضير سياق الرسالة للأنماط
      const messageContext = {
        messageType: intent,
        inquiryType: intent,
        timeOfDay: this.getTimeOfDay(),
        customerHistory: {
          isReturning: conversationMemory.length > 0,
          previousPurchases: 0 // يمكن تحسينه لاحقاً
        }
      };

      // إنشاء الرد مع الـ AI مع تطبيق الأنماط
      const aiContent = await this.generateAIResponse(
        prompt,
        conversationMemory,
        true,
        null, // geminiConfig
        finalCompanyId,
        messageData.conversationId,
        messageContext
      );

      // الحصول على معلومات النموذج المستخدم للشركة
      const currentModel = await this.getCurrentActiveModel(finalCompanyId);

      return {
        success: true,
        content: aiContent,
        model: currentModel?.model || 'unknown',
        keyId: currentModel?.keyId || 'unknown',
        processingTime: Date.now() - startTime,
        intent: intent,
        sentiment: 'neutral',
        confidence: 0.9,
        shouldEscalate: false,
        ragDataUsed: ragData.length > 0,
        memoryUsed: conversationMemory.length > 0,
        images: []
      };

    } catch (error) {
      // 🤐 النظام الصامت - تسجيل الخطأ داخلياً فقط
      console.error('🚨 [SILENT-AI-ERROR] ProcessWithAI error (hidden from customer):', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      });

      return {
        success: false,
        error: error.message,
        content: null, // 🚫 لا محتوى للعميل - صمت تام
        shouldEscalate: false, // 🚫 لا تصعيد تلقائي
        processingTime: Date.now() - startTime,
        errorType: 'ai_processing_error',
        silent: true // 🤐 علامة الصمت
      };
    }
  }

  /**
   * حفظ الرد النهائي للصورة في الذاكرة
   */
  async saveImageResponseToMemory(messageData, finalResponse, productMatch) {
    try {
      const memoryService = require('./memoryService');

      // حفظ الرد النهائي المفيد بدلاً من التحليل الخام
      await memoryService.saveInteraction({
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        companyId: messageData.companyId,
        userMessage: 'العميل أرسل صورة منتج',
        aiResponse: finalResponse, // الرد النهائي المفيد
        intent: 'image_analysis',
        sentiment: 'neutral',
        timestamp: new Date(),
        metadata: {
          hasProductMatch: !!productMatch?.found,
          productName: productMatch?.productName || null,
          processingType: 'image_independent'
        }
      });

      //console.log('💾 Final image response saved to memory (helpful response, not raw analysis)');
    } catch (error) {
      //console.log('⚠️ Could not save image response to memory:', error.message);
    }
  }

  /**
   * بناء prompt خاص بالصور بدون استخدام الذاكرة
   */
  buildImageResponsePrompt(imageAnalysis, companyPrompts, productMatch, customerData) {
    let prompt = '';

    // إضافة شخصية الشركة
    if (companyPrompts.personalityPrompt) {
      prompt += companyPrompts.personalityPrompt + '\n\n';
    }

    // تعليمات خاصة بالرد على الصور
    prompt += `🖼️ مهمة: الرد على العميل بناءً على تحليل الصورة المرسلة

📋 معلومات تحليل الصورة:
${imageAnalysis}

🎯 تعليمات مهمة للرد:
1. ✅ استخدم نتائج تحليل الصورة فقط
2. 🚫 لا تشير لأي محادثات أو تفاعلات سابقة
3. 💬 رد بشكل طبيعي وودود كأنها أول مرة تتفاعل مع العميل
4. 🎨 اذكر الألوان والتفاصيل التي تم تحليلها
5. 💰 اذكر السعر إذا تم العثور على منتج مطابق
6. ❓ اسأل إذا كان العميل يريد معرفة المزيد

`;

    // إضافة معلومات المطابقة إذا وجدت
    if (productMatch && productMatch.found) {
      prompt += `✅ تم العثور على منتج مطابق:
- اسم المنتج: ${productMatch.productName}
- السعر: ${productMatch.price}
- التفاصيل: ${productMatch.details || 'غير متوفر'}

`;
    } else {
      prompt += `⚠️ لم يتم العثور على منتج مطابق تماماً في المتجر.

`;
    }

    // إضافة معلومات العميل إذا توفرت
    if (customerData && customerData.name) {
      prompt += `👤 معلومات العميل: ${customerData.name}\n\n`;
    }

    prompt += `🎯 المطلوب: رد طبيعي وودود بناءً على تحليل الصورة فقط، بدون أي إشارة لسياق سابق.`;

    return prompt;
  }

  /**
   * بناء الـ prompt للذكاء الاصطناعي
   */
  buildPrompt(customerMessage, companyPrompts, conversationMemory, ragData, customerData, messageData = null) {
    let prompt = '';

    // //console.log('🔍 Building prompt with companyPrompts:', {
    //   hasPersonalityPrompt: !!companyPrompts.personalityPrompt,
    //   source: companyPrompts.source,
    //   promptLength: companyPrompts.personalityPrompt?.length || 0,
    //   hasReplyContext: !!(messageData?.replyContext?.isReply)
    // });

    // التحقق من وجود personality prompt مخصص
    if (!companyPrompts.personalityPrompt || companyPrompts.personalityPrompt.trim() === '') {
      //console.log('❌ لا يوجد personality prompt مخصص للشركة');
      throw new Error('MISSING_PERSONALITY_PROMPT: يجب إعداد شخصية المساعد الذكي من لوحة التحكم أولاً');
    }

    //console.log('✅ استخدام personality prompt مخصص من الشركة');
    prompt += `${companyPrompts.personalityPrompt.trim()}\n\n`;

    // Add response guidelines
    if (companyPrompts.responsePrompt) {
      prompt += `${companyPrompts.responsePrompt}\n\n`;
    } else {
      prompt += `قواعد الرد المهمة:
1. ⚠️ استخدمي فقط المعلومات الموجودة في قاعدة البيانات المذكورة أدناه
2. 🚫 لا تذكري أي منتجات أو معلومات غير موجودة في قاعدة البيانات
3. ✅ قدمي أسعار ومواصفات دقيقة من قاعدة البيانات فقط (لا تذكر أسعار تخيلية)
4. ❓ إذا لم تجدي معلومات، اطلبي توضيحاً أو قولي أن المنتج غير متوفر\n\n`;
    }

    // Add customer information
    prompt += `معلومات العميل:
- الاسم: ${customerData?.name || 'عميل جديد'}
- الهاتف: ${customerData?.phone || 'غير محدد'}
- عدد الطلبات السابقة: ${customerData?.orderCount || 0}\n\n`;

    // 🔄 إضافة معلومات الرد إذا كان العميل يرد على رسالة سابقة
    if (messageData?.replyContext?.isReply) {
      //console.log('🔄 [REPLY-CONTEXT] العميل يرد على رسالة سابقة');
      prompt += `🔄 سياق الرد - العميل يرد على رسالة سابقة:\n`;
      prompt += `=====================================\n`;

      if (messageData.replyContext.originalMessage?.content) {
        prompt += `📝 الرسالة الأصلية التي يرد عليها العميل:\n`;
        prompt += `"${messageData.replyContext.originalMessage.content}"\n\n`;

        const originalDate = new Date(messageData.replyContext.originalMessage.createdAt);
        const timeAgo = this.getTimeAgo(originalDate);
        prompt += `⏰ تم إرسال الرسالة الأصلية منذ: ${timeAgo}\n\n`;
      } else {
        prompt += `📝 العميل يرد على رسالة سابقة (المحتوى غير متوفر)\n\n`;
      }

      prompt += `💬 رد العميل الحالي: "${customerMessage}"\n`;
      prompt += `=====================================\n`;
      prompt += `💡 مهم: اربطي ردك بالرسالة الأصلية وتأكدي من الاستمرارية في السياق.\n\n`;
    }

    // Add conversation memory if available
    if (conversationMemory && conversationMemory.length > 0) {
      prompt += `📚 سجل المحادثة السابقة (للسياق):\n`;
      prompt += `=====================================\n`;

      conversationMemory.forEach((interaction, index) => {
        const timeAgo = this.getTimeAgo(new Date(interaction.timestamp));
        prompt += `${index + 1}. منذ ${timeAgo}:\n`;
        prompt += `   العميل: ${interaction.userMessage}\n`;
        prompt += `   ردك: ${interaction.aiResponse}\n\n`;
      });

      prompt += `=====================================\n`;
      prompt += `💡 استخدمي هذا السجل لفهم السياق والاستمرارية في المحادثة.\n\n`;
    }

    // Add RAG data if available
    if (ragData && ragData.length > 0) {
      prompt += `🗃️ المعلومات المتاحة من قاعدة البيانات (استخدميها فقط):\n`;
      prompt += `=====================================\n`;

      ragData.forEach((item, index) => {
        if (item.type === 'product') {
          prompt += `🛍️ منتج ${index + 1}: ${item.content}\n`;
        } else if (item.type === 'faq') {
          prompt += `❓ سؤال شائع ${index + 1}: ${item.content}\n`;
        } else if (item.type === 'policy') {
          prompt += `📋 سياسة ${index + 1}: ${item.content}\n`;
        }
      });

      prompt += `=====================================\n\n`;
      prompt += `⚠️ مهم جداً: استخدمي فقط المعلومات المذكورة أعلاه. لا تذكري أي منتجات أو معلومات أخرى غير موجودة في القائمة.\n\n`;
    }

    // Add customer message
    prompt += `رسالة العميل: "${customerMessage}"\n\n`;

    // Add final instructions
    if (ragData && ragData.length > 0) {
      prompt += `🎯 تعليمات الرد النهائية:
1. ✅ استخدمي فقط المعلومات الموجودة في قاعدة البيانات أعلاه
2. 🚫 لا تذكري أي منتجات أو معلومات غير موجودة في القائمة
3. 💰 اذكري الأسعار والتفاصيل الدقيقة كما هي مكتوبة
4. 📝 إذا سأل عن منتجات، اعرضي المنتجات المتاحة بالتفصيل
5. ❌ إذا لم يكن المنتج في القائمة، قولي أنه غير متوفر حالياً
6. 🗣️ استخدمي اللغة العربية الطبيعية والودودة\n\n`;
    }

    return prompt;
  }

  /**
   * Get company prompts and settings
   */
  async getCompanyPrompts(companyId) {
    //console.log('🔍 Getting company prompts for:', companyId);

    // Require companyId for security
    if (!companyId) {
      console.error('❌ [SECURITY] companyId is required for getCompanyPrompts');
      return {
        personalityPrompt: null,
        responsePrompt: null,
        hasCustomPrompts: false,
        source: 'none'
      };
    }

    try {
      // 1. First check for active system prompt (highest priority)
      //console.log('🔍 Checking for active system prompt...');

      try {
        const activeSystemPrompt = await this.prisma.systemPrompt.findFirst({
          where: {
            isActive: true,
            companyId: companyId  // إضافة فلترة حسب الشركة للأمان
          },
          orderBy: { updatedAt: 'desc' }
        });

        if (activeSystemPrompt) {
          //console.log('✅ Found active system prompt:', activeSystemPrompt.name);
          //console.log('📝 Prompt length:', activeSystemPrompt.content.length, 'characters');
          return {
            personalityPrompt: activeSystemPrompt.content,
            responsePrompt: null,
            hasCustomPrompts: true,
            source: 'system_prompt',
            promptName: activeSystemPrompt.name
          };
        } else {
          //console.log('❌ No active system prompt found');
        }
      } catch (systemPromptError) {
        console.error('❌ Error checking system prompts:', systemPromptError.message);
        //console.log('⚠️ Falling back to other prompt sources...');
      }

      // 2. Check AI settings table
      //console.log('🔍 Checking AI settings table...');
      try {
        const aiSettings = await this.prisma.aiSettings.findFirst({
          where: { companyId }
        });

        if (aiSettings && (aiSettings.personalityPrompt || aiSettings.responsePrompt)) {
          //console.log('✅ Found prompts in AI settings');
          return {
            personalityPrompt: aiSettings.personalityPrompt,
            responsePrompt: aiSettings.responsePrompt,
            hasCustomPrompts: !!(aiSettings.personalityPrompt || aiSettings.responsePrompt),
            source: 'ai_settings'
          };
        } else {
          //console.log('❌ No prompts in AI settings');
        }
      } catch (aiSettingsError) {
        console.error('❌ Error checking AI settings:', aiSettingsError.message);
      }

      // 3. Fallback to company table
      //console.log('🔍 Checking company table...');
      try {
        const company = await this.prisma.company.findUnique({
          where: { id: companyId }
        });

        if (company && (company.personalityPrompt || company.responsePrompt)) {
          //console.log('✅ Found prompts in company table');
          return {
            personalityPrompt: company.personalityPrompt,
            responsePrompt: company.responsePrompt,
            hasCustomPrompts: !!(company.personalityPrompt || company.responsePrompt),
            source: 'company'
          };
        } else {
          //console.log('❌ No prompts in company table');
        }
      } catch (companyError) {
        console.error('❌ Error checking company table:', companyError.message);
      }

      //console.log('❌ No custom prompts found, using default');
      return {
        personalityPrompt: null,
        responsePrompt: null,
        hasCustomPrompts: false,
        source: 'default'
      };
    } catch (error) {
      console.error('❌ Error getting company prompts:', error);
      return {
        personalityPrompt: null,
        responsePrompt: null,
        hasCustomPrompts: false,
        source: 'error'
      };
    }
  }

  /**
   * Reload system prompt (called when prompt is activated)
   */
  async reloadSystemPrompt() {
    try {
      //console.log('🔄 Reloading system prompt...');
      // Clear any cached prompts if needed
      this.cachedPrompts = null;
      //console.log('✅ System prompt reloaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error reloading system prompt:', error);
      return false;
    }
  }

  /**
   * Build advanced prompt with RAG data, company settings, and conversation memory
   */
  async buildAdvancedPrompt(customerMessage, customerData, companyPrompts, ragData, conversationMemory = [], hasImages = false, smartResponseInfo = null, messageData = null) {
    let prompt = '';

    //console.log('🔍 Building prompt with companyPrompts:', {
    //   hasPersonalityPrompt: !!companyPrompts.personalityPrompt,
    //   source: companyPrompts.source,
    //   promptLength: companyPrompts.personalityPrompt?.length || 0
    // });

    // التحقق من وجود personality prompt مخصص
    if (!companyPrompts.personalityPrompt || companyPrompts.personalityPrompt.trim() === '') {
      //console.log('❌ لا يوجد personality prompt مخصص للشركة');
      throw new Error('MISSING_PERSONALITY_PROMPT: يجب إعداد شخصية المساعد الذكي من لوحة التحكم أولاً');
    }

    //console.log('✅ استخدام personality prompt مخصص من الشركة');
    prompt += `${companyPrompts.personalityPrompt.trim()}\n\n`;

    // Add response guidelines
    if (companyPrompts.responsePrompt) {
      prompt += `${companyPrompts.responsePrompt}\n\n`;
    } else {
      prompt += `🔐 قواعد العزل الصارمة:
1. ⚠️ استخدمي فقط المعلومات الموجودة في قاعدة البيانات المذكورة أدناه
2. 🚫 لا تذكري أي منتجات أو معلومات غير موجودة في قاعدة البيانات
3. ✅ قدمي أسعار ومواصفات دقيقة من قاعدة البيانات فقط
4. ❓ إذا لم تجدي معلومات، اطلبي توضيحاً أو قولي أن المنتج غير متوفر
5. 🔐 لا تذكري منتجات من شركات أخرى أبداً - فقط المنتجات المرفقة
6. 🚨 إذا كانت قاعدة البيانات فارغة، قولي أنه لا توجد منتجات متوفرة حالياً\n\n`;
    }

    // Add customer information
    prompt += `معلومات العميل:
- الاسم: ${customerData?.name || 'عميل جديد'}
- الهاتف: ${customerData?.phone || 'غير محدد'}
- عدد الطلبات السابقة: ${customerData?.orderCount || 0}\n\n`;

    // 🔄 إضافة معلومات الرد إذا كان العميل يرد على رسالة سابقة
    if (messageData?.replyContext?.isReply) {
      //console.log('🔄 [REPLY-CONTEXT] العميل يرد على رسالة سابقة في buildAdvancedPrompt');
      prompt += `🔄 سياق الرد - العميل يرد على رسالة سابقة:\n`;
      prompt += `=====================================\n`;

      if (messageData.replyContext.originalMessage?.content) {
        prompt += `📝 الرسالة الأصلية التي يرد عليها العميل:\n`;
        prompt += `"${messageData.replyContext.originalMessage.content}"\n\n`;

        const originalDate = new Date(messageData.replyContext.originalMessage.createdAt);
        const timeAgo = this.getTimeAgo(originalDate);
        prompt += `⏰ تم إرسال الرسالة الأصلية منذ: ${timeAgo}\n\n`;
      } else {
        prompt += `📝 العميل يرد على رسالة سابقة (المحتوى غير متوفر)\n\n`;
      }

      prompt += `💬 رد العميل الحالي: "${customerMessage}"\n`;
      prompt += `=====================================\n`;
      prompt += `💡 مهم: اربطي ردك بالرسالة الأصلية وتأكدي من الاستمرارية في السياق.\n\n`;
    }

    // Add conversation memory if available
    if (conversationMemory && conversationMemory.length > 0) {
      prompt += `📚 سجل المحادثة السابقة (للسياق):\n`;
      prompt += `=====================================\n`;

      conversationMemory.forEach((interaction, index) => {
        const timeAgo = this.getTimeAgo(new Date(interaction.timestamp));
        prompt += `${index + 1}. منذ ${timeAgo}:\n`;
        prompt += `   العميل: ${interaction.userMessage}\n`;
        prompt += `   ردك: ${interaction.aiResponse}\n\n`;
      });

      prompt += `=====================================\n`;
      prompt += `💡 استخدمي هذا السجل لفهم السياق والاستمرارية في المحادثة.\n\n`;
    }

    // Add RAG data if available
    if (ragData && ragData.length > 0) {
      prompt += `🗃️ المعلومات المتاحة من قاعدة البيانات (استخدميها فقط):\n`;
      prompt += `=====================================\n`;

      // جمع معلومات الصور من جميع المنتجات
      const imageInfo = [];

      ragData.forEach((item, index) => {
        if (item.type === 'product') {
          prompt += `🛍️ منتج ${index + 1}: ${item.content}\n`;

          // إضافة معلومات الصور للمنتج
          if (item.metadata) {
            const imageStatus = item.metadata.imageStatus || 'غير محددة';
            const imageCount = item.metadata.imageCount || 0;
            const hasValidImages = item.metadata.hasValidImages || false;

            imageInfo.push({
              name: item.metadata.name || `منتج ${index + 1}`,
              status: imageStatus,
              count: imageCount,
              hasImages: hasValidImages
            });
          }
        } else if (item.type === 'faq') {
          prompt += `❓ سؤال شائع ${index + 1}: ${item.content}\n`;
        } else if (item.type === 'policy') {
          prompt += `📋 سياسة ${index + 1}: ${item.content}\n`;
        }
      });

      prompt += `=====================================\n\n`;

      // إضافة ملخص حالة الصور
      if (imageInfo.length > 0) {
        prompt += `📸 ملخص حالة الصور:\n`;
        imageInfo.forEach(info => {
          const statusIcon = info.hasImages ? '✅' : '❌';
          prompt += `${statusIcon} ${info.name}: ${info.count} صور (${info.status})\n`;
        });

        const hasAnyImages = imageInfo.some(info => info.hasImages);
        if (hasAnyImages) {
          prompt += `\n✅ الصور متاحة ويمكن إرسالها عند الطلب - لا تقولي أنها غير متوفرة!\n\n`;
        } else {
          prompt += `\n❌ لا توجد صور متاحة حالياً\n\n`;
        }
      }

      prompt += `⚠️ مهم جداً: استخدمي فقط المعلومات المذكورة أعلاه. لا تذكري أي منتجات أو معلومات أخرى غير موجودة في القائمة.\n\n`;
    }

    // Add customer message
    prompt += `رسالة العميل: "${customerMessage}"\n\n`;

    // معلومات الصور تم إضافتها أعلاه في ملخص حالة الصور

    // Add final instructions
    if (ragData && ragData.length > 0) {
      prompt += `🎯 تعليمات الرد النهائية:
1. ✅ استخدمي فقط المعلومات الموجودة في قاعدة البيانات أعلاه
2. 🚫 لا تذكري أي منتجات أو معلومات غير موجودة في القائمة
3. 💰 اذكري الأسعار والتفاصيل الدقة كما هي مكتوبة في قاعدة البيانات (لا تذكر أسعار تخيلية أو تقديرية)
4. 📝 إذا سأل عن منتجات، اعرضي المنتجات المتاحة بالتفصيل مع الأسعار من قاعدة البيانات
5. ❌ إذا لم يكن المنتج في القائمة، قولي أنه غير متوفر حالياً
6. 🗣️ استخدمي اللغة العربية الطبيعية والودودة
7. 📸 ${hasImages ? 'إذا طلب صور، قولي أنك ستبعتيها له فوراً' : 'إذا طلب صور، اعتذري أن الصور غير متاحة حالياً'}

مثال للرد الصحيح عن المنتجات:
"عندنا كوتشي حريمي بسعر 150 ج.م - ده المنتج الوحيد المتوفر حالياً"
${hasImages ? 'مثال للرد عن الصور: "حاضر، هبعتلك صور الكوتشي دلوقتي!"' : 'مثال للرد عن الصور: "عذراً، الصور مش متاحة حالياً"'}

🚨 تعليمات مهمة جداً للصور:
${hasImages ? '✅ الصور متاحة وستُرسل تلقائياً مع ردك - لا تقل أبداً أنها غير متاحة!' : '❌ لا توجد صور متاحة حالياً'}

💰 تعليمات خاصة للأسعار:
- استخدم فقط الأسعار المذكورة في معلومات قاعدة البيانات أعلاه
- لا تذكر أسعار تخيلية أو مقدرة أو تقريبية
- إذا كان هناك عدة أسعار لمنتج (بسبب المتغيرات)، اذكر جميع الأسعار كما هي في قاعدة البيانات
- لا تقم بتقريب الأسعار أو تغييرها بأي شكل من الأشكور

${smartResponseInfo && smartResponseInfo.hasSpecificProduct ? `
🎯 معلومات المنتج المحدد:
- المنتج: ${smartResponseInfo.productInfo.product?.metadata?.name}
- الثقة: ${(smartResponseInfo.productInfo.confidence * 100).toFixed(1)}%
- السبب: ${smartResponseInfo.productInfo.reasoning}
- الصور: ${hasImages ? 'متاحة وستُرسل' : 'غير متاحة'}

✅ قل للعميل أنك ستبعت له صور ${smartResponseInfo.productInfo.product?.metadata?.name} فوراً!
❌ لا تقل أبداً أن المنتج غير متوفر أو أن الصور غير متاحة!` : ''}`;
    } else {
      prompt += `تعليمات الرد:
- لا توجد معلومات محددة في قاعدة البيانات لهذا الاستفسار
- قدمي رداً عاماً ومفيداً
- اطلبي من العميل توضيح ما يبحث عنه بالتحديد
- قدمي رداً مفيداً ودقيقاً باللغة العربية`;
    }

    return prompt;
  }

  /**
   * Generate AI response using Gemini API with Pattern Enhancement
   */
  async generateAIResponse(prompt, conversationMemory = [], useRAG = false, providedGeminiConfig = null, companyId = null, conversationId = null, messageContext = {}) {
    try {
      //console.log('🎯 [AIAgent] Starting pattern-enhanced AI response generation');

      // 🔍 لوج مفصل لتتبع طلب generateAIResponse
      //console.log('📋 [REQUEST-TRACKING] ===== تتبع طلب generateAIResponse =====');
      //console.log('🏢 [REQUEST-TRACKING] Company ID:', companyId);
      //console.log('💬 [REQUEST-TRACKING] Conversation ID:', conversationId);
      //console.log('📝 [REQUEST-TRACKING] Prompt Length:', prompt?.length);
      //console.log('🧠 [REQUEST-TRACKING] Memory Length:', conversationMemory?.length);
      //console.log('📚 [REQUEST-TRACKING] Use RAG:', useRAG);
      //console.log('🔧 [REQUEST-TRACKING] Provided Config:', !!providedGeminiConfig);
      //console.log('📋 [REQUEST-TRACKING] ===== نهاية تتبع الطلب =====');

      // Get active Gemini configuration (use provided one if available, otherwise use session model with company isolation)
      const geminiConfig = providedGeminiConfig || await this.getCurrentActiveModel(companyId);
      if (!geminiConfig) {
        throw new Error(`No active Gemini key found for company: ${companyId}`);
      }

      // Step 1: Enhance prompt with approved patterns (if companyId provided)
      let enhancedPrompt = prompt;
      let approvedPatterns = [];

      if (companyId) {
        try {
          approvedPatterns = await this.patternApplication.getApprovedPatterns(companyId);
          if (approvedPatterns.length > 0) {
            enhancedPrompt = await this.promptEnhancement.enhancePromptWithPatterns(
              prompt,
              approvedPatterns,
              messageContext.messageType || 'general',
              companyId
            );
            //console.log(`🎨 [AIAgent] Enhanced prompt with ${approvedPatterns.length} patterns`);
          }
        } catch (patternError) {
          console.error('⚠️ [AIAgent] Error applying patterns to prompt:', patternError);
          // Continue with original prompt if pattern enhancement fails
        }
      }

      // Step 2: Generate AI response using enhanced prompt
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
      const model = genAI.getGenerativeModel({ model: geminiConfig.model });

      const result = await model.generateContent(enhancedPrompt);
      const response = result.response;
      let aiContent = response.text();

      // Step 3: Optimize the generated response with patterns and priority settings
      if (companyId && approvedPatterns.length > 0) {
        try {
          const optimizedResponse = await this.responseOptimizer.optimizeResponse(
            aiContent,
            approvedPatterns,
            messageContext,
            companyId,
            prompt // تمرير البرونت الأساسي للمحسن
          );

          if (optimizedResponse !== aiContent) {
            //console.log('🚀 [AIAgent] Response optimized with patterns and priority settings');
            aiContent = optimizedResponse;
          }
        } catch (optimizationError) {
          console.error('⚠️ [AIAgent] Error optimizing response:', optimizationError);
          // Continue with original response if optimization fails
        }
      }

      // Step 4: Record pattern usage for performance tracking (BATCH OPTIMIZED)
      if (conversationId && approvedPatterns.length > 0) {
        //console.log(`🚀 [AIAgent] Recording batch usage for ${approvedPatterns.length} patterns in conversation: ${conversationId}`);
        try {
          // استخدام الدالة المحسنة للسرعة
          const patternIds = approvedPatterns.map(p => p.id);
          await this.patternApplication.recordPatternUsageBatch(patternIds, conversationId, companyId);
          //console.log(`✅ [AIAgent] Successfully recorded batch usage for ${approvedPatterns.length} patterns`);
        } catch (recordError) {
          console.error('⚠️ [AIAgent] Error recording batch pattern usage:', recordError);
        }
      } else {
        if (!conversationId) {
          //console.log('⚠️ [AIAgent] No conversationId provided - skipping pattern usage recording');
        }
        if (approvedPatterns.length === 0) {
          //console.log('⚠️ [AIAgent] No approved patterns found - skipping pattern usage recording');
        }
      }

      //console.log('✅ [AIAgent] Pattern-enhanced response generated successfully');

      // 🔍 لوج مفصل لتتبع نتيجة generateAIResponse
      //console.log('🎯 [RESPONSE-RESULT] ===== نتيجة generateAIResponse =====');
      //console.log('🏢 [RESPONSE-RESULT] Company ID:', companyId);
      //console.log('💬 [RESPONSE-RESULT] Conversation ID:', conversationId);
      //console.log('🔑 [RESPONSE-RESULT] Key Used:', geminiConfig?.keyId);
      //console.log('🤖 [RESPONSE-RESULT] Model Used:', geminiConfig?.model);
      //console.log('📝 [RESPONSE-RESULT] Response Length:', aiContent?.length);
      //console.log('📄 [RESPONSE-RESULT] Response Preview:', aiContent?.substring(0, 100) + '...');
      //console.log('🎯 [RESPONSE-RESULT] ===== نهاية النتيجة =====');

      return aiContent;

    } catch (error) {
      console.error('❌ Error in generateAIResponse:', error.message);

      // فحص إذا كان خطأ 429 (تجاوز الحد)
      if (error.status === 429 || error.message.includes('429') || error.message.includes('Too Many Requests')) {
        //console.log('🔄 تم تجاوز حد النموذج، محاولة التبديل...');

        // استخراج معلومات الحد من رسالة الخطأ
        let quotaValue = null;
        let modelName = null;
        try {
          const errorDetails = error.errorDetails || [];
          for (const detail of errorDetails) {
            if (detail['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure') {
              const violations = detail.violations || [];
              for (const violation of violations) {
                if (violation.quotaValue) {
                  quotaValue = violation.quotaValue;
                }
                if (violation.quotaDimensions && violation.quotaDimensions.model) {
                  modelName = violation.quotaDimensions.model;
                }
              }
            }
          }
        } catch (parseError) {
          //console.log('⚠️ لا يمكن استخراج تفاصيل الحد من الخطأ');
        }

        // تحديث النموذج كمستنفد بناءً على المعلومات الحقيقية
        if (modelName && quotaValue) {
          await this.markModelAsExhaustedFrom429(modelName, quotaValue);
        }

        //console.log('🔄 تم تجاوز حد النموذج، محاولة التبديل...');

        // محاولة الحصول على نموذج بديل للشركة
        const backupModel = await this.findNextAvailableModel(companyId);
        if (backupModel) {
          //console.log(`🔄 تم التبديل إلى نموذج بديل: ${backupModel.model}`);

          // إعادة المحاولة مع النموذج الجديد
          try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(backupModel.apiKey);
            const model = genAI.getGenerativeModel({ model: backupModel.model });

            const result = await model.generateContent(prompt);
            const response = result.response;
            const aiContent = response.text();

            // تحديث عداد الاستخدام للنموذج الجديد
            if (backupModel.modelId) {
              await this.updateModelUsage(backupModel.modelId);
            }

            // تحديث النموذج النشط للجلسة
            this.updateCurrentActiveModel(backupModel);

            return aiContent;
          } catch (retryError) {
            console.error('❌ فشل النموذج البديل أيضاً:', retryError.message);
            throw retryError;
          }
        } else {
          //console.log('❌ لا توجد نماذج بديلة متاحة');
          throw new Error('جميع النماذج المتاحة تجاوزت الحد المسموح');
        }
      }

      throw error;
    }
  }

  /**
   * Enhanced Conversation Flow and Context Analysis System
   * Provides advanced conversation understanding and direction
   */
  async analyzeEnhancedConversationContext(message, conversationMemory = [], companyId = null) {
    try {
      //console.log('🔍 [ENHANCED-CONTEXT] Starting enhanced conversation analysis...');
      
      // Enhanced context building with conversation flow tracking
      const conversationContext = this.buildEnhancedConversationContext(conversationMemory);
      const conversationState = this.analyzeConversationState(conversationMemory);
      const intentWithContext = await this.analyzeIntentWithEnhancedContext(message, conversationContext, conversationState, companyId);
      
      const enhancedContext = {
        intent: intentWithContext.intent,
        confidence: intentWithContext.confidence,
        conversationPhase: conversationState.phase,
        customerEngagement: conversationState.engagement,
        topicContinuity: conversationState.topicContinuity,
        needsRedirection: conversationState.needsRedirection,
        suggestedActions: conversationState.suggestedActions,
        contextualCues: intentWithContext.contextualCues,
        conversationFlow: {
          direction: conversationState.direction,
          momentum: conversationState.momentum,
          expectedNext: conversationState.expectedNext
        }
      };
      
      //console.log('✅ [ENHANCED-CONTEXT] Analysis complete:', {
      //   intent: enhancedContext.intent,
      //   phase: enhancedContext.conversationPhase,
      //   engagement: enhancedContext.customerEngagement,
      //   direction: enhancedContext.conversationFlow.direction
      // });
      
      return enhancedContext;
      
    } catch (error) {
      console.error('❌ [ENHANCED-CONTEXT] Error in enhanced analysis:', error);
      // Fallback to simple intent analysis
      const basicIntent = await this.analyzeIntent(message, conversationMemory, companyId);
      return {
        intent: basicIntent,
        confidence: 0.6,
        conversationPhase: 'unknown',
        customerEngagement: 'moderate',
        topicContinuity: 'unclear',
        needsRedirection: false,
        suggestedActions: [],
        contextualCues: [],
        conversationFlow: {
          direction: 'neutral',
          momentum: 'stable',
          expectedNext: 'any'
        }
      };
    }
  }

  /**
   * Build enhanced conversation context with flow analysis
   */
  buildEnhancedConversationContext(conversationMemory) {
    if (!conversationMemory || conversationMemory.length === 0) {
      return {
        recentContext: '',
        topics: [],
        customerBehavior: 'new',
        conversationLength: 0
      };
    }

    // Analyze conversation topics and patterns
    const topics = this.extractConversationTopics(conversationMemory);
    const customerBehavior = this.analyzeCustomerBehavior(conversationMemory);
    
    // Build rich context from recent messages (last 5 interactions)
    const recentMessages = conversationMemory.slice(-5);
    const recentContext = recentMessages.map((memory, index) => {
      const timeAgo = this.getTimeAgo(new Date(memory.timestamp));
      const position = recentMessages.length - index;
      return `[${position}] منذ ${timeAgo}:\n   العميل: ${memory.userMessage}\n   الرد: ${memory.aiResponse}\n   النية: ${memory.intent || 'غير محدد'}`;
    }).join('\n---\n');

    return {
      recentContext,
      topics,
      customerBehavior,
      conversationLength: conversationMemory.length
    };
  }

  /**
   * Analyze current conversation state and flow
   */
  analyzeConversationState(conversationMemory) {
    const state = {
      phase: 'discovery', // discovery, consideration, decision, support
      engagement: 'moderate', // low, moderate, high
      topicContinuity: 'stable', // stable, shifting, scattered
      needsRedirection: false,
      suggestedActions: [],
      direction: 'neutral', // positive, neutral, negative
      momentum: 'stable', // increasing, stable, decreasing
      expectedNext: 'any' // specific expectations based on flow
    };

    if (!conversationMemory || conversationMemory.length === 0) {
      state.phase = 'initial';
      state.expectedNext = 'greeting_or_inquiry';
      return state;
    }

    // Analyze conversation phase based on intents and content
    const recentIntents = conversationMemory.slice(-3).map(m => m.intent || 'unknown');
    const hasProductInquiry = recentIntents.includes('product_inquiry');
    const hasPriceInquiry = recentIntents.includes('price_inquiry');
    const hasOrderInquiry = recentIntents.includes('order_inquiry');

    if (hasOrderInquiry || conversationMemory.some(m => m.userMessage.includes('أريد أطلب') || m.userMessage.includes('عايز أشتري'))) {
      state.phase = 'decision';
      state.expectedNext = 'order_details_or_confirmation';
    } else if (hasPriceInquiry && hasProductInquiry) {
      state.phase = 'consideration';
      state.expectedNext = 'decision_or_more_questions';
    } else if (hasProductInquiry) {
      state.phase = 'discovery';
      state.expectedNext = 'price_or_details_inquiry';
    }

    // Analyze engagement level
    const messageFrequency = this.calculateMessageFrequency(conversationMemory);
    const responseLength = conversationMemory.slice(-3).reduce((avg, m) => avg + m.userMessage.length, 0) / Math.min(3, conversationMemory.length);
    
    if (messageFrequency > 2 && responseLength > 20) {
      state.engagement = 'high';
    } else if (messageFrequency < 0.5 || responseLength < 10) {
      state.engagement = 'low';
    }

    // Analyze topic continuity
    const topicConsistency = this.analyzeTopicConsistency(conversationMemory);
    if (topicConsistency < 0.3) {
      state.topicContinuity = 'scattered';
      state.needsRedirection = true;
      state.suggestedActions.push('focus_conversation');
    } else if (topicConsistency < 0.6) {
      state.topicContinuity = 'shifting';
    }

    // Analyze conversation direction and momentum
    const sentimentTrend = this.analyzeSentimentTrend(conversationMemory);
    if (sentimentTrend > 0.2) {
      state.direction = 'positive';
      state.momentum = 'increasing';
    } else if (sentimentTrend < -0.2) {
      state.direction = 'negative';
      state.momentum = 'decreasing';
      state.suggestedActions.push('improve_sentiment');
    }

    return state;
  }

  /**
   * Enhanced intent analysis with contextual understanding
   */
  async analyzeIntentWithEnhancedContext(message, conversationContext, conversationState, companyId) {
    try {
      const enhancedPrompt = `
أنت خبير متقدم في تحليل المحادثات وفهم نوايا العملاء بعمق.

الرسالة الحالية: "${message}"

السياق المتقدم للمحادثة:
=====================================
${conversationContext.recentContext || 'لا يوجد سياق سابق'}
=====================================

حالة المحادثة الحالية:
- المرحلة: ${conversationState.phase}
- مستوى التفاعل: ${conversationState.engagement}
- استمرارية الموضوع: ${conversationState.topicContinuity}
- اتجاه المحادثة: ${conversationState.direction}
- الزخم: ${conversationState.momentum}

مهمتك:
1. حدد النية الأساسية من الخيارات التالية:
   - product_inquiry: استفسار عن المنتجات
   - price_inquiry: استفسار عن الأسعار
   - shipping_inquiry: استفسار عن الشحن
   - order_inquiry: رغبة في الطلب
   - greeting: تحية أو بداية محادثة
   - clarification: طلب توضيح
   - comparison: مقارنة منتجات
   - support: طلب دعم أو مساعدة
   - general_inquiry: استفسار عام

2. حدد الإشارات السياقية المهمة
3. قدر مستوى الثقة (0.1-1.0)

صيغة الرد (JSON):
{
  "intent": "اختر_من_القائمة",
  "confidence": 0.8,
  "contextualCues": ["إشارة1", "إشارة2"],
  "reasoning": "السبب في تحديد هذه النية"
}

ملاحظات خاصة:
- إذا ذكر "صور" أو "صورة" = product_inquiry
- إذا ذكر أرقام أو "كام" = price_inquiry  
- إذا ذكر "طلب" أو "أشتري" = order_inquiry
- انتبه للسياق المتراكم من المحادثة السابقة
- إذا كان السياق غامض، اطلب توضيح = clarification
`;

      const aiResponse = await this.generateAIResponse(enhancedPrompt, [], false, null, companyId);
      
      try {
        const result = JSON.parse(aiResponse.trim());
        
        // Validate the result
        const validIntents = ['product_inquiry', 'price_inquiry', 'shipping_inquiry', 'order_inquiry', 'greeting', 'clarification', 'comparison', 'support', 'general_inquiry'];
        
        if (validIntents.includes(result.intent)) {
          //console.log(`🎯 [ENHANCED-INTENT] Detected: ${result.intent} (confidence: ${result.confidence})`);
          return {
            intent: result.intent,
            confidence: result.confidence || 0.7,
            contextualCues: result.contextualCues || [],
            reasoning: result.reasoning || ''
          };
        }
      } catch (parseError) {
        //console.log('⚠️ [ENHANCED-INTENT] Failed to parse AI response, extracting intent...');
        // Try to extract intent from response text
        const extractedIntent = this.extractIntentFromResponse(aiResponse);
        if (extractedIntent) {
          return {
            intent: extractedIntent,
            confidence: 0.6,
            contextualCues: [],
            reasoning: 'Extracted from unstructured response'
          };
        }
      }
      
      // Fallback to original intent analysis
      //console.log('🔄 [ENHANCED-INTENT] Falling back to original intent analysis');
      const fallbackIntent = await this.analyzeIntent(message, [], companyId);
      return {
        intent: fallbackIntent,
        confidence: 0.5,
        contextualCues: [],
        reasoning: 'Fallback analysis'
      };
      
    } catch (error) {
      console.error('❌ [ENHANCED-INTENT] Error in enhanced intent analysis:', error);
      return {
        intent: 'general_inquiry',
        confidence: 0.3,
        contextualCues: [],
        reasoning: 'Error fallback'
      };
    }
  }

  /**
   * Analyze customer intent using AI-powered understanding (Original function - kept for compatibility)
   */
  async analyzeIntent(message, conversationMemory = [], companyId = null) {
    try {
      // Build context from recent conversation
      let conversationContext = '';
      if (conversationMemory.length > 0) {
        const recentMessages = conversationMemory.slice(-3); // Last 3 interactions
        conversationContext = recentMessages.map(memory =>
          `العميل: ${memory.userMessage}\nالرد: ${memory.aiResponse}`
        ).join('\n---\n');
      }

      // AI-powered intent analysis prompt
      const intentPrompt = `
أنت خبير في تحليل نوايا العملاء. حلل الرسالة التالية وحدد النية بدقة:

الرسالة الحالية: "${message}"

${conversationContext ? `سياق المحادثة السابقة:\n${conversationContext}\n` : ''}

حدد النية من الخيارات التالية فقط:
- product_inquiry: إذا كان يسأل عن المنتجات أو يريد معلومات أو صور عن المنتجات
- price_inquiry: إذا كان يسأل عن الأسعار أو التكلفة
- shipping_inquiry: إذا كان يسأل عن الشحن أو التوصيل
- order_inquiry: إذا كان يريد طلب أو شراء شيء
- greeting: إذا كان يحيي أو يبدأ المحادثة
- general_inquiry: لأي استفسار عام آخر

ملاحظات مهمة:
- إذا طلب "صور" أو "صورة" أو "ممكن أشوف" أو "صورته" = product_inquiry
- إذا كان السياق يتحدث عن منتج وطلب شيء غامض مثل "ممكن صورته" = product_inquiry
- ركز على السياق والمعنى وليس فقط الكلمات

أجب بكلمة واحدة فقط من الخيارات أعلاه.
`;

      // Use AI to analyze intent (no pattern tracking needed for intent analysis)
      const aiResponse = await this.generateAIResponse(intentPrompt, [], false, null, companyId);
      const detectedIntent = aiResponse.trim().toLowerCase();

      // Validate the response and fallback to keyword-based if needed
      const validIntents = ['product_inquiry', 'price_inquiry', 'shipping_inquiry', 'order_inquiry', 'greeting', 'general_inquiry'];

      if (validIntents.includes(detectedIntent)) {
        //console.log(`🧠 AI detected intent: ${detectedIntent} for message: "${message}"`);
        return detectedIntent;
      } else {
        //console.log(`⚠️ AI returned invalid intent: ${detectedIntent}, falling back to keyword analysis`);
        return this.fallbackIntentAnalysis(message);
      }

    } catch (error) {
      //console.log(`❌ Error in AI intent analysis: ${error.message}, falling back to keyword analysis`);
      return this.fallbackIntentAnalysis(message);
    }
  }

  /**
   * Fallback keyword-based intent analysis
   */
  /**
   * Helper functions for Enhanced Conversation Flow Analysis
   */

  /**
   * Extract conversation topics from memory
   */
  extractConversationTopics(conversationMemory) {
    const topics = new Map();
    
    conversationMemory.forEach(memory => {
      const userMessage = memory.userMessage.toLowerCase();
      const intent = memory.intent || 'unknown';
      
      // Extract product-related topics
      const productKeywords = ['كوتشي', 'حذاء', 'شوز', 'حقيبة', 'جزمة', 'صندل'];
      const foundProducts = productKeywords.filter(keyword => userMessage.includes(keyword));
      foundProducts.forEach(product => {
        topics.set(`product_${product}`, (topics.get(`product_${product}`) || 0) + 1);
      });
      
      // Extract color topics
      const colorKeywords = ['أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر', 'بني', 'رمادي'];
      const foundColors = colorKeywords.filter(color => userMessage.includes(color));
      foundColors.forEach(color => {
        topics.set(`color_${color}`, (topics.get(`color_${color}`) || 0) + 1);
      });
      
      // Extract size topics
      const sizePattern = /\b(\d{2})\b|مقاس|مقاسات|سايز/g;
      if (sizePattern.test(userMessage)) {
        topics.set('sizing', (topics.get('sizing') || 0) + 1);
      }
      
      // Extract intent-based topics
      topics.set(`intent_${intent}`, (topics.get(`intent_${intent}`) || 0) + 1);
    });
    
    // Convert to sorted array
    return Array.from(topics.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 topics
  }

  /**
   * Analyze customer behavior patterns
   */
  analyzeCustomerBehavior(conversationMemory) {
    if (conversationMemory.length === 0) return 'new';
    
    const totalMessages = conversationMemory.length;
    const uniqueIntents = new Set(conversationMemory.map(m => m.intent)).size;
    const messageFrequency = this.calculateMessageFrequency(conversationMemory);
    const avgMessageLength = conversationMemory.reduce((sum, m) => sum + m.userMessage.length, 0) / totalMessages;
    
    // Determine behavior type
    if (totalMessages >= 10 && uniqueIntents >= 3) {
      return 'engaged_explorer'; // Active customer exploring multiple aspects
    } else if (messageFrequency > 2 && avgMessageLength > 30) {
      return 'detail_seeker'; // Wants detailed information
    } else if (messageFrequency > 1 && avgMessageLength < 15) {
      return 'quick_decider'; // Fast, concise decision maker
    } else if (totalMessages >= 5 && uniqueIntents <= 2) {
      return 'focused_buyer'; // Focused on specific product/service
    } else if (messageFrequency < 0.5) {
      return 'casual_browser'; // Slow, casual browsing
    } else {
      return 'standard'; // Standard behavior pattern
    }
  }

  /**
   * Calculate message frequency (messages per hour)
   */
  calculateMessageFrequency(conversationMemory) {
    if (conversationMemory.length < 2) return 0;
    
    const firstMessage = new Date(conversationMemory[0].timestamp);
    const lastMessage = new Date(conversationMemory[conversationMemory.length - 1].timestamp);
    const timeDiffHours = (lastMessage - firstMessage) / (1000 * 60 * 60);
    
    return timeDiffHours > 0 ? conversationMemory.length / timeDiffHours : 0;
  }

  /**
   * Analyze topic consistency across conversation
   */
  analyzeTopicConsistency(conversationMemory) {
    if (conversationMemory.length < 2) return 1.0;
    
    const topics = this.extractConversationTopics(conversationMemory);
    if (topics.length === 0) return 0.5;
    
    // Calculate how focused the conversation is on top topics
    const totalTopicMentions = topics.reduce((sum, topic) => sum + topic.count, 0);
    const topTopicMentions = topics.slice(0, 2).reduce((sum, topic) => sum + topic.count, 0);
    
    return totalTopicMentions > 0 ? topTopicMentions / totalTopicMentions : 0.5;
  }

  /**
   * Analyze sentiment trend across conversation
   */
  analyzeSentimentTrend(conversationMemory) {
    if (conversationMemory.length < 2) return 0;
    
    const sentimentValues = conversationMemory.map(memory => {
      const sentiment = memory.sentiment || 'neutral';
      switch (sentiment) {
        case 'positive': return 1;
        case 'negative': return -1;
        default: return 0;
      }
    });
    
    // Calculate trend using simple linear regression approach
    const n = sentimentValues.length;
    const recent = sentimentValues.slice(-3); // Last 3 messages
    const earlier = sentimentValues.slice(0, Math.min(3, n - 3)); // Earlier messages
    
    const recentAvg = recent.length > 0 ? recent.reduce((sum, val) => sum + val, 0) / recent.length : 0;
    const earlierAvg = earlier.length > 0 ? earlier.reduce((sum, val) => sum + val, 0) / earlier.length : 0;
    
    return recentAvg - earlierAvg; // Positive = improving, negative = declining
  }

  /**
   * Extract intent from unstructured AI response
   */
  extractIntentFromResponse(response) {
    const text = response.toLowerCase();
    const validIntents = ['product_inquiry', 'price_inquiry', 'shipping_inquiry', 'order_inquiry', 'greeting', 'clarification', 'comparison', 'support', 'general_inquiry'];
    
    for (const intent of validIntents) {
      if (text.includes(intent) || text.includes(intent.replace('_', ' '))) {
        return intent;
      }
    }
    
    // Try to match Arabic terms
    if (text.includes('منتج') || text.includes('صور')) return 'product_inquiry';
    if (text.includes('سعر') || text.includes('ثمن')) return 'price_inquiry';
    if (text.includes('شحن') || text.includes('توصيل')) return 'shipping_inquiry';
    if (text.includes('طلب') || text.includes('شراء')) return 'order_inquiry';
    if (text.includes('تحية') || text.includes('مرحبا')) return 'greeting';
    if (text.includes('توضيح') || text.includes('فهم')) return 'clarification';
    if (text.includes('مقارنة') || text.includes('فرق')) return 'comparison';
    if (text.includes('مساعدة') || text.includes('دعم')) return 'support';
    
    return null;
  }

  /**
   * Enhanced conversation state management for response generation
   */
  enhanceResponseWithConversationState(baseResponse, conversationState, enhancedContext) {
    try {
      //console.log('🎨 [ENHANCED-RESPONSE] Enhancing response with conversation state...');
      
      let enhancedResponse = baseResponse;
      
      // Add conversation phase guidance
      if (conversationState.phase === 'decision' && !baseResponse.includes('قرار')) {
        enhancedResponse += '\n\nهل تريدين المساعدة في اتخاذ القرار؟ 🤔';
      } else if (conversationState.phase === 'consideration' && conversationState.engagement === 'high') {
        enhancedResponse += '\n\nأراكِ مهتمة بالتفاصيل! أي معلومات إضافية تحتاجينها؟ 😊';
      }
      
      // Add engagement-based adjustments
      if (conversationState.engagement === 'low' && Math.random() > 0.7) {
        enhancedResponse += '\n\nممكن أساعدك في شيء معين؟ 🌟';
      }
      
      // Add redirective guidance if needed
      if (conversationState.needsRedirection) {
        enhancedResponse += '\n\nدعيني أساعدك بشكل أوضح - إيش بالتحديد اللي تبحثين عنه؟';
      }
      
      // Add flow momentum consideration
      if (conversationState.direction === 'positive' && conversationState.momentum === 'increasing') {
        enhancedResponse = enhancedResponse.replace(/\.$/, '') + '! 🎉';
      }
      
      //console.log('✅ [ENHANCED-RESPONSE] Response enhanced successfully');
      return enhancedResponse;
      
    } catch (error) {
      console.error('❌ [ENHANCED-RESPONSE] Error enhancing response:', error);
      return baseResponse; // Return original response if enhancement fails
    }
  }

  /**
   * Conversation context memory optimization
   */
  optimizeConversationMemoryForContext(conversationMemory, currentIntent, maxContextSize = 5) {
    if (!conversationMemory || conversationMemory.length <= maxContextSize) {
      return conversationMemory;
    }
    
    //console.log('🔧 [MEMORY-OPTIMIZE] Optimizing conversation memory for context...');
    
    // Always include the most recent messages
    const recentMessages = conversationMemory.slice(-2);
    
    // Include intent-relevant messages
    const intentRelevantMessages = conversationMemory.filter(memory => {
      const memoryIntent = memory.intent || 'unknown';
      return memoryIntent === currentIntent && !recentMessages.includes(memory);
    }).slice(-2); // Last 2 relevant messages
    
    // Include high-engagement messages (longer user messages)
    const highEngagementMessages = conversationMemory.filter(memory => {
      return memory.userMessage.length > 30 && 
             !recentMessages.includes(memory) && 
             !intentRelevantMessages.includes(memory);
    }).slice(-1); // Last 1 high-engagement message
    
    // Combine and sort by timestamp
    const optimizedMemory = [...recentMessages, ...intentRelevantMessages, ...highEngagementMessages]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-maxContextSize);
    
    //console.log(`📊 [MEMORY-OPTIMIZE] Optimized from ${conversationMemory.length} to ${optimizedMemory.length} messages`);
    
    return optimizedMemory;
  }

  /**
   * Fallback intent analysis (Original function - kept for compatibility)
   */
  fallbackIntentAnalysis(message) {
    const lowerMessage = message.toLowerCase();

    // Enhanced patterns with better logic
    if (lowerMessage.includes('شحن') || lowerMessage.includes('توصيل') || lowerMessage.includes('delivery')) {
      return 'shipping_inquiry';
    }

    if (lowerMessage.includes('صور') || lowerMessage.includes('صورة') || lowerMessage.includes('صورته') ||
        lowerMessage.includes('أشوف') || lowerMessage.includes('اشوف') || lowerMessage.includes('منتج') ||
        lowerMessage.includes('كوتشي') || lowerMessage.includes('ايه المنتجات') || lowerMessage.includes('عندك ايه')) {
      return 'product_inquiry';
    }

    if (lowerMessage.includes('سعر') || lowerMessage.includes('كام') || lowerMessage.includes('بكام')) {
      return 'price_inquiry';
    }

    if (lowerMessage.includes('طلب') || lowerMessage.includes('اشتري') || lowerMessage.includes('اطلب')) {
      return 'order_inquiry';
    }

    if (lowerMessage.includes('سلام') || lowerMessage.includes('مرحبا') || lowerMessage.includes('اهلا')) {
      return 'greeting';
    }

    // Smart contextual detection
    if (lowerMessage.includes('ممكن') || lowerMessage.includes('عايز') || lowerMessage.includes('يا ريت')) {
      return 'product_inquiry'; // Most requests are about products
    }

    return 'general_inquiry';
  }

  /**
   * Analyze customer sentiment
   */
  analyzeSentiment(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('شكرا') || lowerMessage.includes('ممتاز') || lowerMessage.includes('جميل')) {
      return 'positive';
    } else if (lowerMessage.includes('مشكلة') || lowerMessage.includes('سيء') || lowerMessage.includes('غلط')) {
      return 'negative';
    }

    return 'neutral';
  }

  /**
   * Detect if customer is confirming an order using AI only (Pure AI Version)
   */
  async detectOrderConfirmation(message, conversationMemory, customerId = null, companyId = null) {
    // Skip very short messages that are unlikely to be confirmations
    if (message.length < 2) {
      return { isConfirming: false, orderDetails: null };
    }



    try {
      // فحص إضافي: منع إنشاء طلبات مكررة في فترة قصيرة
      if (customerId) {
        const recentOrder = await this.checkRecentOrderForCustomer(customerId);
        if (recentOrder) {
          //console.log(`⚠️ [DUPLICATE-PREVENTION] Customer ${customerId} has recent order: ${recentOrder.orderNumber}`);
          return { isConfirming: false, orderDetails: null, reason: 'recent_order_exists' };
        }
      }

      const isConfirming = await this.detectConfirmationWithAI(message, conversationMemory, companyId);
      //console.log(`🤖 Pure AI Confirmation Detection: ${isConfirming ? 'YES' : 'NO'} for message: "${message}"`);

      if (!isConfirming) {
        return { isConfirming: false, orderDetails: null };
      }

      // Extract order details from conversation memory using AI with companyId
      const orderDetails = await this.extractOrderDetailsFromMemory(conversationMemory, companyId);

      return {
        isConfirming: true,
        orderDetails: orderDetails,
        detectionMethod: 'pure_ai'
      };

    } catch (error) {
      console.error('❌ AI confirmation detection failed:', error);
      return { isConfirming: false, orderDetails: null };
    }
  }

  /**
   * فحص وجود طلب حديث للعميل (خلال آخر 5 دقائق)
   */
  async checkRecentOrderForCustomer(customerId) {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const recentOrder = await this.prisma.order.findFirst({
        where: {
          customerId: customerId,
          createdAt: {
            gte: fiveMinutesAgo
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return recentOrder;
    } catch (error) {
      console.error('❌ Error checking recent orders:', error);
      return null;
    }
  }

  /**
   * فحص اكتمال البيانات المطلوبة لإنشاء الطلب
   */
  async checkDataCompleteness(orderDetails, conversationMemory) {
    const missingData = [];
    const requiredFields = ['customerName', 'customerPhone', 'customerAddress'];

    // فحص البيانات الأساسية
    if (!orderDetails.customerName || orderDetails.customerName === 'عميل جديد' || /^\d+/.test(orderDetails.customerName)) {
      missingData.push('customerName');
    }

    if (!orderDetails.customerPhone || orderDetails.customerPhone.length < 10) {
      missingData.push('customerPhone');
    }

    if (!orderDetails.customerAddress || orderDetails.customerAddress.trim() === '') {
      missingData.push('customerAddress');
    }

    // فحص إضافي من المحادثة للبحث عن البيانات
    const conversationText = conversationMemory.map(m => m.userMessage || m.content).join(' ').toLowerCase();

    // البحث عن رقم هاتف في المحادثة
    const phoneMatch = conversationText.match(/01[0-9]{9}/);
    if (phoneMatch && missingData.includes('customerPhone')) {
      missingData.splice(missingData.indexOf('customerPhone'), 1);
    }

    // البحث عن عنوان في المحادثة
    const addressKeywords = ['عنوان', 'شارع', 'عمارة', 'الدور', 'شقة', 'منطقة'];
    const hasAddress = addressKeywords.some(keyword => conversationText.includes(keyword));
    if (hasAddress && missingData.includes('customerAddress')) {
      missingData.splice(missingData.indexOf('customerAddress'), 1);
    }

    //console.log('📋 [DATA-CHECK] فحص اكتمال البيانات:', {
    //   orderDetails: {
    //     customerName: orderDetails.customerName,
    //     customerPhone: orderDetails.customerPhone,
    //     customerAddress: orderDetails.customerAddress
    //   },
    //   missingData,
    //   isComplete: missingData.length === 0
    // });

    return {
      isComplete: missingData.length === 0,
      missingData,
      completedFields: requiredFields.filter(field => !missingData.includes(field))
    };
  }

  /**
   * إنشاء رد لطلب البيانات المفقودة باستخدام الذكاء الاصطناعي
   */
  async generateDataRequestResponse(missingData, orderDetails) {
    try {
      //console.log('🤖 [AI-DATA-REQUEST] Generating AI response for missing data request');

      // بناء prompt للذكاء الاصطناعي
      const missingDataText = missingData.map(field => {
        switch(field) {
          case 'customerName': return 'الاسم الكامل';
          case 'customerPhone': return 'رقم الهاتف';
          case 'customerAddress': return 'العنوان الكامل';
          default: return field;
        }
      }).join(' و ');

      const prompt = `أنت مساعد مبيعات محترف في متجر أحذية مصري. العميل أكد رغبته في الشراء وأنت متحمس لإتمام الطلب.

🛍️ تفاصيل الطلب المؤكد:
${orderDetails.productName ? `• المنتج: ${orderDetails.productName}` : ''}
${orderDetails.productColor ? `• اللون: ${orderDetails.productColor}` : ''}
${orderDetails.productSize ? `• المقاس: ${orderDetails.productSize}` : ''}
${orderDetails.productPrice ? `• السعر: ${orderDetails.productPrice} جنيه` : ''}

📋 البيانات المطلوبة لإتمام الطلب: ${missingDataText}

🎯 مهمتك:
1. اشكر العميل بحماس على تأكيد الطلب
2. أظهر تفاصيل الطلب بطريقة جذابة ومحفزة
3. اطلب البيانات المفقودة بطريقة ودودة وواضحة
4. أكد سرعة التجهيز والشحن
5. استخدم رموز تعبيرية مناسبة (لكن لا تكثر منها)
6. اجعل العميل متحمس لإكمال الطلب

📝 أسلوب الكتابة:
- استخدم العربية العامية المصرية الودودة
- كن مهنياً لكن دافئاً في التعامل
- اجعل الرد قصير ومركز (لا يزيد عن 150 كلمة)
- أظهر الثقة في جودة المنتج
- أكد على سرعة الخدمة

اكتب الرد الآن:`;

      // استدعاء الذكاء الاصطناعي
      const aiResponse = await this.generateAIResponse(
        prompt,
        [], // no conversation memory needed
        false, // no RAG needed
        null, // default gemini config
        null, // no company ID needed
        null, // no conversation ID needed
        { messageType: 'data_request', inquiryType: 'order_completion' }
      );

      if (aiResponse && aiResponse.trim()) {
        //console.log('✅ [AI-DATA-REQUEST] AI generated response successfully');
        return aiResponse;
      } else {
        //console.log('⚠️ [AI-DATA-REQUEST] AI response empty, using fallback');
        // fallback بسيط جداً في حالة فشل الذكاء الاصطناعي
        return `شكراً لتأكيد طلبك! محتاجين منك ${missingData.join(' و ')} عشان نكمل الطلب.`;
      }

    } catch (error) {
      console.error('❌ [AI-DATA-REQUEST] Error generating AI response:', error);
      // fallback بسيط في حالة الخطأ
      return `شكراً لتأكيد طلبك! محتاجين منك بعض البيانات عشان نكمل الطلب.`;
    }
  }

  /**
   * فحص إذا كان العميل يرسل بيانات لطلب معلق
   */
  async checkForPendingOrderData(message, conversationMemory) {
    // البحث عن آخر رسالة طلب بيانات في المحادثة
    const lastMessages = conversationMemory.slice(-5);
    const hasDataRequest = lastMessages.some(msg => {
      const response = msg.aiResponse || msg.response || '';
      return response.includes('محتاجين منك') ||
             response.includes('عشان نكمل الطلب') ||
             response.includes('البيانات المفقودة') ||
             response.includes('اسم الكامل') ||
             response.includes('رقم الهاتف') ||
             response.includes('العنوان الكامل') ||
             response.includes('شكراً لتأكيد طلبك');
    });

    if (!hasDataRequest) {
      return { isProvidingData: false };
    }

    //console.log('🔍 [PENDING-ORDER] Found data request in conversation, analyzing customer message...');

    // تحليل الرسالة الحالية للبحث عن البيانات
    const extractedData = await this.extractCustomerDataFromMessage(message);

    return {
      isProvidingData: extractedData.hasData,
      extractedData
    };
  }

  /**
   * استخراج بيانات العميل من الرسالة
   */
  async extractCustomerDataFromMessage(message) {
    const data = {
      hasData: false,
      customerName: null,
      customerPhone: null,
      customerAddress: null,
      city: null
    };

    // البحث عن رقم الهاتف
    const phoneMatch = message.match(/01[0-9]{9}/);
    if (phoneMatch) {
      data.customerPhone = phoneMatch[0];
      data.hasData = true;
    }

    // البحث عن العنوان (كلمات مفتاحية)
    const addressKeywords = ['عمارة', 'شارع', 'الدور', 'شقة', 'منطقة', 'حي'];
    if (addressKeywords.some(keyword => message.includes(keyword))) {
      data.customerAddress = message.trim();
      data.hasData = true;
    }

    // البحث عن المحافظة/المدينة
    const cities = ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا', 'الزقازيق', 'أسوان', 'الأقصر'];
    const cityMatch = cities.find(city => message.includes(city));
    if (cityMatch) {
      data.city = cityMatch;
      data.hasData = true;
    }

    // البحث عن الاسم (إذا لم يكن رقم هاتف أو عنوان)
    if (!data.customerPhone && !data.customerAddress && message.length > 3 && message.length < 50) {
      // تحقق من أن الرسالة تبدو كاسم
      if (!/[0-9]/.test(message) && message.split(' ').length <= 4) {
        data.customerName = message.trim();
        data.hasData = true;
      }
    }

    //console.log('📋 [DATA-EXTRACT] استخراج البيانات من الرسالة:', {
    //   message,
    //   extractedData: data
    // });

    return data;
  }

  /**
   * محاولة إنشاء الطلب بالبيانات الجديدة
   */
  async attemptOrderCreationWithNewData(pendingOrderData, messageData, conversationId) {
    try {
      // البحث عن تفاصيل الطلب المعلق في المحادثة
      const companyId = messageData.companyId;
      const settings = await this.getSettings(companyId);
      const memoryLimit = settings.maxMessagesPerConversation || 50;
      const conversationMemory = await memoryService.getConversationMemory(conversationId, messageData.senderId, memoryLimit, companyId);
      const orderDetails = await this.extractOrderDetailsFromMemory(conversationMemory);

      // دمج البيانات الجديدة مع تفاصيل الطلب
      const updatedOrderDetails = {
        ...orderDetails,
        customerName: pendingOrderData.extractedData.customerName || orderDetails.customerName,
        customerPhone: pendingOrderData.extractedData.customerPhone || orderDetails.customerPhone,
        customerAddress: pendingOrderData.extractedData.customerAddress || orderDetails.customerAddress,
        city: pendingOrderData.extractedData.city || orderDetails.city
      };

      // فحص اكتمال البيانات مرة أخرى
      const dataCompleteness = await this.checkDataCompleteness(updatedOrderDetails, conversationMemory);

      if (!dataCompleteness.isComplete) {
        // لا تزال هناك بيانات مفقودة
        const dataRequestResponse = await this.generateDataRequestResponse(dataCompleteness.missingData, updatedOrderDetails);

        return {
          success: true,
          content: dataRequestResponse,
          intent: 'data_collection',
          sentiment: 'neutral',
          confidence: 0.9,
          shouldEscalate: false,
          images: [],
          orderCreated: null,
          dataCollection: {
            isRequesting: true,
            missingData: dataCompleteness.missingData,
            orderDetails: updatedOrderDetails
          }
        };
      }

      // البيانات مكتملة، إنشاء الطلب
      //console.log('✅ [DATA-COLLECTION] البيانات مكتملة، إنشاء الطلب...');

      const EnhancedOrderService = require('./enhancedOrderService');
      const enhancedOrderService = new EnhancedOrderService();

      // التأكد من وجود companyId الصحيح
      const dataCompanyId = messageData.customerData?.companyId;
      if (!dataCompanyId) {
        console.error('❌ [SECURITY] لا يمكن إنشاء أوردر بدون companyId في البيانات');
        return null;
      }

      //console.log('🏢 [ORDER-CREATION] إنشاء أوردر من البيانات للشركة:', dataCompanyId);

      const orderCreated = await enhancedOrderService.createEnhancedOrder({
        conversationId,
        customerId: messageData.customerData?.id,
        companyId: dataCompanyId,
        productName: updatedOrderDetails.productName,
        productColor: updatedOrderDetails.productColor,
        productSize: updatedOrderDetails.productSize,
        productPrice: updatedOrderDetails.productPrice,
        quantity: updatedOrderDetails.quantity || 1,
        customerName: updatedOrderDetails.customerName,
        customerPhone: updatedOrderDetails.customerPhone,
        customerEmail: updatedOrderDetails.customerEmail || '',
        customerAddress: updatedOrderDetails.customerAddress,
        city: updatedOrderDetails.city,
        notes: `طلب تم إنشاؤه بعد جمع البيانات - ${new Date().toLocaleString('ar-EG')}`,
        confidence: 0.9,
        extractionMethod: 'ai_data_collection'
      });

      await enhancedOrderService.disconnect();

      if (orderCreated.success) {
        const successMessage = `تم تأكيد طلبك بنجاح! 🎉

رقم الطلب: ${orderCreated.order.orderNumber}
الإجمالي: ${orderCreated.order.total} جنيه

هيتم التواصل معاك قريباً لتأكيد التوصيل. شكراً لثقتك فينا! 😊`;

        return {
          success: true,
          content: successMessage,
          intent: 'order_created',
          sentiment: 'positive',
          confidence: 0.95,
          shouldEscalate: false,
          images: [],
          orderCreated: orderCreated
        };
      }

      return null;

    } catch (error) {
      console.error('❌ Error creating order with new data:', error);
      return null;
    }
  }

  /**
   * Use AI to detect if customer is confirming an order
   */
  async detectConfirmationWithAI(message, conversationMemory, companyId = null) {
    try {
      // Get recent conversation context
      const recentMessages = conversationMemory.slice(-5).map(m =>
        `العميل: ${m.userMessage || m.content}\nالرد: ${m.aiResponse || m.response}`
      ).join('\n\n');

      const prompt = `أنت خبير في فهم نوايا العملاء العرب. مهمتك: تحديد نية العميل بناءً على السياق.

المحادثة السابقة:
${recentMessages}

رسالة العميل الآن: "${message}"

🎯 قواعد التحليل بناءً على السياق:

1️⃣ إذا كان آخر رد من النظام يسأل عن معلومات إضافية (مقاسات، ألوان، شحن):
   - "اه يا ريت" = طلب معلومات إضافية (ليس تأكيد طلب)
   - "نعم" = طلب معلومات إضافية (ليس تأكيد طلب)
   - "موافق" = طلب معلومات إضافية (ليس تأكيد طلب)

2️⃣ إذا كان آخر رد من النظام يطلب تأكيد الطلب صراحة ("تأكدي الطلب؟"):
   - "اه يا ريت" = تأكيد طلب
   - "نعم" = تأكيد طلب
   - "موافق" = تأكيد طلب

🔥 كلمات التأكيد القوية (تأكيد طلب في أي سياق):
- اكد، أكد، اكد الطلب، اكد الاوردر
- تمام اكد، خلاص اكد
3️⃣ كلمات الموافقة العامة (تحتاج تحليل السياق):
- موافق، موافقة، انا موافق
- نعم، ايوه، اه، اوكي، ok
- ماشي، ماشي كده، تسلم، جميل
- يلا، يلا بينا، خلاص، خلاص كده

❌ أجب بـ "لا" إذا كان العميل:
- يسأل أسئلة: "كام؟", "ايه المقاسات؟", "متوفر؟", "الوان ايه؟"
- يستفسر: "الشحن كام؟", "هيوصل امتى؟", "ايه طريقة الدفع؟"
- يتردد: "مش متأكد", "لسه بفكر", "ممكن", "شايف"

✅ أجب بـ "نعم" إذا كان العميل:
- يعطي البيانات المطلوبة بعد أن طلبها النظام: "اسمي أحمد", "رقمي 0123", "عنواني..."
- يرد على طلب النظام للبيانات الشخصية (اسم، هاتف، عنوان)
- يكمل البيانات الناقصة للطلب

🎯 تحليل الحالة الحالية:
- آخر رد النظام: "${recentMessages.split('الرد:').pop()?.substring(0, 100) || 'غير متوفر'}"
- رسالة العميل: "${message}"

🚨 قرار نهائي:
- إذا كان آخر رد يسأل عن معلومات إضافية وردّ العميل "اه يا ريت" = لا (طلب معلومات)
- إذا كان آخر رد يطلب تأكيد الطلب وردّ العميل "اه يا ريت" = نعم (تأكيد طلب)
- إذا كان آخر رد يطلب البيانات الشخصية وردّ العميل بالبيانات = نعم (تأكيد طلب)
- إذا كان العميل يستخدم كلمات التأكيد القوية = نعم

🎯 حالات خاصة:
- إذا طلب النظام "الاسم والهاتف والعنوان" وأرسل العميل هذه البيانات = نعم (تأكيد)
- إذا طلب النظام "محتاجة بياناتك" وأرسل العميل البيانات = نعم (تأكيد)
- إذا ذكر النظام "الإجمالي" ثم طلب البيانات وأرسلها العميل = نعم (تأكيد)

أجب بكلمة واحدة فقط: نعم أو لا`;

      // Get active Gemini configuration for the company
      const geminiConfig = await this.getCurrentActiveModel(companyId);
      //console.log(`🔍 [DEBUG] detectConfirmationWithAI using model: ${geminiConfig?.model} for company: ${companyId}`);
      if (!geminiConfig) {
        console.error(`❌ No active Gemini key found for confirmation detection for company: ${companyId}`);
        return false;
      }

      // Generate AI response using unified method with switching support (no pattern tracking for confirmation detection)
      const aiResponse = await this.generateAIResponse(prompt, [], false, null, companyId);
      const aiAnswer = aiResponse?.toLowerCase().trim();

      // تحسين تحليل الرد - البحث عن أي إشارة للموافقة
      const isConfirming = aiAnswer === 'نعم' ||
                          aiAnswer.includes('نعم') ||
                          aiAnswer === 'yes' ||
                          aiAnswer.includes('yes') ||
                          aiAnswer === 'موافق' ||
                          aiAnswer.includes('موافق') ||
                          (aiAnswer.includes('تأكيد') || aiAnswer.includes('تاكيد'));

      // إضافة تسجيل مفصل للتشخيص
      //console.log(`🔍 [CONFIRMATION-DEBUG] Message: "${message}"`);
      //console.log(`🔍 [CONFIRMATION-DEBUG] AI Response: "${aiResponse}"`);
      //console.log(`🔍 [CONFIRMATION-DEBUG] AI Decision: ${isConfirming ? 'CONFIRMED' : 'NOT CONFIRMED'}`);



      //console.log(`🎯 [FINAL-DECISION] ${isConfirming ? 'CONFIRMED' : 'NOT CONFIRMED'}`);
      return isConfirming;

    } catch (error) {
      console.error('❌ Error in AI confirmation detection:', error);
      return false;
    }
  }

  /**
   * Extract order details from conversation memory using AI
   */
  async extractOrderDetailsFromMemory(conversationMemory) {
    try {
      //console.log('🔍 [ORDER-EXTRACTION] بدء استخراج تفاصيل الطلب من المحادثة...');

      // بناء سياق المحادثة
      const conversationText = this.buildConversationContext(conversationMemory);

      // استخدام الذكاء الاصطناعي لاستخراج التفاصيل
      const extractedDetails = await this.extractDetailsWithAI(conversationText);

      // تنظيف وتحسين البيانات المستخرجة
      const cleanedDetails = this.cleanAndValidateOrderDetails(extractedDetails);

      //console.log('✅ [ORDER-EXTRACTION] تم استخراج التفاصيل:', cleanedDetails);
      return cleanedDetails;

    } catch (error) {
      console.error('❌ [ORDER-EXTRACTION] خطأ في استخراج التفاصيل:', error);
      return null; // إرجاع null بدلاً من بيانات خاطئة
    }
  }

  /**
   * Build conversation context for AI analysis
   */
  buildConversationContext(conversationMemory) {
    const recentMessages = conversationMemory.slice(-15); // آخر 15 رسالة

    return recentMessages.map((message, index) => {
      const sender = message.isFromCustomer ? 'العميل' : 'النظام';
      const content = message.content || '';
      const timestamp = message.createdAt ? new Date(message.createdAt).toLocaleTimeString('ar-EG') : '';

      return `[${index + 1}] ${timestamp} ${sender}: ${content}`;
    }).join('\n\n');
  }

  /**
   * Extract details using AI
   */
  async extractDetailsWithAI(conversationText) {
    //console.log('🔍 [ORDER-EXTRACTION] نص المحادثة المرسل للذكاء الاصطناعي:');
    //console.log('='.repeat(50));
    //console.log(conversationText);
    //console.log('='.repeat(50));

    const prompt = `أنت خبير في تحليل المحادثات التجارية واستخراج تفاصيل الطلبات. حلل المحادثة التالية بعناية فائقة:

=== المحادثة ===
${conversationText}
=== نهاية المحادثة ===

🎯 مهمتك: استخراج تفاصيل الطلب من هذه المحادثة بدقة عالية.

📋 ابحث عن المعلومات التالية:
1. 🛍️ اسم المنتج: (كوتشي، حذاء، صندل، إلخ)
2. 🎨 لون المنتج: (أسود، أبيض، بني، كحلي، إلخ)
3. 📏 مقاس المنتج: (رقم المقاس)
4. 💰 سعر المنتج: (بالجنيه المصري)
5. 👤 اسم العميل: (الاسم الكامل أو الأول)
6. 📱 رقم الهاتف: (11 رقم يبدأ بـ 01)
7. 🏠 العنوان/المدينة: (مكان التوصيل)
8. 📝 ملاحظات إضافية

🔍 تعليمات مهمة:
- ركز على آخر منتج تم مناقشته في المحادثة
- إذا ذُكر أكثر من سعر، استخدم آخر سعر مذكور
- إذا ذُكر أكثر من عنوان، استخدم آخر عنوان مذكور
- ابحث عن الأرقام المصرية (تبدأ بـ 01 وتحتوي على 11 رقم)
- اسم العميل قد يكون في بداية أو وسط أو نهاية المحادثة

📤 أجب بصيغة JSON صحيحة فقط (بدون أي نص إضافي):
{
  "productName": "اسم المنتج الكامل",
  "productColor": "اللون",
  "productSize": "المقاس",
  "productPrice": السعر_كرقم,
  "customerName": "اسم العميل",
  "customerPhone": "رقم الهاتف",
  "customerAddress": "العنوان الكامل",
  "city": "المدينة",
  "notes": "أي ملاحظات مهمة",
  "confidence": 0.95
}

⚠️ إذا لم تجد معلومة معينة، ضع null (وليس نص فارغ).
⚠️ تأكد من صحة JSON قبل الإرسال.`;

    try {
      const aiResponse = await this.generateAIResponse(prompt, [], false);
      //console.log('🤖 [ORDER-EXTRACTION] رد الذكاء الاصطناعي الخام:', aiResponse);

      // تحسين استخراج JSON - البحث عن أول { وآخر }
      const firstBrace = aiResponse.indexOf('{');
      const lastBrace = aiResponse.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = aiResponse.substring(firstBrace, lastBrace + 1);
        //console.log('🔍 [ORDER-EXTRACTION] JSON المستخرج:', jsonString);

        try {
          const extractedData = JSON.parse(jsonString);
          //console.log('✅ [ORDER-EXTRACTION] البيانات المستخرجة بنجاح:', extractedData);

          // التحقق من وجود البيانات الأساسية للعميل (الأهم لإنشاء الطلب)
          if (!extractedData.customerName || !extractedData.customerPhone) {
            console.warn('⚠️ [ORDER-EXTRACTION] بيانات العميل الأساسية مفقودة (اسم أو هاتف)');
            //console.log('📊 [ORDER-EXTRACTION] البيانات الموجودة:', {
            //   customerName: extractedData.customerName,
            //   customerPhone: extractedData.customerPhone,
            //   productName: extractedData.productName
            // });
            return null; // إرجاع null بدلاً من بيانات خاطئة
          }

          return extractedData;
        } catch (parseError) {
          console.error('❌ [ORDER-EXTRACTION] خطأ في تحليل JSON:', parseError.message);
          //console.log('📝 [ORDER-EXTRACTION] JSON الخاطئ:', jsonString);
          return null; // إرجاع null بدلاً من بيانات خاطئة
        }
      } else {
        console.warn('⚠️ [ORDER-EXTRACTION] لم يتم العثور على JSON صحيح في رد الذكاء الاصطناعي');
        //console.log('📝 [ORDER-EXTRACTION] الرد الكامل:', aiResponse);
        return null; // إرجاع null بدلاً من بيانات خاطئة
      }
    } catch (error) {
      console.error('❌ [ORDER-EXTRACTION] خطأ في استخراج التفاصيل بالذكاء الاصطناعي:', error);
      return null; // إرجاع null بدلاً من بيانات خاطئة
    }
  }

  /**
   * Clean and validate extracted order details
   */
  cleanAndValidateOrderDetails(extractedDetails) {
    //console.log('🧹 [ORDER-CLEANING] البيانات الخام قبل التنظيف:', extractedDetails);

    const cleaned = {
      productName: this.cleanProductName(extractedDetails.productName),
      productColor: this.cleanProductColor(extractedDetails.productColor),
      productSize: this.cleanProductSize(extractedDetails.productSize),
      productPrice: this.cleanProductPrice(extractedDetails.productPrice),
      customerName: this.cleanCustomerName(extractedDetails.customerName),
      customerPhone: this.cleanPhoneNumber(extractedDetails.customerPhone),
      customerAddress: this.cleanAddress(extractedDetails.customerAddress),
      city: this.cleanCity(extractedDetails.city),
      quantity: 1,
      notes: extractedDetails.notes || '',
      confidence: extractedDetails.confidence || 0.5
    };

    //console.log('✨ [ORDER-CLEANING] البيانات بعد التنظيف:', cleaned);

    // تشغيل الـ validation المتقدم
    const validation = this.validateOrderDetails(cleaned);

    // إضافة نتائج الـ validation للبيانات
    cleaned.validation = validation;

    // تعديل مستوى الثقة بناءً على الـ validation
    if (!validation.isValid) {
      cleaned.confidence = Math.min(cleaned.confidence, 0.4);
    } else if (validation.warnings.length > 2) {
      cleaned.confidence = Math.min(cleaned.confidence, 0.6);
    } else if (validation.warnings.length > 0) {
      cleaned.confidence = Math.min(cleaned.confidence, 0.8);
    }

    // إضافة ملاحظات الـ validation
    if (validation.errors.length > 0) {
      cleaned.notes += `\n⚠️ أخطاء: ${validation.errors.join(', ')}`;
    }
    if (validation.warnings.length > 0) {
      cleaned.notes += `\n⚡ تحذيرات: ${validation.warnings.join(', ')}`;
    }
    if (validation.suggestions.length > 0) {
      cleaned.notes += `\n💡 اقتراحات: ${validation.suggestions.join(', ')}`;
    }

    //console.log('🧹 [ORDER-CLEANING] تنظيف البيانات:', {
    //   original: extractedDetails,
    //   cleaned: cleaned,
    //   validation: validation
    // });

    return cleaned;
  }

  /**
   * Clean product name with enhanced intelligence
   */
  cleanProductName(name) {
    if (!name || typeof name !== 'string') return 'كوتشي حريمي';

    // إزالة الأحرف الغريبة والتنظيف
    let cleaned = name.trim()
      .replace(/[()[\]{}]/g, '') // إزالة الأقواس
      .replace(/\s+/g, ' ') // توحيد المسافات
      .replace(/^(ال|كوتشي|حذاء)\s*/i, ''); // إزالة البادئات الشائعة

    // قاموس المنتجات المعروفة
    const productMap = {
      'اسكوتش': 'كوتشي الاسكوتش',
      'الاسكوتش': 'كوتشي الاسكوتش',
      'سكوتش': 'كوتشي الاسكوتش',
      'حريمي': 'كوتشي حريمي',
      'رجالي': 'كوتشي رجالي',
      'اطفال': 'كوتشي أطفال',
      'ولادي': 'كوتشي أطفال',
      'بناتي': 'كوتشي بناتي',
      'رياضي': 'كوتشي رياضي',
      'كاجوال': 'كوتشي كاجوال',
      'كلاسيك': 'كوتشي كلاسيك'
    };

    // البحث عن تطابق في القاموس
    for (const [key, value] of Object.entries(productMap)) {
      if (cleaned.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    // إضافة "كوتشي" إذا لم تكن موجودة
    if (!cleaned.includes('كوتشي') && !cleaned.includes('حذاء')) {
      cleaned = 'كوتشي ' + cleaned;
    }

    return cleaned || 'كوتشي حريمي';
  }

  /**
   * Clean product color with enhanced mapping
   */
  cleanProductColor(color) {
    //console.log('🎨 [COLOR-CLEANING] اللون الخام:', color);

    if (!color || typeof color !== 'string') {
      //console.log('🎨 [COLOR-CLEANING] لا يوجد لون، استخدام الافتراضي: أبيض');
      return 'أبيض';
    }

    // تنظيف اللون وتوحيد الأسماء
    const colorMap = {
      // الألوان الأساسية
      'اسود': 'أسود',
      'ابيض': 'أبيض',
      'احمر': 'أحمر',
      'ازرق': 'أزرق',
      'اخضر': 'أخضر',
      'اصفر': 'أصفر',
      'بنفسجي': 'بنفسجي',
      'وردي': 'وردي',
      'برتقالي': 'برتقالي',

      // درجات الألوان
      'بني': 'بني',
      'بيج': 'بيج',
      'رمادي': 'رمادي',
      'كحلي': 'كحلي',
      'نيفي': 'كحلي',
      'navy': 'كحلي',

      // الألوان بالإنجليزية
      'black': 'أسود',
      'white': 'أبيض',
      'red': 'أحمر',
      'blue': 'أزرق',
      'green': 'أخضر',
      'yellow': 'أصفر',
      'brown': 'بني',
      'beige': 'بيج',
      'gray': 'رمادي',
      'grey': 'رمادي',
      'pink': 'وردي',
      'purple': 'بنفسجي',
      'orange': 'برتقالي',

      // أخطاء إملائية شائعة
      'اسوود': 'أسود',
      'ابييض': 'أبيض',
      'احمرر': 'أحمر',
      'ازررق': 'أزرق'
    };

    let cleaned = color.trim()
      .replace(/[()[\]{}]/g, '')
      .replace(/^(ال|لون)\s*/i, '')
      .toLowerCase();

    const finalColor = colorMap[cleaned] || color.trim() || 'أبيض';
    //console.log('🎨 [COLOR-CLEANING] اللون النهائي:', finalColor);
    return finalColor;
  }

  /**
   * Clean product size with enhanced validation
   */
  cleanProductSize(size) {
    //console.log('👟 [SIZE-CLEANING] المقاس الخام:', size);

    if (!size) {
      //console.log('👟 [SIZE-CLEANING] لا يوجد مقاس، استخدام الافتراضي: 37');
      return '37';
    }

    // استخراج الرقم فقط
    const sizeMatch = String(size).match(/(\d+(?:\.\d+)?)/);
    const numericSize = sizeMatch ? parseFloat(sizeMatch[1]) : null;
    //console.log('👟 [SIZE-CLEANING] المقاس الرقمي المستخرج:', numericSize);

    // التحقق من صحة المقاس حسب النوع
    if (numericSize) {
      // مقاسات الأحذية النسائية (35-42)
      if (numericSize >= 35 && numericSize <= 42) {
        const finalSize = String(Math.round(numericSize));
        //console.log('👟 [SIZE-CLEANING] مقاس نسائي صحيح:', finalSize);
        return finalSize;
      }

      // مقاسات الأحذية الرجالية (39-46)
      if (numericSize >= 39 && numericSize <= 46) {
        const finalSize = String(Math.round(numericSize));
        //console.log('👟 [SIZE-CLEANING] مقاس رجالي صحيح:', finalSize);
        return finalSize;
      }

      // مقاسات الأطفال (25-35)
      if (numericSize >= 25 && numericSize <= 35) {
        const finalSize = String(Math.round(numericSize));
        //console.log('👟 [SIZE-CLEANING] مقاس أطفال صحيح:', finalSize);
        return finalSize;
      }

      // تحويل المقاسات الأوروبية إلى مصرية (تقريبي)
      if (numericSize >= 6 && numericSize <= 12) {
        const convertedSize = Math.round(numericSize + 30);
        if (convertedSize >= 35 && convertedSize <= 42) {
          //console.log('👟 [SIZE-CLEANING] تحويل من أوروبي:', numericSize, '->', convertedSize);
          return String(convertedSize);
        }
      }

      //console.log('👟 [SIZE-CLEANING] مقاس رقمي غير صحيح:', numericSize);
    }

    // مقاسات نصية شائعة
    const sizeMap = {
      'صغير': '37',
      'متوسط': '38',
      'كبير': '40',
      'small': '37',
      'medium': '38',
      'large': '40',
      'xl': '41',
      'xxl': '42'
    };

    const textSize = String(size).toLowerCase().trim();
    if (sizeMap[textSize]) {
      //console.log('👟 [SIZE-CLEANING] تم العثور على مقاس نصي:', textSize, '->', sizeMap[textSize]);
      return sizeMap[textSize];
    }

    //console.log('👟 [SIZE-CLEANING] لم يتم العثور على مقاس صحيح، استخدام الافتراضي: 37');
    return '37'; // مقاس افتراضي
  }

  /**
   * Clean product price with enhanced validation
   */
  cleanProductPrice(price) {
    if (!price) return 349; // السعر الافتراضي

    // استخراج الرقم من النص
    let numericPrice;
    if (typeof price === 'number') {
      numericPrice = price;
    } else {
      // البحث عن أرقام في النص
      const priceMatch = String(price).match(/(\d+(?:\.\d+)?)/);
      numericPrice = priceMatch ? parseFloat(priceMatch[1]) : null;
    }

    if (numericPrice) {
      // التحقق من منطقية السعر حسب فئات المنتجات

      // أحذية عادية (100-500 جنيه)
      if (numericPrice >= 100 && numericPrice <= 500) {
        return Math.round(numericPrice);
      }

      // أحذية متوسطة (500-1000 جنيه)
      if (numericPrice >= 500 && numericPrice <= 1000) {
        return Math.round(numericPrice);
      }

      // أحذية فاخرة (1000-3000 جنيه)
      if (numericPrice >= 1000 && numericPrice <= 3000) {
        return Math.round(numericPrice);
      }

      // أسعار منخفضة جداً (قد تكون خطأ)
      if (numericPrice >= 50 && numericPrice < 100) {
        return Math.round(numericPrice);
      }

      // تحويل الأسعار بالدولار إلى جنيه (تقريبي)
      if (numericPrice >= 5 && numericPrice <= 100) {
        const convertedPrice = Math.round(numericPrice * 30); // سعر صرف تقريبي
        if (convertedPrice >= 150 && convertedPrice <= 3000) {
          return convertedPrice;
        }
      }
    }

    // أسعار افتراضية حسب نوع المنتج
    const defaultPrices = {
      'كوتشي الاسكوتش': 349,
      'كوتشي حريمي': 299,
      'كوتشي رجالي': 399,
      'كوتشي أطفال': 199,
      'كوتشي رياضي': 449
    };

    return 349; // السعر الافتراضي
  }

  /**
   * Clean customer name
   */
  cleanCustomerName(name) {
    if (!name || typeof name !== 'string') return null;

    // تنظيف الاسم
    let cleaned = name.trim()
      .replace(/[()[\]{}]/g, '')
      .replace(/\d+/g, '') // إزالة الأرقام
      .replace(/\s+/g, ' ')
      .trim();

    // التحقق من أن الاسم ليس Facebook ID
    if (cleaned.length < 3 || /^\d+$/.test(cleaned)) {
      return null;
    }

    return cleaned;
  }

  /**
   * Clean phone number
   */
  cleanPhoneNumber(phone) {
    if (!phone) return '';

    // استخراج الأرقام فقط
    const digits = String(phone).replace(/[^\d]/g, '');

    // التحقق من صحة رقم الهاتف المصري
    if (digits.length === 11 && digits.startsWith('01')) {
      return digits;
    }

    if (digits.length === 10 && digits.startsWith('1')) {
      return '0' + digits;
    }

    return '';
  }

  /**
   * Clean address
   */
  cleanAddress(address) {
    if (!address || typeof address !== 'string') return '';

    return address.trim()
      .replace(/[()[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Clean city name
   */
  cleanCity(city) {
    if (!city || typeof city !== 'string') return 'غير محدد';

    // قائمة المدن المصرية الشائعة
    const egyptianCities = {
      'القاهره': 'القاهرة',
      'الاسكندريه': 'الإسكندرية',
      'الاسكندرية': 'الإسكندرية',
      'الجيزه': 'الجيزة',
      'شبرا': 'شبرا الخيمة',
      'المنصوره': 'المنصورة',
      'المنصورة': 'المنصورة',
      'طنطا': 'طنطا',
      'الزقازيق': 'الزقازيق',
      'اسيوط': 'أسيوط',
      'سوهاج': 'سوهاج',
      'قنا': 'قنا',
      'الاقصر': 'الأقصر',
      'اسوان': 'أسوان',
      'بورسعيد': 'بورسعيد',
      'السويس': 'السويس',
      'الاسماعيليه': 'الإسماعيلية',
      'دمياط': 'دمياط',
      'كفر الشيخ': 'كفر الشيخ',
      'البحيره': 'البحيرة',
      'الغربيه': 'الغربية',
      'المنوفيه': 'المنوفية',
      'القليوبيه': 'القليوبية',
      'الشرقيه': 'الشرقية',
      'الدقهليه': 'الدقهلية'
    };

    let cleaned = city.trim()
      .replace(/[()[\]{}]/g, '')
      .replace(/^(محافظة|مدينة)\s*/i, '');

    return egyptianCities[cleaned] || cleaned || 'غير محدد';
  }

  /**
   * Advanced validation for extracted order details
   */
  validateOrderDetails(details) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // التحقق من اسم المنتج
    if (!details.productName || details.productName === 'كوتشي حريمي') {
      validationResults.warnings.push('اسم المنتج افتراضي - قد يحتاج تحديد أكثر دقة');
    }

    // التحقق من اللون
    const commonColors = ['أسود', 'أبيض', 'بني', 'بيج', 'كحلي', 'أحمر', 'أزرق'];
    if (!commonColors.includes(details.productColor)) {
      validationResults.warnings.push(`لون غير شائع: ${details.productColor}`);
    }

    // التحقق من المقاس
    const sizeNum = parseInt(details.productSize);
    if (isNaN(sizeNum) || sizeNum < 25 || sizeNum > 46) {
      validationResults.errors.push(`مقاس غير صحيح: ${details.productSize}`);
      validationResults.isValid = false;
    }

    // التحقق من السعر
    if (details.productPrice < 50 || details.productPrice > 5000) {
      validationResults.warnings.push(`سعر غير عادي: ${details.productPrice} جنيه`);
    }

    // التحقق من رقم الهاتف
    if (details.customerPhone && !/^01[0-9]{9}$/.test(details.customerPhone)) {
      validationResults.errors.push(`رقم هاتف غير صحيح: ${details.customerPhone}`);
    }

    // التحقق من اسم العميل
    if (!details.customerName || /^\d+/.test(details.customerName)) {
      validationResults.warnings.push('اسم العميل غير واضح أو مفقود');
    }

    // اقتراحات للتحسين
    if (details.confidence < 0.7) {
      validationResults.suggestions.push('مستوى الثقة منخفض - قد تحتاج مراجعة يدوية');
    }

    if (!details.customerPhone) {
      validationResults.suggestions.push('رقم الهاتف مفقود - يُنصح بطلبه من العميل');
    }

    if (!details.customerAddress || details.city === 'غير محدد') {
      validationResults.suggestions.push('العنوان غير مكتمل - قد يؤثر على الشحن');
    }

    return validationResults;
  }

  /**
   * Get default order details
   */
  getDefaultOrderDetails() {
    return {
      productName: 'كوتشي حريمي',
      productColor: 'أبيض',
      productSize: '37',
      productPrice: 349,
      customerName: null,
      customerPhone: '',
      customerAddress: '',
      city: 'غير محدد',
      quantity: 1,
      notes: 'تم استخراج البيانات تلقائياً',
      confidence: 0.3
    };
  }

  /**
   * Get time ago in Arabic
   */
  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `${diffMins} دقيقة`;
    if (diffHours < 24) return `${diffHours} ساعة`;
    if (diffDays < 7) return `${diffDays} يوم`;
    return `${Math.floor(diffDays / 7)} أسبوع`;
  }

  /**
   * 🧠 استخدام الذكاء الاصطناعي المتقدم لتحديد طلب الصور
   */
  async isCustomerRequestingImages(message, conversationMemory = [], companyId = null) {
    try {
      //console.log(`\n🧠 [AI-IMAGE-DETECTION] ===== بدء تحليل طلب الصور =====`);
      //console.log(`📝 [AI-IMAGE-DETECTION] الرسالة الكاملة: "${message}"`);
      //console.log(`🏢 [AI-IMAGE-DETECTION] معرف الشركة: ${companyId}`);
      //console.log(`💭 [AI-IMAGE-DETECTION] ذاكرة المحادثة: ${conversationMemory.length} رسالة`);

      // بناء السياق من المحادثة السابقة
      let conversationContext = '';
      if (conversationMemory.length > 0) {
        const recentMessages = conversationMemory.slice(-3);
        conversationContext = recentMessages.map(memory =>
          `العميل: ${memory.userMessage}\nالرد: ${memory.aiResponse}`
        ).join('\n---\n');
        //console.log(`📚 [AI-IMAGE-DETECTION] سياق المحادثة:\n${conversationContext.substring(0, 200)}...`);
      } else {
        //console.log(`📚 [AI-IMAGE-DETECTION] لا يوجد سياق محادثة سابق`);
      }

      // Prompt متقدم للذكاء الاصطناعي
      const advancedImageRequestPrompt = `
أنت خبير في فهم نوايا العملاء. حلل الرسالة التالية بعمق لتحديد إذا كان العميل يريد رؤية صور للمنتجات.

الرسالة الحالية: "${message}"

${conversationContext ? `سياق المحادثة السابقة:\n${conversationContext}\n` : ''}

معايير التحليل:
1. الطلب المباشر للصور: "ممكن صورة"، "ابعتلي صور"، "عايز أشوف صور"
2. الطلب غير المباشر: "عايز أشوف"، "وريني"، "كيف شكله"، "شكله ايه"
3. السياق العام: هل يسأل عن منتج ويريد رؤيته؟
4. النية الضمنية: هل يبدو مهتم برؤية المنتج بصرياً؟

تجنب الإيجابيات الخاطئة:
- "أشوف المتاح" = يريد معرفة ما متوفر (ليس بالضرورة صور)
- "شوف لي" = قد يعني البحث وليس الصور
- "إيه اللي عندكم" = استفسار عام وليس طلب صور

حلل بعناية وأجب:
- "نعم" إذا كان يطلب صور بوضوح (مباشر أو غير مباشر)
- "لا" إذا كان مجرد استفسار عام أو لا يريد صور

التحليل والقرار:`;

      //console.log(`🤖 [AI-IMAGE-DETECTION] إرسال الطلب للذكاء الاصطناعي...`);
      const response = await this.generateAIResponse(advancedImageRequestPrompt, [], false, null, companyId);
      //console.log(`📥 [AI-IMAGE-DETECTION] رد الذكاء الاصطناعي: "${response}"`);

      const analysisText = response.trim().toLowerCase();
      //console.log(`🔤 [AI-IMAGE-DETECTION] النص بعد التطبيع: "${analysisText}"`);

      // تحليل أكثر دقة للرد
      const containsYes = analysisText.includes('نعم');
      const containsNoYes = analysisText.includes('لا نعم');
      const isRequesting = containsYes && !containsNoYes;

      //console.log(`🔍 [AI-IMAGE-DETECTION] تحليل الرد:`);
      //console.log(`   - يحتوي على "نعم": ${containsYes}`);
      //console.log(`   - يحتوي على "لا نعم": ${containsNoYes}`);
      //console.log(`   - القرار النهائي: ${isRequesting}`);

      // تسجيل مفصل للتحليل
      //console.log(`\n🎯 [AI-IMAGE-DETECTION] ===== النتيجة النهائية =====`);
      //console.log(`📝 الرسالة: "${message}"`);
      //console.log(`🤖 رد الـ AI: "${response}"`);
      //console.log(`${isRequesting ? '✅' : '❌'} القرار: ${isRequesting ? 'العميل يريد صور' : 'العميل لا يريد صور'}`);

      return isRequesting;

    } catch (error) {
      console.error(`❌ [AI-IMAGE-DETECTION] Error in AI analysis: ${error.message}`);

      // Fallback محدود جداً - فقط للطلبات الواضحة
      const explicitImageKeywords = [
        'ممكن صورة', 'ابعتلي صور', 'عايز صور', 'اريد صور',
        'صورة للمنتج', 'صور المنتج', 'وريني صور'
      ];

      const messageNormalized = message.toLowerCase();
      const hasExplicitRequest = explicitImageKeywords.some(keyword =>
        messageNormalized.includes(keyword)
      );

      //console.log(`🔄 [AI-IMAGE-DETECTION] Fallback (explicit only): ${hasExplicitRequest ? 'YES' : 'NO'}`);
      return hasExplicitRequest;
    }
  }

  /**
   * Use AI to find products from conversation context
   */
  async findProductsFromContext(message, conversationMemory = []) {
    try {
      // Build context from recent conversation
      const recentMessages = conversationMemory.slice(-5);
      const conversationContext = recentMessages.map(memory =>
        `العميل: ${memory.userMessage}\nالرد: ${memory.aiResponse}`
      ).join('\n---\n');

      const contextPrompt = `
بناءً على سياق المحادثة التالية، هل تم ذكر أي منتجات؟

${conversationContext}

الرسالة الحالية: "${message}"

إذا تم ذكر منتجات في المحادثة، أجب بـ "نعم"
إذا لم يتم ذكر أي منتجات، أجب بـ "لا"
`;

      const response = await this.generateAIResponse(contextPrompt, [], false);
      const hasProductContext = response.trim().toLowerCase().includes('نعم');

      if (hasProductContext) {
        //console.log('🎯 AI detected product context, fetching all products...');
        return await this.ragService.retrieveData('منتج', 'product_inquiry', null); // companyId سيتم تمريره لاحقاً
      }

      return [];

    } catch (error) {
      //console.log(`❌ Error in AI context analysis: ${error.message}`);
      return [];
    }
  }

  /**
   * @deprecated ❌ هذه الدالة معطلة - استخدم getSmartResponse بدلاً منها
   */
  async getProductImages(customerMessage, ragData, intent, conversationMemory = []) {
    //console.log('⚠️ [DEPRECATED] getProductImages is disabled - use getSmartResponse instead');
    return [];
  }

  /**
   * Extract product ID from RAG data
   */
  async extractProductIdFromRAG(ragItem) {
    try {
      // Search for product in database based on RAG content
      const products = await this.prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: 'كوتشي' } },
            { name: { contains: 'حذاء' } },
            { name: { contains: 'حريمي' } }
          ]
        }
      });

      return products.length > 0 ? products[0].id : null;
    } catch (error) {
      console.error('❌ Error extracting product ID:', error);
      return null;
    }
  }

  /**
   * Get product images from database
   */
  async getProductImagesFromDB(productId) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          variants: true
        }
      });

      if (!product) {
        //console.log('❌ Product not found, using default images');
        return this.getDefaultProductImages();
      }

      //console.log('🔍 Checking product for images:', {
      //   id: product.id,
      //   name: product.name,
      //   images: product.images,
      //   imageUrl: product.imageUrl
      // });

      const productImages = [];

      // Check for product images in JSON format
      if (product.images) {
        try {
          const parsedImages = JSON.parse(product.images);
          if (Array.isArray(parsedImages) && parsedImages.length > 0) {
            //console.log(`📸 Found ${parsedImages.length} images in product.images`);

            parsedImages.forEach((imageUrl, index) => {
              productImages.push({
                type: 'image',
                payload: {
                  url: imageUrl,
                  title: `${product.name} - صورة ${index + 1}`
                }
              });
            });
          }
        } catch (parseError) {
          //console.log('⚠️ Error parsing product.images:', parseError.message);
        }
      }

      // Check for single image URL
      if (product.imageUrl && productImages.length === 0) {
        //console.log('📸 Found single image in product.imageUrl');
        productImages.push({
          type: 'image',
          payload: {
            url: product.imageUrl,
            title: `${product.name} - صورة المنتج`
          }
        });
      }

      // Check variant images
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant, index) => {
          if (variant.imageUrl && productImages.length < 3) {
            //console.log(`📸 Found variant image for ${variant.color || variant.name}`);
            productImages.push({
              type: 'image',
              payload: {
                url: variant.imageUrl,
                title: `${product.name} - ${variant.color || variant.name}`
              }
            });
          }
        });
      }

      if (productImages.length > 0) {
        //console.log(`✅ Found ${productImages.length} real product images`);
        return productImages.slice(0, 3);
      } else {
        //console.log('⚠️ No real images found, using customized images');
        return this.getCustomizedProductImages(product);
      }

    } catch (error) {
      console.error('❌ Error getting product images from DB:', error);
      return this.getDefaultProductImages();
    }
  }

  /**
   * Get customized product images based on product data
   */
  getCustomizedProductImages(product) {
    // Use real, accessible image URLs that Facebook can download
    return [
      {
        type: 'image',
        payload: {
          url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop',
          title: `${product.name} - صورة المنتج`
        }
      },
      {
        type: 'image',
        payload: {
          url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop',
          title: `${product.name} - زاوية أخرى`
        }
      },
      {
        type: 'image',
        payload: {
          url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop',
          title: `${product.name} - التفاصيل`
        }
      }
    ];
  }

  /**
   * ❌ معطل - لا نرسل صور افتراضية بعد الآن
   */
  getDefaultProductImages() {
    //console.log(`⚠️ [DEFAULT-IMAGES] Default images disabled - only send real product images when requested`);
    return [];
  }

  /**
   * Get active Gemini API key using new multi-key system with company isolation
   */
  async getActiveGeminiKey(companyId = null) {
    try {
      //console.log('🔍 البحث عن مفتاح Gemini نشط (النظام الجديد)...');

      // تحديد الشركة - بدون fallback للأمان
      let targetCompanyId = companyId;
      if (!targetCompanyId) {
        console.error('❌ [SECURITY] لم يتم تمرير companyId - رفض الطلب للأمان');
        return null;
      }

      if (!targetCompanyId) {
        //console.log('❌ لا توجد شركات في النظام');
        return null;
      }

      //console.log(`🏢 البحث عن مفاتيح الشركة: ${targetCompanyId}`);

      // البحث عن المفتاح النشط للشركة المحددة
      const activeKey = await this.prisma.geminiKey.findFirst({
        where: {
          isActive: true,
          companyId: targetCompanyId
        },
        orderBy: { priority: 'asc' }
      });

      if (!activeKey) {
        //console.log(`❌ لم يتم العثور على مفتاح نشط للشركة: ${targetCompanyId}`);
        //console.log('🔄 محاولة تفعيل أول مفتاح متاح تلقائياً...');

        // البحث عن أول مفتاح متاح وتفعيله تلقائياً
        const autoActivatedKey = await this.findAndActivateFirstAvailableKey(targetCompanyId);
        if (autoActivatedKey) {
          //console.log(`✅ تم تفعيل مفتاح تلقائياً: ${autoActivatedKey.keyName}`);
          return autoActivatedKey;
        }

        //console.log(`❌ لا توجد مفاتيح متاحة للتفعيل للشركة: ${targetCompanyId}`);
        return null;
      }

      //console.log(`🔍 المفتاح النشط للشركة ${targetCompanyId}: ${activeKey.name}`);

      // البحث عن أفضل نموذج متاح في هذا المفتاح
      const bestModel = await this.findBestAvailableModelInActiveKey(activeKey.id);
      
      if (bestModel) {
        // تحديث عداد الاستخدام للنموذج
        await this.updateModelUsage(bestModel.id);
        
        //console.log(`✅ تم العثور على نموذج متاح: ${bestModel.model}`);

        // 🔍 لوج مفصل لتتبع المفتاح المستخدم
        //console.log('🔑 [KEY-TRACKING] ===== تتبع المفتاح المستخدم =====');
        //console.log('🏢 [KEY-TRACKING] Company ID:', targetCompanyId);
        //console.log('🔑 [KEY-TRACKING] Key ID:', activeKey.id);
        //console.log('🤖 [KEY-TRACKING] Model:', bestModel.model);
        //console.log('🔗 [KEY-TRACKING] API Key (first 20 chars):', activeKey.apiKey?.substring(0, 20) + '...');
        //console.log('📊 [KEY-TRACKING] Model Usage:', bestModel.currentUsage + '/' + bestModel.dailyLimit);
        //console.log('🔑 [KEY-TRACKING] ===== نهاية تتبع المفتاح =====');

        return {
          apiKey: activeKey.apiKey,
          model: bestModel.model,
          keyId: activeKey.id,
          modelId: bestModel.id
        };
      }

      //console.log('⚠️ لا توجد نماذج متاحة في المفتاح النشط، البحث عن بديل...');

      // البحث عن نموذج احتياطي للشركة
      const backupModel = await this.findNextAvailableModel(targetCompanyId);
      if (backupModel) {
        //console.log(`🔄 تم التبديل إلى نموذج احتياطي: ${backupModel.model}`);
        return {
          apiKey: backupModel.apiKey,
          model: backupModel.model,
          keyId: backupModel.keyId,
          switchType: backupModel.switchType
        };
      }

      //console.log('❌ لا توجد نماذج متاحة في أي مفتاح');
      return null;

    } catch (error) {
      console.error('❌ خطأ في الحصول على مفتاح Gemini:', error);
      return null;
    }
  }

  // البحث عن أفضل نموذج متاح في المفتاح النشط
  async findBestAvailableModelInActiveKey(keyId, forceRefresh = false) {
    try {
      // FIXED: Use Prisma ORM instead of raw SQL for better security
      const availableModels = await this.prisma.geminiKeyModel.findMany({
        where: {
          keyId: keyId,
          isEnabled: true
        },
        orderBy: {
          priority: 'asc'
        }
      });

      for (const modelRecord of availableModels) {
        // فحص الذاكرة المؤقتة أولاً
        if (this.exhaustedModelsCache && this.exhaustedModelsCache.has(modelRecord.model)) {
          //console.log(`⚠️ النموذج ${modelRecord.model} في قائمة المستنفدة المؤقتة`);
          continue;
        }

        const usage = JSON.parse(modelRecord.usage);
        const currentUsage = usage.used || 0;
        const maxRequests = usage.limit || 1000000;

        //console.log(`🔍 فحص ${modelRecord.model}: ${currentUsage}/${maxRequests}`);

        // فحص إضافي: إذا كان النموذج يبدو متاحاً لكن تم تحديثه مؤخراً كمستنفد
        if (forceRefresh && usage.exhaustedAt) {
          const exhaustedTime = new Date(usage.exhaustedAt);
          const now = new Date();
          const timeDiff = now - exhaustedTime;

          // إذا تم تحديد النموذج كمستنفد خلال آخر 5 دقائق، تجاهله
          if (timeDiff < 5 * 60 * 1000) {
            //console.log(`⚠️ النموذج ${modelRecord.model} تم تحديده كمستنفد مؤخراً`);
            continue;
          }
        }

        if (currentUsage < maxRequests) {
          //console.log(`✅ نموذج متاح: ${modelRecord.model}`);
          return modelRecord;
        } else {
          //console.log(`⚠️ النموذج ${modelRecord.model} تجاوز الحد`);
        }
      }

      return null;
    } catch (error) {
      console.error('❌ خطأ في البحث عن نموذج متاح:', error);
      return null;
    }
  }

  // تحديد نموذج كمستنفد بناءً على خطأ 429
  async markModelAsExhaustedFrom429(modelName, quotaValue) {
    try {
      //console.log(`⚠️ تحديد النموذج ${modelName} كمستنفد بناءً على خطأ 429...`);

      // FIXED: Use Prisma ORM instead of raw SQL
      const modelRecord = await this.prisma.geminiKeyModel.findMany({
        where: {
          model: modelName
        }
      });

      if (modelRecord && modelRecord.length > 0) {
        const model = modelRecord[0];
        const usage = JSON.parse(model.usage);

        // تحديث الاستخدام بناءً على الحد الحقيقي من Google
        const realLimit = parseInt(quotaValue) || usage.limit || 250;
        const exhaustedUsage = {
          ...usage,
          used: realLimit, // استخدام الحد الحقيقي من Google
          limit: realLimit, // تحديث الحد أيضاً
          lastReset: new Date().toISOString(),
          exhaustedAt: new Date().toISOString()
        };

        // FIXED: Use Prisma ORM instead of raw SQL
        await this.prisma.geminiKeyModel.update({
          where: {
            id: model.id
          },
          data: {
            usage: JSON.stringify(exhaustedUsage)
          }
        });

        //console.log(`✅ تم تحديد النموذج ${modelName} كمستنفد (${realLimit}/${realLimit})`);

        // إضافة النموذج إلى قائمة النماذج المستنفدة المؤقتة لتجنب إعادة استخدامه
        if (!this.exhaustedModelsCache) {
          this.exhaustedModelsCache = new Set();
        }
        this.exhaustedModelsCache.add(modelName);

        // إزالة النموذج من الذاكرة المؤقتة بعد 10 دقائق
        setTimeout(() => {
          if (this.exhaustedModelsCache) {
            this.exhaustedModelsCache.delete(modelName);
          }
        }, 10 * 60 * 1000);
      }
    } catch (error) {
      console.error('❌ خطأ في تحديد النموذج كمستنفد:', error);
    }
  }

  // تحديد نموذج كمستنفد (تجاوز الحد)
  async markModelAsExhausted(modelId) {
    try {
      //console.log(`⚠️ تحديد النموذج ${modelId} كمستنفد...`);

      // FIXED: Use Prisma ORM instead of raw SQL
      const modelRecord = await this.prisma.geminiKeyModel.findMany({
        where: {
          id: modelId
        }
      });

      if (modelRecord && modelRecord.length > 0) {
        const model = modelRecord[0];
        const usage = JSON.parse(model.usage);

        // تحديث الاستخدام ليصبح مساوياً للحد الأقصى
        const exhaustedUsage = {
          ...usage,
          used: usage.limit || 250, // استخدام الحد الأقصى
          lastReset: new Date().toISOString(),
          exhaustedAt: new Date().toISOString()
        };

        // FIXED: Use Prisma ORM instead of raw SQL
        await this.prisma.geminiKeyModel.update({
          where: {
            id: modelId
          },
          data: {
            usage: JSON.stringify(exhaustedUsage)
          }
        });

        //console.log(`✅ تم تحديد النموذج ${model.model} كمستنفد`);
      }
    } catch (error) {
      console.error('❌ خطأ في تحديد النموذج كمستنفد:', error);
    }
  }

  // تحديث عداد الاستخدام لنموذج معين
  async updateModelUsage(modelId) {
    try {
      // FIXED: Use Prisma ORM instead of raw SQL
      const modelRecord = await this.prisma.geminiKeyModel.findMany({
        where: {
          id: modelId
        }
      });

      if (modelRecord && modelRecord.length > 0) {
        const model = modelRecord[0];
        const usage = JSON.parse(model.usage);
        const newUsage = {
          ...usage,
          used: (usage.used || 0) + 1,
          lastUpdated: new Date().toISOString()
        };

        // FIXED: Use Prisma ORM instead of raw SQL
        await this.prisma.geminiKeyModel.update({
          where: {
            id: modelId
          },
          data: {
            usage: JSON.stringify(newUsage),
            lastUsed: new Date(),
            updatedAt: new Date()
          }
        });

        //console.log(`📊 تم تحديث الاستخدام: ${model.model} (${newUsage.used}/${usage.limit})`);
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث عداد الاستخدام:', error);
    }
  }

  // فحص صحة نموذج معين
  async testModelHealth(apiKey, model) {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const testModel = genAI.getGenerativeModel({ model: model });
      
      const testResponse = await testModel.generateContent('Hello');
      return testResponse && testResponse.response;
    } catch (error) {
      //console.log(`❌ Health check failed for ${model}: ${error.message}`);
      return false;
    }
  }

  async findNextAvailableModel(companyId = null) {
    try {
      //console.log('🔄 البحث عن نموذج احتياطي متاح باستخدام النظام الجديد...');

      // تحديد الشركة - بدون fallback للأمان
      let targetCompanyId = companyId;
      if (!targetCompanyId) {
        console.error('❌ [SECURITY] لم يتم تمرير companyId - رفض الطلب للأمان');
        return null;
      }

      if (!targetCompanyId) {
        //console.log('❌ لا توجد شركات في النظام');
        return null;
      }

      // الحصول على المفتاح النشط الحالي للشركة
      const currentActiveKey = await this.prisma.geminiKey.findFirst({
        where: {
          isActive: true,
          companyId: targetCompanyId
        },
        orderBy: { priority: 'asc' }
      });

      if (currentActiveKey) {
        //console.log(`🔍 المفتاح النشط الحالي للشركة ${targetCompanyId}: ${currentActiveKey.name}`);

        // أولاً: البحث عن نموذج آخر في نفس المفتاح
        const nextModelInSameKey = await this.findNextModelInKey(currentActiveKey.id);
        if (nextModelInSameKey) {
          //console.log(`✅ تم العثور على نموذج آخر في نفس المفتاح: ${nextModelInSameKey.model}`);
          return {
            apiKey: currentActiveKey.apiKey,
            model: nextModelInSameKey.model,
            keyId: currentActiveKey.id,
            keyName: currentActiveKey.name,
            switchType: 'same_key_different_model'
          };
        }
      }

      // ثانياً: البحث في مفاتيح أخرى للشركة
      //console.log('🔄 البحث في مفاتيح أخرى للشركة...');
      const nextKeyWithModel = await this.findNextAvailableKey(targetCompanyId);
      
      if (nextKeyWithModel) {
        //console.log(`✅ تم العثور على مفتاح آخر متاح: ${nextKeyWithModel.keyName} - ${nextKeyWithModel.model}`);
        
        // تفعيل المفتاح الجديد
        await this.activateKey(nextKeyWithModel.keyId);
        
        return {
          apiKey: nextKeyWithModel.apiKey,
          model: nextKeyWithModel.model,
          keyId: nextKeyWithModel.keyId,
          keyName: nextKeyWithModel.keyName,
          switchType: 'different_key'
        };
      }

      //console.log('❌ لا توجد نماذج متاحة في أي مفتاح');
      return null;

    } catch (error) {
      console.error('❌ خطأ في البحث عن نموذج احتياطي:', error);
      return null;
    }
  }

  // البحث عن نموذج آخر متاح في نفس المفتاح
  async findNextModelInKey(keyId) {
    try {
      //console.log(`🔍 البحث عن نموذج آخر في المفتاح: ${keyId}`);
      
      // FIXED: Use Prisma ORM instead of raw SQL for better security
      const availableModels = await this.prisma.geminiKeyModel.findMany({
        where: {
          keyId: keyId,
          isEnabled: true
        },
        orderBy: {
          priority: 'asc'
        }
      });

      //console.log(`📋 تم العثور على ${availableModels.length} نموذج في هذا المفتاح`);

      for (const modelRecord of availableModels) {
        // فحص الذاكرة المؤقتة أولاً
        if (this.exhaustedModelsCache && this.exhaustedModelsCache.has(modelRecord.model)) {
          //console.log(`⚠️ النموذج ${modelRecord.model} في قائمة المستنفدة المؤقتة`);
          continue;
        }

        const usage = JSON.parse(modelRecord.usage);
        const currentUsage = usage.used || 0;
        const maxRequests = usage.limit || 1000000;

        //console.log(`🔍 فحص ${modelRecord.model}: ${currentUsage}/${maxRequests}`);

        // فحص إضافي: إذا كان النموذج تم تحديده كمستنفد مؤخراً، تجاهله
        if (usage.exhaustedAt) {
          const exhaustedTime = new Date(usage.exhaustedAt);
          const now = new Date();
          const timeDiff = now - exhaustedTime;

          // إذا تم تحديد النموذج كمستنفد خلال آخر 5 دقائق، تجاهله
          if (timeDiff < 5 * 60 * 1000) {
            //console.log(`⚠️ النموذج ${modelRecord.model} تم تحديده كمستنفد مؤخراً`);
            continue;
          }
        }

        if (currentUsage < maxRequests) {
          // اختبار صحة النموذج
          const keyRecord = await this.prisma.geminiKey.findUnique({ where: { id: keyId } });
          const isHealthy = await this.testModelHealth(keyRecord.apiKey, modelRecord.model);
          
          if (isHealthy) {
            //console.log(`✅ نموذج متاح وصحي: ${modelRecord.model}`);
            
            // FIXED: Use Prisma ORM instead of raw SQL
            await this.prisma.geminiKeyModel.update({
              where: {
                id: modelRecord.id
              },
              data: {
                lastUsed: new Date(),
                updatedAt: new Date()
              }
            });
            
            return modelRecord;
          } else {
            //console.log(`❌ النموذج ${modelRecord.model} غير صحي`);
          }
        } else {
          //console.log(`⚠️ النموذج ${modelRecord.model} تجاوز الحد (${currentUsage}/${maxRequests})`);
        }
      }

      //console.log('❌ لا توجد نماذج متاحة في هذا المفتاح');
      return null;

    } catch (error) {
      console.error('❌ خطأ في البحث عن نموذج في المفتاح:', error);
      return null;
    }
  }

  // البحث عن مفتاح آخر متاح للشركة المحددة
  async findNextAvailableKey(companyId = null) {
    try {
      //console.log('🔍 البحث عن مفتاح آخر متاح...');

      // تحديد الشركة - بدون fallback للأمان
      let targetCompanyId = companyId;
      if (!targetCompanyId) {
        console.error('❌ [SECURITY] لم يتم تمرير companyId - رفض الطلب للأمان');
        return null;
      }

      if (!targetCompanyId) {
        //console.log('❌ لا توجد شركات في النظام');
        return null;
      }

      //console.log(`🏢 البحث عن مفاتيح بديلة للشركة: ${targetCompanyId}`);

      // الحصول على مفاتيح الشركة المحددة مرتبة حسب الأولوية
      const allKeys = await this.prisma.geminiKey.findMany({
        where: { companyId: targetCompanyId },
        orderBy: { priority: 'asc' }
      });

      //console.log(`📋 فحص ${allKeys.length} مفتاح متاح للشركة ${targetCompanyId}...`);

      for (const key of allKeys) {
        //console.log(`🔍 فحص المفتاح: ${key.name} (أولوية: ${key.priority})`);
        
        // البحث عن نموذج متاح في هذا المفتاح
        const availableModel = await this.findBestModelInKey(key.id);
        
        if (availableModel) {
          return {
            keyId: key.id,
            keyName: key.name,
            apiKey: key.apiKey,
            model: availableModel.model,
            modelId: availableModel.id
          };
        }
      }

      //console.log('❌ لا توجد مفاتيح متاحة');
      return null;

    } catch (error) {
      console.error('❌ خطأ في البحث عن مفتاح متاح:', error);
      return null;
    }
  }

  // البحث عن أفضل نموذج في مفتاح معين
  async findBestModelInKey(keyId) {
    try {
      // FIXED: Use Prisma ORM instead of raw SQL for better security
      const availableModels = await this.prisma.geminiKeyModel.findMany({
        where: {
          keyId: keyId,
          isEnabled: true
        },
        orderBy: {
          priority: 'asc'
        }
      });

      for (const modelRecord of availableModels) {
        const usage = JSON.parse(modelRecord.usage);
        const currentUsage = usage.used || 0;
        const maxRequests = usage.limit || 1000000;

        if (currentUsage < maxRequests) {
          // اختبار صحة النموذج
          const keyRecord = await this.prisma.geminiKey.findUnique({ where: { id: keyId } });
          const isHealthy = await this.testModelHealth(keyRecord.apiKey, modelRecord.model);
          
          if (isHealthy) {
            //console.log(`✅ أفضل نموذج في المفتاح: ${modelRecord.model}`);
            return modelRecord;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ خطأ في البحث عن أفضل نموذج:', error);
      return null;
    }
  }

  // البحث عن أول مفتاح متاح وتفعيله تلقائياً
  async findAndActivateFirstAvailableKey(companyId) {
    try {
      //console.log(`🔍 البحث عن أول مفتاح متاح للتفعيل التلقائي للشركة: ${companyId}`);

      // البحث عن جميع مفاتيح الشركة
      const allKeys = await this.prisma.geminiKey.findMany({
        where: { companyId: companyId },
        orderBy: { priority: 'asc' }
      });

      if (allKeys.length === 0) {
        //console.log(`❌ لا توجد مفاتيح مُضافة للشركة: ${companyId}`);
        return null;
      }

      //console.log(`📋 فحص ${allKeys.length} مفتاح للتفعيل التلقائي...`);

      // البحث عن أول مفتاح يحتوي على نماذج متاحة
      for (const key of allKeys) {
        //console.log(`🔍 فحص المفتاح: ${key.name}`);

        // البحث عن نموذج متاح في هذا المفتاح
        const availableModel = await this.findBestModelInKey(key.id);

        if (availableModel) {
          //console.log(`✅ تم العثور على نموذج متاح في المفتاح: ${key.name} - ${availableModel.model}`);

          // تفعيل هذا المفتاح
          const activated = await this.activateKey(key.id);
          if (activated) {
            return {
              apiKey: key.apiKey,
              model: availableModel.model,
              keyId: key.id,
              keyName: key.name,
              modelId: availableModel.id,
              autoActivated: true
            };
          }
        }
      }

      //console.log(`❌ لا توجد مفاتيح تحتوي على نماذج متاحة للشركة: ${companyId}`);
      return null;

    } catch (error) {
      console.error('❌ خطأ في البحث عن مفتاح للتفعيل التلقائي:', error);
      return null;
    }
  }

  // تفعيل مفتاح معين
  async activateKey(keyId) {
    try {
      //console.log(`🔄 تفعيل المفتاح: ${keyId}`);
      
      // FIXED: Add company isolation to prevent affecting other companies
      // First get the company ID from the key
      const keyRecord = await this.prisma.geminiKey.findUnique({
        where: { id: keyId },
        select: { companyId: true }
      });

      if (!keyRecord) {
        throw new Error('Key not found');
      }

      // إلغاء تفعيل جميع المفاتيح للشركة فقط
      // SECURITY WARNING: Ensure companyId filter is included
      await this.prisma.geminiKey.updateMany({
        where: {
          companyId: keyRecord.companyId // Company isolation
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // تفعيل المفتاح المطلوب
      await this.prisma.geminiKey.update({
        where: {
          id: keyId
        },
        data: {
          isActive: true,
          updatedAt: new Date()
        }
      });
      
      //console.log(`✅ تم تفعيل المفتاح: ${keyId}`);
      return true;

    } catch (error) {
      console.error('❌ خطأ في تفعيل المفتاح:', error);
      return false;
    }
  }

  /**
   * Get AI settings
   */
  async getSettings(companyId) {
    try {
      //console.log('🔍 [aiAgentService] Loading settings from database...');

      // Require companyId for security
      if (!companyId) {
        console.error('❌ [SECURITY] companyId is required for getSettings');
        return {
          isEnabled: false,
          workingHours: { start: '09:00', end: '18:00' },
          workingHoursEnabled: false,
          maxRepliesPerCustomer: 5,
          multimodalEnabled: true,
          ragEnabled: true,
          learningEnabled: true
        };
      }

      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      //console.log(`🏢 [aiAgentService] Using specific company: ${companyId}`);
      if (!company) {
        //console.log('❌ [aiAgentService] No company found');
        return {
          isEnabled: false,
          workingHours: { start: '09:00', end: '18:00' },
          workingHoursEnabled: false,
          maxRepliesPerCustomer: 5,
          multimodalEnabled: true,
          ragEnabled: true,
          learningEnabled: true
        };
      }

      //console.log(`🏢 [aiAgentService] Company: ${company.id}`);

      // Get AI settings for the company
      const aiSettings = await this.prisma.aiSettings.findFirst({
        where: { companyId: company.id }
      });

      //console.log(`⚙️ [aiAgentService] AI Settings found: ${!!aiSettings}`);

      if (!aiSettings) {
        //console.log('❌ [aiAgentService] No AI settings found, returning defaults');
        return {
          isEnabled: false,
          workingHours: { start: '09:00', end: '18:00' },
          workingHoursEnabled: false,
          maxRepliesPerCustomer: 5,
          multimodalEnabled: true,
          ragEnabled: true,
          learningEnabled: true
        };
      }

      //console.log('🔍 [aiAgentService] Raw settings:', {
      //   autoReplyEnabled: aiSettings.autoReplyEnabled,
      //   workingHours: aiSettings.workingHours,
      //   maxRepliesPerCustomer: aiSettings.maxRepliesPerCustomer,
      //   multimodalEnabled: aiSettings.multimodalEnabled,
      //   ragEnabled: aiSettings.ragEnabled,
      //   hasPersonalityPrompt: !!aiSettings.personalityPrompt
      // });

      // Parse working hours
      let workingHours = { start: '09:00', end: '18:00' };
      try {
        if (aiSettings.workingHours) {
          workingHours = JSON.parse(aiSettings.workingHours);
          //console.log('✅ [aiAgentService] Working hours parsed:', workingHours);
        }
      } catch (e) {
        //console.log('⚠️ [aiAgentService] Failed to parse working hours, using defaults');
      }

      // Check if working hours are enabled (for now, disable working hours check)
      const workingHoursEnabled = false; // aiSettings.workingHoursEnabled || false;
      //console.log(`🕐 [aiAgentService] Working hours check ${workingHoursEnabled ? 'ENABLED' : 'DISABLED'} - AI will work ${workingHoursEnabled ? 'within working hours only' : '24/7'}`);

      const settings = {
        isEnabled: aiSettings.autoReplyEnabled || false,
        workingHours,
        workingHoursEnabled,
        maxRepliesPerCustomer: aiSettings.maxRepliesPerCustomer || 5,
        multimodalEnabled: aiSettings.multimodalEnabled || true,
        ragEnabled: aiSettings.ragEnabled || true,
        learningEnabled: true, // Always enabled for now
        maxMessagesPerConversation: 50 // Default memory limit
      };

      //console.log('📤 [aiAgentService] Returning settings:', settings);
      return settings;

    } catch (error) {
      console.error('❌ [aiAgentService] Error loading settings:', error);
      return {
        isEnabled: false,
        workingHours: { start: '09:00', end: '18:00' },
        workingHoursEnabled: false,
        maxRepliesPerCustomer: 5,
        multimodalEnabled: true,
        ragEnabled: true,
        learningEnabled: true
      };
    }
  }

  /**
   * جمع بيانات التعلم من التفاعل
   */
  async collectLearningData(interactionData) {
    try {
      const {
        companyId,
        customerId,
        conversationId,
        userMessage,
        aiResponse,
        intent,
        sentiment,
        processingTime,
        ragDataUsed,
        memoryUsed,
        model,
        confidence
      } = interactionData;

      // تحضير بيانات التعلم
      const learningData = {
        companyId,
        customerId,
        conversationId,
        type: 'conversation',
        data: {
          userMessage,
          aiResponse,
          intent,
          sentiment,
          processingTime,
          ragDataUsed,
          memoryUsed,
          model,
          confidence,
          timestamp: new Date()
        },
        outcome: this.determineOutcome(userMessage, aiResponse, intent),
        feedback: null // سيتم تحديثه لاحقاً عند وجود تغذية راجعة
      };

      // إرسال البيانات لخدمة التعلم المستمر
      const result = await this.learningService.collectLearningData(learningData);

      if (result.success) {
        //console.log(`✅ [AIAgent] Learning data collected successfully: ${result.data.id}`);
      } else {
        console.error(`❌ [AIAgent] Failed to collect learning data: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error('❌ [AIAgent] Error in collectLearningData:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * تحديد نتيجة التفاعل
   */
  determineOutcome(userMessage, aiResponse, intent) {
    const userLower = userMessage.toLowerCase();
    const responseLower = aiResponse.toLowerCase();

    // مؤشرات النجاح
    if (userLower.includes('شكرا') || userLower.includes('ممتاز') || userLower.includes('تمام')) {
      return 'satisfied';
    }

    // مؤشرات الشراء
    if (intent === 'purchase' || userLower.includes('أريد أشتري') || userLower.includes('هاخد')) {
      return 'purchase_intent';
    }

    // مؤشرات الحل
    if (intent === 'support' && (responseLower.includes('حل') || responseLower.includes('إجابة'))) {
      return 'resolved';
    }

    // مؤشرات عدم الرضا
    if (userLower.includes('مش فاهم') || userLower.includes('مش واضح') || userLower.includes('غلط')) {
      return 'unsatisfied';
    }

    // افتراضي
    return 'ongoing';
  }

  /**
   * تحديث بيانات التعلم مع التغذية الراجعة
   */
  async updateLearningDataWithFeedback(conversationId, feedback) {
    try {
      //console.log(`📝 [AIAgent] Updating learning data with feedback for conversation: ${conversationId}`);

      // البحث عن بيانات التعلم للمحادثة
      const learningData = await this.learningService.prisma.learningData.findFirst({
        where: {
          conversationId: conversationId,
          type: 'conversation'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (learningData) {
        // تحديث التغذية الراجعة
        await this.learningService.prisma.learningData.update({
          where: { id: learningData.id },
          data: {
            feedback: JSON.stringify(feedback),
            outcome: feedback.satisfactionScore > 3 ? 'satisfied' : 'unsatisfied'
          }
        });

        //console.log(`✅ [AIAgent] Learning data updated with feedback`);
        return { success: true };
      } else {
        //console.log(`⚠️ [AIAgent] No learning data found for conversation: ${conversationId}`);
        return { success: false, error: 'No learning data found' };
      }

    } catch (error) {
      console.error('❌ [AIAgent] Error updating learning data with feedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * مراقبة أداء التحسينات
   */
  async monitorImprovementPerformance(companyId) {
    try {
      //console.log(`📊 [AIAgent] Monitoring improvement performance for company: ${companyId}`);

      // الحصول على التحسينات النشطة
      const activeImprovements = await this.learningService.prisma.appliedImprovement.findMany({
        where: {
          companyId,
          status: 'active'
        }
      });

      // حساب مؤشرات الأداء لكل تحسين
      const performanceData = [];

      for (const improvement of activeImprovements) {
        const beforeMetrics = improvement.beforeMetrics ? JSON.parse(improvement.beforeMetrics) : {};
        const afterMetrics = improvement.afterMetrics ? JSON.parse(improvement.afterMetrics) : {};

        performanceData.push({
          improvementId: improvement.id,
          type: improvement.type,
          description: improvement.description,
          beforeMetrics,
          afterMetrics,
          improvement: this.calculateImprovement(beforeMetrics, afterMetrics),
          appliedAt: improvement.appliedAt,
          status: improvement.status
        });
      }

      return {
        success: true,
        data: performanceData,
        summary: {
          totalImprovements: activeImprovements.length,
          averageImprovement: this.calculateAverageImprovement(performanceData)
        }
      };

    } catch (error) {
      console.error('❌ [AIAgent] Error monitoring improvement performance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * حساب التحسن في المؤشرات
   */
  calculateImprovement(beforeMetrics, afterMetrics) {
    const improvements = {};

    // مقارنة المؤشرات المشتركة
    const commonMetrics = ['responseTime', 'satisfactionScore', 'resolutionRate'];

    commonMetrics.forEach(metric => {
      if (beforeMetrics[metric] && afterMetrics[metric]) {
        const before = parseFloat(beforeMetrics[metric]);
        const after = parseFloat(afterMetrics[metric]);

        if (metric === 'responseTime') {
          // للوقت، التحسن يعني انخفاض
          improvements[metric] = ((before - after) / before * 100).toFixed(2);
        } else {
          // للمؤشرات الأخرى، التحسن يعني زيادة
          improvements[metric] = ((after - before) / before * 100).toFixed(2);
        }
      }
    });

    return improvements;
  }

  /**
   * حساب متوسط التحسن
   */
  calculateAverageImprovement(performanceData) {
    if (performanceData.length === 0) return 0;

    let totalImprovement = 0;
    let count = 0;

    performanceData.forEach(data => {
      Object.values(data.improvement).forEach(value => {
        if (!isNaN(parseFloat(value))) {
          totalImprovement += parseFloat(value);
          count++;
        }
      });
    });

    return count > 0 ? (totalImprovement / count).toFixed(2) : 0;
  }

  // دالة موحدة ذكية للحصول على الرد والصور
  async getSmartResponse(customerMessage, intent, conversationMemory = [], customerId = null, companyId = null) {
    try {
      //console.log(`\n🧠 [SMART-RESPONSE] ===== بدء معالجة الطلب الموحد =====`);
      //console.log(`📝 [SMART-RESPONSE] رسالة العميل: "${customerMessage}"`);
      //console.log(`👤 [SMART-RESPONSE] معرف العميل: ${customerId}`);
      //console.log(`🏢 [SMART-RESPONSE] معرف الشركة: ${companyId}`);

      // فحص إذا كان العميل يطلب صور
      //console.log(`\n🔍 [SMART-RESPONSE] فحص إذا كان العميل يطلب صور...`);
      const wantsImages = await this.isCustomerRequestingImages(customerMessage, conversationMemory, companyId);
      //console.log(`🎯 [SMART-RESPONSE] نتيجة الفحص: ${wantsImages ? '✅ يريد صور' : '❌ لا يريد صور'}`);

      // الحصول على RAG data أولاً (سنحتاجها في جميع الحالات)
      const ragService = require('./ragService');
      let ragData = [];
      let productImages = [];

      if (wantsImages) {
        //console.log(`\n📸 [SMART-RESPONSE] العميل يريد صور - استخدام البحث الذكي للمنتجات...`);

        // استخدام النظام الذكي للمنتجات
        //console.log(`🔍 [SMART-RESPONSE] البحث عن منتج محدد...`);
        const specificResult = await ragService.retrieveSpecificProduct(customerMessage, intent, customerId, conversationMemory, companyId);
        //console.log(`📊 [SMART-RESPONSE] نتيجة البحث:`, {
        //   isSpecific: specificResult?.isSpecific,
        //   hasProduct: !!specificResult?.product,
        //   confidence: specificResult?.confidence,
        //   productName: specificResult?.product?.metadata?.name
        // });

        if (specificResult && specificResult.isSpecific && specificResult.product) {
          //console.log(`✅ [SMART-RESPONSE] تم العثور على منتج محدد: ${specificResult.product.metadata?.name} (${(specificResult.confidence * 100).toFixed(1)}%)`);

          // إنشاء الصور من المنتج المحدد
          if (specificResult.product.metadata?.images) {
            //console.log(`📸 [SMART-RESPONSE] المنتج يحتوي على ${specificResult.product.metadata.images.length} صورة`);

            const specificImages = specificResult.product.metadata.images.map((imageUrl, index) => ({
              type: 'image',
              payload: {
                url: imageUrl,
                title: `${specificResult.product.metadata.name} - صورة ${index + 1}`
              }
            }));

            //console.log(`🔧 [SMART-RESPONSE] تم إنشاء ${specificImages.length} صورة، بدء الفلترة...`);

            // فلترة الصور بناءً على اللون
            const filteredImages = await this.filterImagesByColor(specificImages, customerMessage);
            //console.log(`✅ [SMART-RESPONSE] تم فلترة الصور: ${filteredImages.length} من ${specificImages.length}`);

            productImages.push(...filteredImages);
          } else {
            //console.log(`⚠️ [SMART-RESPONSE] المنتج المحدد لا يحتوي على صور`);
          }

          // إنشاء RAG data للرد النصي
          ragData = [{
            type: 'product',
            content: `منتج متاح: ${specificResult.product.metadata.name}`,
            metadata: {
              ...specificResult.product.metadata,
              hasImages: productImages.length > 0,
              confidence: specificResult.confidence,
              reasoning: specificResult.reasoning
            }
          }];

          //console.log(`\n🎉 [SMART-RESPONSE] ===== إرجاع النتيجة من المنتج المحدد =====`);
          //console.log(`📸 [SMART-RESPONSE] عدد الصور: ${productImages.length}`);
          productImages.forEach((img, index) => {
            //console.log(`   📸 ${index + 1}. ${img.payload?.title}`);
          });

          return {
            images: productImages,
            ragData: ragData,
            hasSpecificProduct: true,
            productInfo: specificResult
          };
        } else {
          //console.log(`⚠️ [SMART-RESPONSE] No specific product found, searching in general RAG data...`);

          // البحث في RAG data العامة عن منتجات بصور
          ragData = await ragService.retrieveRelevantData(customerMessage, intent, customerId, companyId);
          //console.log(`🔧 [SMART-RESPONSE] تمرير Company ID للاستخراج: ${companyId}`);
          productImages = await this.extractImagesFromRAGData(ragData, customerMessage, companyId);

          if (productImages.length > 0) {
            //console.log(`📸 [SMART-RESPONSE] Found ${productImages.length} images from general RAG data`);
            return {
              images: productImages,
              ragData: ragData,
              hasSpecificProduct: false,
              productInfo: null
            };
          } else {
            //console.log(`⚠️ [SMART-RESPONSE] No images found in RAG data`);

            // لا نرسل صور افتراضية أو احتياطية
            // بدلاً من ذلك، نضيف رسالة توضيحية في RAG data
            ragData.push({
              type: 'system_message',
              content: 'العميل طلب صور لكن لا توجد صور متاحة حالياً للمنتجات المطلوبة',
              metadata: {
                customerRequestedImages: true,
                noImagesAvailable: true,
                searchedProducts: true
              }
            });

            //console.log(`📝 [SMART-RESPONSE] Added explanation message - no images available`);
          }
        }
      } else {
        // العميل لا يطلب صور - رد نصي فقط
        //console.log(`📝 [SMART-RESPONSE] Customer does not want images, providing text-only response`);
        ragData = await ragService.retrieveRelevantData(customerMessage, intent, customerId, companyId);

        // لا نرسل صور إلا إذا طلبها العميل صراحة
        //console.log(`✅ [SMART-RESPONSE] Text-only response prepared with ${ragData.length} RAG items`);
      }

      // النتيجة النهائية: رد نصي فقط بدون صور
      //console.log(`📝 [SMART-RESPONSE] Returning text-only response with ${ragData.length} RAG items`);
      return {
        images: [],
        ragData: ragData,
        hasSpecificProduct: false,
        productInfo: null
      };

    } catch (error) {
      console.error(`❌ [SMART-RESPONSE] Error in unified response:`, error);

      // Fallback آمن
      try {
        const ragData = await this.ragService.retrieveRelevantData(customerMessage, intent, customerId, companyId);
        return {
          images: [],
          ragData: ragData,
          hasSpecificProduct: false,
          productInfo: null
        };
      } catch (fallbackError) {
        console.error(`❌ [SMART-RESPONSE] Fallback also failed:`, fallbackError);
        return {
          images: [],
          ragData: [],
          hasSpecificProduct: false,
          productInfo: null
        };
      }
    }
  }

  // 🧠 استخراج الصور من RAG data بذكاء
  async extractImagesFromRAGData(ragData, customerMessage, companyId = null) {
    try {
      //console.log(`🧠 [SMART-IMAGE-EXTRACT] ===== بدء استخراج الصور الذكي =====`);
      //console.log(`📊 [SMART-IMAGE-EXTRACT] عدد عناصر RAG: ${ragData.length}`);
      //console.log(`📝 [SMART-IMAGE-EXTRACT] رسالة العميل: "${customerMessage}"`);
      //console.log(`🏢 [SMART-IMAGE-EXTRACT] معرف الشركة: ${companyId}`);

      if (ragData.length === 0) {
        //console.log(`⚠️ [SMART-IMAGE-EXTRACT] لا توجد بيانات RAG متاحة`);
        return [];
      }

      // استخدام AI لتحديد أفضل منتج مطابق للطلب
      const productAnalysisPrompt = `
أنت خبير في مطابقة طلبات العملاء مع المنتجات المتاحة.

طلب العميل: "${customerMessage}"

المنتجات المتاحة:
${ragData.filter(item => item.type === 'product' && item.metadata)
  .map((item, index) => `${index + 1}. ${item.metadata.name || 'منتج'} - ${item.content || 'لا يوجد وصف'}`)
  .join('\n')}

حدد أفضل منتج يطابق طلب العميل:
- إذا كان هناك منتج مطابق بوضوح، اذكر رقمه
- إذا لم يكن هناك مطابقة واضحة، قل "لا يوجد"

الرد:`;

      //console.log(`🤖 [SMART-IMAGE-EXTRACT] إرسال طلب للذكاء الاصطناعي لاختيار المنتج...`);
      //console.log(`🏢 [SMART-IMAGE-EXTRACT] Company ID المرسل: ${companyId}`);
      //console.log(`🔍 [SMART-IMAGE-EXTRACT] معاملات generateAIResponse:`, {
      //   hasPrompt: !!productAnalysisPrompt,
      //   promptLength: productAnalysisPrompt.length,
      //   companyId: companyId
      // });

      const aiResponse = await this.generateAIResponse(productAnalysisPrompt, [], false, null, companyId);
      //console.log(`📥 [SMART-IMAGE-EXTRACT] رد الذكاء الاصطناعي: "${aiResponse}"`);
      const responseText = aiResponse.trim().toLowerCase();

      let selectedProduct = null;

      // البحث عن رقم المنتج في الرد
      const numberMatch = responseText.match(/(\d+)/);
      if (numberMatch && !responseText.includes('لا يوجد')) {
        const productIndex = parseInt(numberMatch[1]) - 1;
        const productItems = ragData.filter(item => item.type === 'product' && item.metadata);

        if (productIndex >= 0 && productIndex < productItems.length) {
          selectedProduct = productItems[productIndex];
          //console.log(`🎯 [SMART-IMAGE-EXTRACT] AI selected product: ${selectedProduct.metadata.name || 'منتج'}`);
        }
      }

      // إذا لم يجد AI منتج مطابق، استخدم أول منتج بصور
      if (!selectedProduct) {
        //console.log(`🔍 [SMART-IMAGE-EXTRACT] No specific match, looking for first product with images...`);
        selectedProduct = ragData.find(item =>
          item.type === 'product' &&
          item.metadata &&
          (item.metadata.hasValidImages || (item.metadata.images?.length > 0))
        );
      }

      if (!selectedProduct) {
        //console.log(`⚠️ [SMART-IMAGE-EXTRACT] No products with images found`);
        return [];
      }

      // استخراج الصور من المنتج المختار
      let productImages = [];

      // أولاً: فحص صور المتغيرات (أولوية للألوان المحددة)
      if (selectedProduct.metadata.variants && selectedProduct.metadata.variants.length > 0) {
        //console.log(`🎨 [SMART-IMAGE-EXTRACT] Checking ${selectedProduct.metadata.variants.length} variants for images...`);

        for (const variant of selectedProduct.metadata.variants) {
          if (variant.images && variant.images.length > 0) {
            //console.log(`📸 [SMART-IMAGE-EXTRACT] Found ${variant.images.length} images for variant: ${variant.name}`);

            variant.images.forEach((imageUrl, index) => {
              productImages.push({
                type: 'image',
                payload: {
                  url: imageUrl,
                  title: `${selectedProduct.metadata.name || 'منتج'} - اللون ${variant.name}`,
                  variantName: variant.name,
                  variantType: variant.type
                }
              });
            });
          }
        }
      }

      // ثانياً: إذا لم نجد صور في المتغيرات، استخدم صور المنتج العامة
      if (productImages.length === 0) {
        const hasValidImages = selectedProduct.metadata.hasValidImages ?? (selectedProduct.metadata.images?.length > 0);
        const validImages = selectedProduct.metadata.images || [];

        if (hasValidImages && validImages.length > 0) {
          //console.log(`📸 [SMART-IMAGE-EXTRACT] Found ${validImages.length} general product images`);

          productImages = validImages.slice(0, 3).map((imageUrl, index) => ({
            type: 'image',
            payload: {
              url: imageUrl,
              title: `${selectedProduct.metadata.name || 'منتج'} - صورة ${index + 1}`
            }
          }));
        }
      }

      if (productImages.length === 0) {
        //console.log(`⚠️ [SMART-IMAGE-EXTRACT] No images found in variants or general product`);
        return [];
      }

      //console.log(`📸 [SMART-IMAGE-EXTRACT] Total images found: ${productImages.length}`);

      // فلترة الصور بناءً على اللون إذا طلب العميل لون محدد
      const filteredImages = await this.filterImagesByColor(productImages, customerMessage);

      //console.log(`✅ [SMART-IMAGE-EXTRACT] Returning ${filteredImages.length} relevant images`);
      return filteredImages;

    } catch (error) {
      console.error(`❌ [SMART-IMAGE-EXTRACT] Error in intelligent image extraction:`, error);
      //console.log(`🔍 [SMART-IMAGE-EXTRACT] Error details:`, {
      //   message: error.message,
      //   companyId: companyId,
      //   hasRagData: !!ragData,
      //   ragDataLength: ragData?.length || 0
      // });

      // في حالة الخطأ، نحاول إرجاع صور بديلة بسيطة
      try {
        //console.log(`🔄 [SMART-IMAGE-EXTRACT] Attempting fallback image extraction...`);
        const fallbackImages = ragData?.filter(item =>
          item.type === 'product' &&
          item.metadata?.images?.length > 0
        ).slice(0, 1).flatMap(item =>
          item.metadata.images.slice(0, 2).map(imageUrl => ({
            type: 'image',
            payload: {
              url: imageUrl,
              title: item.metadata.name || 'منتج'
            }
          }))
        ) || [];

        //console.log(`🔄 [SMART-IMAGE-EXTRACT] Fallback returned ${fallbackImages.length} images`);
        return fallbackImages;
      } catch (fallbackError) {
        console.error(`❌ [SMART-IMAGE-EXTRACT] Fallback also failed:`, fallbackError);
        return [];
      }
    }
  }

  // ❌ معطل - لا نستخدم صور احتياطية بعد الآن
  async getFallbackProductImages(customerMessage, intent) {
    //console.log(`⚠️ [FALLBACK-IMAGES] Fallback images disabled - only send images when customer explicitly requests them`);
    return [];
  }

  // فلترة الصور بناءً على اللون المطلوب
  async filterImagesByColor(images, customerMessage) {
    try {
      //console.log(`🎨 [COLOR-FILTER] ===== بدء فلترة الصور =====`);
      //console.log(`📝 [COLOR-FILTER] رسالة العميل: "${customerMessage}"`);
      //console.log(`📸 [COLOR-FILTER] عدد الصور المدخلة: ${images.length}`);

      // طباعة تفاصيل الصور المدخلة
      images.forEach((img, index) => {
        // //console.log(`📸 [COLOR-FILTER] صورة ${index + 1}:`, {
        //   title: img.payload?.title || 'لا يوجد عنوان',
        //   variantName: img.payload?.variantName || 'لا يوجد متغير',
        //   url: img.payload?.url?.substring(0, 50) + '...' || 'لا يوجد رابط'
        // });
      });

      // كشف الألوان المطلوبة (محدث ليشمل الألف واللام)
      const colorKeywords = {
        'ابيض': ['أبيض', 'ابيض', 'الابيض', 'الأبيض', 'white'],
        'اسود': ['أسود', 'اسود', 'الاسود', 'الأسود', 'black'],
        'احمر': ['أحمر', 'احمر', 'الاحمر', 'الأحمر', 'red'],
        'ازرق': ['أزرق', 'ازرق', 'الازرق', 'الأزرق', 'blue'],
        'اخضر': ['أخضر', 'اخضر', 'الاخضر', 'الأخضر', 'green'],
        'اصفر': ['أصفر', 'اصفر', 'الاصفر', 'الأصفر', 'yellow'],
        'بني': ['بني', 'البني', 'brown'],
        'رمادي': ['رمادي', 'الرمادي', 'gray', 'grey'],
        'بيج': ['بيج', 'البيج', 'beige']
      };

      const normalizedMessage = customerMessage.toLowerCase();
      //console.log(`🔤 [COLOR-FILTER] الرسالة بعد التطبيع: "${normalizedMessage}"`);

      let requestedColor = null;

      // البحث عن اللون المطلوب
      //console.log(`🔍 [COLOR-FILTER] البحث عن الألوان في الرسالة...`);
      for (const [color, variants] of Object.entries(colorKeywords)) {
        //console.log(`🔍 [COLOR-FILTER] فحص اللون: ${color} - الكلمات: [${variants.join(', ')}]`);

        const found = variants.some(variant => {
          const includes = normalizedMessage.includes(variant.toLowerCase());
          //console.log(`   - فحص "${variant}": ${includes}`);
          return includes;
        });

        if (found) {
          requestedColor = color;
          //console.log(`✅ [COLOR-FILTER] تم اكتشاف طلب اللون: ${color}`);
          break;
        }
      }

      // إذا لم يتم طلب لون محدد، أرجع جميع الصور
      if (!requestedColor) {
        //console.log(`⚠️ [COLOR-FILTER] لم يتم طلب لون محدد، إرجاع جميع الصور (${images.length})`);
        return images;
      }

      //console.log(`🎯 [COLOR-FILTER] اللون المطلوب: ${requestedColor}`);
      //console.log(`🔍 [COLOR-FILTER] بدء فلترة الصور بناءً على اللون...`);

      // 🔍 البحث عن صور تحتوي على اللون المطلوب
      let filteredImages = images.filter((image, index) => {
        //console.log(`\n🔍 [COLOR-FILTER] فحص الصورة ${index + 1}:`);

        const title = image.payload.title.toLowerCase();
        const url = image.payload.url.toLowerCase();
        const variantName = image.payload.variantName?.toLowerCase() || '';

        //console.log(`   📝 العنوان: "${title}"`);
        //console.log(`   🔗 الرابط: "${url.substring(0, 50)}..."`);
        //console.log(`   🎨 اسم المتغير: "${variantName}"`);

        // البحث عن اللون في العنوان، الرابط، أو اسم المتغير
        const colorVariants = colorKeywords[requestedColor];
        //console.log(`   🔍 البحث عن: [${colorVariants.join(', ')}]`);

        let matched = false;
        const matchResults = [];

        const foundMatch = colorVariants.some(variant => {
          const variantLower = variant.toLowerCase();
          const titleMatch = title.includes(variantLower);
          const urlMatch = url.includes(variantLower);
          const variantMatch = variantName.includes(variantLower) || variantName === variantLower;

          //console.log(`     - فحص "${variant}": العنوان=${titleMatch}, الرابط=${urlMatch}, المتغير=${variantMatch}`);

          if (titleMatch || urlMatch || variantMatch) {
            matched = true;
            matchResults.push(`${variant} (${titleMatch ? 'عنوان' : ''}${urlMatch ? 'رابط' : ''}${variantMatch ? 'متغير' : ''})`);
          }

          return titleMatch || urlMatch || variantMatch;
        });

        //console.log(`   ${matched ? '✅' : '❌'} النتيجة: ${matched ? 'مطابق' : 'غير مطابق'}`);
        if (matched) {
          //console.log(`   🎯 المطابقات: ${matchResults.join(', ')}`);
        }

        return foundMatch;
      });

      //console.log(`\n📊 [COLOR-FILTER] نتائج الفلترة الأولية:`);
      //console.log(`✅ [COLOR-FILTER] تم العثور على ${filteredImages.length} صورة مطابقة للون: ${requestedColor}`);

      filteredImages.forEach((img, index) => {
        //console.log(`   📸 ${index + 1}. ${img.payload?.title} (${img.payload?.variantName})`);
      });

      // إذا لم نجد صور بالون المطلوب، نبحث في قاعدة البيانات
      if (filteredImages.length === 0) {
        //console.log(`\n🔍 [COLOR-FILTER] لم يتم العثور على صور بالون ${requestedColor} في العناوين/الروابط`);
        //console.log(`🔍 [COLOR-FILTER] البحث في قاعدة البيانات...`);

        // محاولة البحث في قاعدة البيانات عن منتجات بالون المطلوب
        filteredImages = await this.searchImagesByColorInDatabase(requestedColor, images);

        //console.log(`📊 [COLOR-FILTER] نتائج البحث في قاعدة البيانات: ${filteredImages.length} صورة`);
      }

      // إذا لم نجد أي صور بالون المطلوب، نرجع رسالة توضيحية
      if (filteredImages.length === 0) {
        //console.log(`\n❌ [COLOR-FILTER] لم يتم العثور على أي صور للون: ${requestedColor}`);
        //console.log(`🤐 [SILENT-MODE] النظام الصامت - لن يتم إرسال رسالة خطأ للعميل`);
        //console.log(`🎨 [COLOR-FILTER] ===== انتهاء الفلترة - نتيجة فارغة =====`);
        return []; // إرجاع مصفوفة فارغة بدلاً من رسالة خطأ
      }

      // تحديث عناوين الصور المفلترة
      //console.log(`\n🔧 [COLOR-FILTER] تحديث عناوين الصور المفلترة...`);
      filteredImages.forEach((image, index) => {
        if (image.payload && image.payload.title) {
          const originalTitle = image.payload.title;
          // إضافة اللون للعنوان إذا لم يكن موجود
          if (!image.payload.title.toLowerCase().includes(requestedColor)) {
            image.payload.title += ` - اللون ${requestedColor}`;
            //console.log(`   📝 تحديث العنوان ${index + 1}: "${originalTitle}" → "${image.payload.title}"`);
          } else {
            //console.log(`   ✅ العنوان ${index + 1} يحتوي على اللون بالفعل: "${originalTitle}"`);
          }
        }
      });

      //console.log(`\n🎉 [COLOR-FILTER] ===== انتهاء الفلترة بنجاح =====`);
      //console.log(`✅ [COLOR-FILTER] النتيجة النهائية: ${filteredImages.length} صورة للون ${requestedColor}`);

      filteredImages.forEach((img, index) => {
        //console.log(`   📸 ${index + 1}. ${img.payload?.title}`);
        //console.log(`      🔗 ${img.payload?.url?.substring(0, 60)}...`);
      });

      return filteredImages;

    } catch (error) {
      console.error('❌ [COLOR-FILTER] Error filtering images by color:', error);
      return images; // في حالة الخطأ، أرجع جميع الصور
    }
  }

  /**
   * 🔍 البحث عن صور بلون محدد في قاعدة البيانات
   */
  async searchImagesByColorInDatabase(requestedColor, fallbackImages) {
    try {
      //console.log(`\n🔍 [DB-COLOR-SEARCH] ===== بدء البحث في قاعدة البيانات =====`);
      //console.log(`🎨 [DB-COLOR-SEARCH] البحث عن منتجات باللون: ${requestedColor}`);
      //console.log(`📦 [DB-COLOR-SEARCH] عدد الصور الاحتياطية: ${fallbackImages.length}`);

      // البحث في قاعدة البيانات عن منتجات بالون المطلوب
      const colorVariants = {
        'ابيض': ['أبيض', 'ابيض', 'الابيض', 'الأبيض', 'white', 'White'],
        'اسود': ['أسود', 'اسود', 'الاسود', 'الأسود', 'black', 'Black'],
        'احمر': ['أحمر', 'احمر', 'الاحمر', 'الأحمر', 'red', 'Red'],
        'ازرق': ['أزرق', 'ازرق', 'الازرق', 'الأزرق', 'blue', 'Blue'],
        'اخضر': ['أخضر', 'اخضر', 'الاخضر', 'الأخضر', 'green', 'Green'],
        'اصفر': ['أصفر', 'اصفر', 'الاصفر', 'الأصفر', 'yellow', 'Yellow'],
        'بني': ['بني', 'البني', 'brown', 'Brown'],
        'رمادي': ['رمادي', 'الرمادي', 'gray', 'grey', 'Gray', 'Grey'],
        'بيج': ['بيج', 'البيج', 'beige', 'Beige']
      };

      const searchTerms = colorVariants[requestedColor] || [requestedColor];

      // البحث في جدول المنتجات والمتغيرات
      const products = await this.prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: searchTerms[0] } },
            { name: { contains: searchTerms[1] } },
            { description: { contains: searchTerms[0] } },
            { description: { contains: searchTerms[1] } },
            // البحث في المتغيرات
            {
              variants: {
                some: {
                  type: 'color',
                  name: { in: searchTerms },
                  isActive: true
                }
              }
            }
          ],
          isActive: true
        },
        include: {
          variants: {
            where: {
              type: 'color',
              name: { in: searchTerms },
              isActive: true
            }
          }
        },
        take: 3
      });

      const colorImages = [];

      for (const product of products) {
        // فحص المتغيرات أولاً (أولوية للألوان المحددة)
        if (product.variants && product.variants.length > 0) {
          for (const variant of product.variants) {
            if (variant.images) {
              try {
                const variantImages = JSON.parse(variant.images);
                if (Array.isArray(variantImages) && variantImages.length > 0) {
                  variantImages.forEach((imageUrl) => {
                    colorImages.push({
                      type: 'image',
                      payload: {
                        url: imageUrl,
                        title: `${product.name} - اللون ${variant.name}`
                      }
                    });
                  });
                }
              } catch (parseError) {
                //console.log(`⚠️ [DB-COLOR-SEARCH] Failed to parse variant images for ${product.name}`);
              }
            }
          }
        }

        // إذا لم نجد صور في المتغيرات، فحص صور المنتج العامة
        if (colorImages.length === 0) {
          if (product.images) {
            try {
              const parsedImages = JSON.parse(product.images);
              if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                parsedImages.forEach((imageUrl, index) => {
                  colorImages.push({
                    type: 'image',
                    payload: {
                      url: imageUrl,
                      title: `${product.name} - اللون ${requestedColor}`
                    }
                  });
                });
              }
            } catch (parseError) {
              //console.log(`⚠️ [DB-COLOR-SEARCH] Failed to parse images for ${product.name}`);
            }
          }

          // فحص صورة واحدة
          if (product.imageUrl && colorImages.length < 3) {
            colorImages.push({
              type: 'image',
              payload: {
                url: product.imageUrl,
                title: `${product.name} - اللون ${requestedColor}`
              }
            });
          }
        }
      }

      if (colorImages.length > 0) {
        //console.log(`✅ [DB-COLOR-SEARCH] Found ${colorImages.length} images for color ${requestedColor}`);
        return colorImages.slice(0, 3); // أقصى 3 صور
      }

      //console.log(`❌ [DB-COLOR-SEARCH] No products found for color ${requestedColor}`);
      return [];

    } catch (error) {
      console.error('❌ [DB-COLOR-SEARCH] Database search failed:', error);
      return [];
    }
  }

  /**
   * Update AI settings in database
   */
  async updateSettings(settings, companyId) {
    try {
      //console.log('🔧 [AIAgent] Updating AI settings:', settings);

      // Require companyId for security
      if (!companyId) {
        throw new Error('Company ID is required for security');
      }

      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        throw new Error(`Company ${companyId} not found`);
      }

      // Check if AI settings exist
      let aiSettings = await this.prisma.aiSettings.findUnique({
        where: { companyId: company.id }
      });

      if (aiSettings) {
        // Update existing settings
        aiSettings = await this.prisma.aiSettings.update({
          where: { companyId: company.id },
          data: {
            autoReplyEnabled: settings.isEnabled !== undefined ? settings.isEnabled : aiSettings.autoReplyEnabled,
            workingHours: settings.workingHours ? JSON.stringify(settings.workingHours) : aiSettings.workingHours,
            workingHoursEnabled: settings.workingHoursEnabled !== undefined ? settings.workingHoursEnabled : aiSettings.workingHoursEnabled,
            maxRepliesPerCustomer: settings.maxRepliesPerCustomer !== undefined ? settings.maxRepliesPerCustomer : aiSettings.maxRepliesPerCustomer,
            multimodalEnabled: settings.multimodalEnabled !== undefined ? settings.multimodalEnabled : aiSettings.multimodalEnabled,
            ragEnabled: settings.ragEnabled !== undefined ? settings.ragEnabled : aiSettings.ragEnabled,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new settings
        aiSettings = await this.prisma.aiSettings.create({
          data: {
            companyId: company.id,
            autoReplyEnabled: settings.isEnabled || false,
            workingHours: settings.workingHours ? JSON.stringify(settings.workingHours) : JSON.stringify({ start: '09:00', end: '18:00' }),
            workingHoursEnabled: settings.workingHoursEnabled || false,
            maxRepliesPerCustomer: settings.maxRepliesPerCustomer || 5,
            multimodalEnabled: settings.multimodalEnabled !== undefined ? settings.multimodalEnabled : true,
            ragEnabled: settings.ragEnabled !== undefined ? settings.ragEnabled : true
          }
        });
      }

      //console.log('✅ [AIAgent] AI settings updated successfully');
      return aiSettings;

    } catch (error) {
      console.error('❌ [AIAgent] Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Get AI settings from database
   */
  async getSettings(companyId) {
    try {
      // Require companyId for security
      if (!companyId) {
        console.error('❌ [SECURITY] companyId is required for getSettings');
        return this.getDefaultSettings();
      }

      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        //console.log(`❌ [aiAgentService] Company ${companyId} not found`);
        return this.getDefaultSettings();
      }

      //console.log('🏢 [aiAgentService] Company:', company.id);

      const aiSettings = await this.prisma.aiSettings.findUnique({
        where: { companyId: company.id }
      });

      //console.log('⚙️ [aiAgentService] AI Settings found:', !!aiSettings);

      if (!aiSettings) {
        //console.log('❌ [aiAgentService] No AI settings found, returning defaults');
        return this.getDefaultSettings();
      }

      return {
        isEnabled: aiSettings.autoReplyEnabled,
        workingHours: aiSettings.workingHours ? JSON.parse(aiSettings.workingHours) : { start: '09:00', end: '18:00' },
        workingHoursEnabled: aiSettings.workingHoursEnabled,
        maxRepliesPerCustomer: aiSettings.maxRepliesPerCustomer,
        multimodalEnabled: aiSettings.multimodalEnabled,
        ragEnabled: aiSettings.ragEnabled,
        learningEnabled: true // Default since it's not in schema
      };

    } catch (error) {
      console.error('❌ [aiAgentService] Error loading settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Get default AI settings
   */
  getDefaultSettings() {
    return {
      isEnabled: false,
      workingHours: { start: '09:00', end: '18:00' },
      workingHoursEnabled: false,
      maxRepliesPerCustomer: 5,
      multimodalEnabled: true,
      ragEnabled: true,
      learningEnabled: true
    };
  }

  /**
   * تحديد ما إذا كانت الرسالة عاجلة
   * @param {string} message - نص الرسالة
   * @returns {boolean} - هل الرسالة عاجلة
   */
  isUrgentMessage(message) {
    const urgentKeywords = [
      'عاجل', 'ضروري', 'مستعجل', 'فوري', 'سريع',
      'urgent', 'emergency', 'asap', 'critical',
      'مشكلة', 'خطأ', 'عطل', 'لا يعمل',
      'problem', 'error', 'issue', 'not working',
      'كسر', 'تلف', 'فشل', 'توقف',
      'broken', 'damaged', 'failed', 'stopped'
    ];

    const lowerMessage = message.toLowerCase();
    return urgentKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

module.exports = new AIAgentService();
