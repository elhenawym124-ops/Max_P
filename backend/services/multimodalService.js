const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class MultimodalService {
  constructor() {
    // سيتم تهيئة Gemini عند الحاجة من قاعدة البيانات
    this.genAI = null;
    this.visionModel = null;
    this.textModel = null;
  }

  async initializeGemini(companyId = null) {
    try {
      //console.log('🔧 [MULTIMODAL] Initializing Gemini for image processing...');
      //console.log('🔧 [MULTIMODAL] CompanyId received:', companyId);

      // استخدام نفس نظام المفاتيح المستخدم في aiAgentService
      const aiAgentService = require('./aiAgentService');

      // الحصول على مفتاح Gemini من نظام إدارة المفاتيح المتقدم
      let geminiConfig;
      try {
        //console.log('🔧 [MULTIMODAL] Getting Gemini key from advanced key management system...');
        //console.log('🏢 [MULTIMODAL] Company ID:', companyId);

        if (!companyId) {
          throw new Error('Company ID is required for security - no fallback allowed');
        }

        geminiConfig = await aiAgentService.getCurrentActiveModel(companyId);
        //console.log('✅ [MULTIMODAL] Got Gemini config from database:', geminiConfig ? 'SUCCESS' : 'NULL');

        if (!geminiConfig) {
          throw new Error('No active Gemini key found for this company in database');
        }

      } catch (error) {
        console.error('❌ [MULTIMODAL] Failed to get Gemini key from advanced system:', error.message);
        console.error('🚫 [MULTIMODAL] No fallback allowed - using advanced key management only');
        return false;
      }

      if (!geminiConfig) {
        //console.log('❌ [MULTIMODAL] No active Gemini key available for image processing');
        return false;
      }

      //console.log(`✅ [MULTIMODAL] Using model: ${geminiConfig.model} from key: ${geminiConfig.keyId}`);

      // إجبار استخدام gemini-2.5-flash للاختبار
      const testModel = 'gemini-2.5-flash';
      //console.log(`🧪 [MULTIMODAL] TESTING: Forcing model to ${testModel} for prohibited content issue`);

      // تهيئة Gemini باستخدام المفتاح النشط
      this.genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
      this.visionModel = this.genAI.getGenerativeModel({ model: testModel });
      this.textModel = this.genAI.getGenerativeModel({ model: testModel });

      //console.log('✅ [MULTIMODAL] Gemini Vision initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ [MULTIMODAL] Error initializing Gemini:', error);
      return false;
    }
  }

  async getAvailableProducts(companyId = null) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // 🔐 فلترة المنتجات حسب الشركة
      const whereClause = { isActive: true };
      if (companyId) {
        whereClause.companyId = companyId;
        //console.log(`🔐 [MULTIMODAL] Filtering products for company: ${companyId}`);
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          variants: {
            where: { isActive: true }
          }
        }
      });

      let productsList = '';
      products.forEach(product => {
        productsList += `- ${product.name}: ${product.price} جنيه\n`;
        if (product.description) {
          productsList += `  الوصف: ${product.description}\n`;
        }
        if (product.variants && product.variants.length > 0) {
          productsList += `  الألوان/الأنواع المتاحة:\n`;
          product.variants.forEach(variant => {
            productsList += `    * ${variant.name}: ${variant.price} جنيه\n`;
          });
        }
        productsList += '\n';
      });

      await prisma.$disconnect();
      return productsList || 'لا توجد منتجات متاحة حالياً';
    } catch (error) {
      console.error('❌ Error getting available products:', error);
      return 'خطأ في الحصول على المنتجات المتاحة';
    }
  }

  // دالة للحصول على المنتجات كـ array للمقارنة
  async getProductsArray(companyId = null) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // 🔐 فلترة المنتجات حسب الشركة
      const whereClause = { isActive: true };
      if (companyId) {
        whereClause.companyId = companyId;
        //console.log(`🔐 [MULTIMODAL] Filtering products array for company: ${companyId}`);
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          variants: {
            where: { isActive: true }
          },
          category: true
        }
      });

      await prisma.$disconnect();
      return products;
    } catch (error) {
      console.error('❌ [MULTIMODAL] Error getting products array:', error);
      return [];
    }
  }

  async detectMessageType(messageData) {
    // تحديد نوع الرسالة بناءً على المحتوى
    if (messageData.attachments && messageData.attachments.length > 0) {
      const attachment = messageData.attachments[0];
      
      if (attachment.type === 'image') {
        return 'image';
      } else if (attachment.type === 'audio') {
        return 'voice';
      } else if (attachment.type === 'video') {
        return 'video';
      } else if (attachment.type === 'file') {
        return 'file';
      }
    }
    
    return 'text';
  }

  async processImage(messageData) {
    const startTime = Date.now();
    try {
      //console.log('🖼️ [MULTIMODAL] Starting image processing...');
      //console.log('⏱️ [MULTIMODAL] Start time:', new Date().toISOString());
      //console.log('🖼️ [MULTIMODAL] Message data:', JSON.stringify(messageData, null, 2));

      // تهيئة Gemini إذا لم يكن مُهيأ
      const companyId = messageData.companyId || messageData.customerData?.companyId;
      //console.log('🔍 [MULTIMODAL] CompanyId extracted:', companyId);
      //console.log('🔍 [MULTIMODAL] messageData.companyId:', messageData.companyId);
      //console.log('🔍 [MULTIMODAL] messageData.customerData?.companyId:', messageData.customerData?.companyId);

      const initialized = await this.initializeGemini(companyId);

      if (!initialized || !this.visionModel) {
        //console.log('❌ [MULTIMODAL] Vision model not available');
        return {
          type: 'image_error',
          originalMessage: messageData.content || 'صورة',
          processedContent: 'عذراً، خدمة تحليل الصور غير متاحة حالياً. يمكنك وصف ما تريده بالكلمات؟'
        };
      }

      if (!messageData.attachments || messageData.attachments.length === 0) {
        //console.log('❌ [MULTIMODAL] No attachments found in message data');
        return {
          type: 'image_error',
          originalMessage: messageData.content || 'صورة',
          processedContent: 'عذراً، لم أتمكن من العثور على الصورة. يرجى إعادة إرسالها.'
        };
      }

      // 🆕 دعم صور متعددة
      const imageAttachments = messageData.attachments.filter(att => 
        att.type === 'image' || (att.payload && att.payload.url)
      );

      console.log(`🖼️ [MULTIMODAL] Processing ${imageAttachments.length} image(s)...`);

      // معالجة جميع الصور
      const imageParts = [];
      const imageUrls = [];

      for (let i = 0; i < imageAttachments.length; i++) {
        const attachment = imageAttachments[i];
        console.log(`🖼️ [MULTIMODAL] Processing image ${i + 1}/${imageAttachments.length}`);

        // دعم كلا التنسيقين: البيانات الخام من Facebook والبيانات المُعالجة
        let imageUrl = null;

        if (attachment.payload && attachment.payload.url) {
          // تنسيق Facebook الخام
          imageUrl = attachment.payload.url;
        } else if (attachment.url) {
          // تنسيق البيانات المُعالجة
          imageUrl = attachment.url;
        }

        if (!imageUrl) {
          console.log(`⚠️ [MULTIMODAL] No URL found for image ${i + 1}, skipping...`);
          continue;
        }

        console.log(`🖼️ [MULTIMODAL] Image ${i + 1} URL:`, imageUrl);
        imageUrls.push(imageUrl);
        
        // تحميل الصورة
        try {
          const imageBuffer = await this.downloadImage(imageUrl);
          console.log(`✅ [MULTIMODAL] Image ${i + 1} downloaded, size:`, imageBuffer.length, 'bytes');

          // تحويل الصورة إلى base64
          const base64Image = imageBuffer.toString('base64');
          
          imageParts.push({
            inlineData: {
              data: base64Image,
              mimeType: attachment.type === 'image' ? 'image/jpeg' : 'image/png'
            }
          });
        } catch (error) {
          console.error(`❌ [MULTIMODAL] Error processing image ${i + 1}:`, error.message);
        }
      }

      if (imageParts.length === 0) {
        return {
          type: 'image_error',
          originalMessage: messageData.content || 'صورة',
          processedContent: 'عذراً، لم أتمكن من معالجة الصور. يرجى إعادة إرسالها.'
        };
      }

      console.log(`✅ [MULTIMODAL] Successfully processed ${imageParts.length} image(s)`);

      // الحصول على المنتجات المتاحة للمقارنة
      //console.log('📦 [MULTIMODAL] Getting available products...');
      const availableProductsText = await this.getAvailableProducts(companyId);
      const availableProducts = await this.getProductsArray(companyId);
      //console.log('✅ [MULTIMODAL] Retrieved products for comparison');

      // تحليل الصور باستخدام Gemini Vision مع prompt مخصص للشركة
      const promptText = imageParts.length > 1 
        ? `${await this.buildImageAnalysisPrompt(companyId, availableProductsText)}\n\n📸 ملاحظة: العميل أرسل ${imageParts.length} صور. حلل كل صورة واذكر تفاصيل كل منتج بشكل منفصل.`
        : await this.buildImageAnalysisPrompt(companyId, availableProductsText);

      console.log(`🧠 [MULTIMODAL] Sending ${imageParts.length} image(s) to Gemini Vision for analysis...`);
      console.log('📝 [MULTIMODAL] Prompt length:', promptText.length, 'characters');

      // إضافة timeout محسن للـ Gemini API
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 45 seconds')), 45000);
      });

      // إعدادات الأمان المحسنة لتحليل المنتجات
      const safetySettings = [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE'
        }
      ];

      const generationConfig = {
        temperature: 0.2, // رفع قليلاً للحصول على ردود أكثر تنوعاً
        topK: 40,          // زيادة الخيارات
        topP: 0.95,        // تحسين جودة النتائج
        maxOutputTokens: 3048, // زيادة للحصول على تحليل مفصل
      };

      //console.log('🛡️ [MULTIMODAL] Using safety settings to allow product analysis');
      //console.log('🔧 [MULTIMODAL] Safety settings:', JSON.stringify(safetySettings, null, 2));
      //console.log('⚙️ [MULTIMODAL] Generation config:', JSON.stringify(generationConfig, null, 2));

      // بناء الـ parts: النص أولاً ثم جميع الصور
      const contentParts = [{ text: promptText }, ...imageParts];

      const requestConfig = {
        contents: [{ parts: contentParts }],
        safetySettings,
        generationConfig
      };

      console.log(`📤 [MULTIMODAL] Sending request with ${imageParts.length} image(s) to Gemini...`);
      const geminiPromise = this.visionModel.generateContent(requestConfig);

      //console.log('⏰ [MULTIMODAL] Waiting for Gemini response with 30s timeout...');
      const result = await Promise.race([geminiPromise, timeoutPromise]);

      //console.log('📥 [MULTIMODAL] Got result from Gemini, extracting response...');
      const response = await result.response;
      //console.log('🔍 [MULTIMODAL] Response object type:', typeof response);
      //console.log('🔍 [MULTIMODAL] Response object keys:', Object.keys(response));

      // فحص إذا كان هناك promptFeedback يشير لحظر المحتوى
      if (response.promptFeedback) {
        //console.log('⚠️ [MULTIMODAL] Prompt feedback found:', JSON.stringify(response.promptFeedback, null, 2));
        if (response.promptFeedback.blockReason) {
          console.error('🚫 [MULTIMODAL] Content blocked! Reason:', response.promptFeedback.blockReason);
          console.error('🔧 [MULTIMODAL] Safety settings used:', JSON.stringify(safetySettings, null, 2));

          // محاولة مع prompt مبسط
          //console.log('🔄 [MULTIMODAL] Trying with simplified prompt...');
          const simplifiedPrompt = "وصف هذه الصورة بشكل مختصر";

          try {
            const retryResult = await this.visionModel.generateContent({
              contents: [{ parts: [{ text: simplifiedPrompt }, imagePart] }],
              safetySettings,
              generationConfig
            });

            const retryResponse = await retryResult.response;
            const retryAnalysis = await retryResponse.text();

            if (retryAnalysis && retryAnalysis.trim().length > 0) {
              //console.log('✅ [MULTIMODAL] Retry successful with simplified prompt');
              return retryAnalysis;
            }
          } catch (retryError) {
            console.error('❌ [MULTIMODAL] Retry also failed:', retryError.message);
          }
        }
      }

      //console.log('📝 [MULTIMODAL] Extracting text from response...');
      const analysis = await response.text();
      //console.log('🔍 [MULTIMODAL] Raw analysis type:', typeof analysis);
      //console.log('🔍 [MULTIMODAL] Raw analysis value:', JSON.stringify(analysis));

      //console.log('✅ [MULTIMODAL] Successfully extracted analysis text');
      //console.log('🔍 [MULTIMODAL] Analysis length:', analysis.length, 'characters');

      //console.log('✅ [MULTIMODAL] Image analysis completed');

      // تشخيص مفصل للتحليل
      if (!analysis || analysis.trim().length === 0) {
        console.error('❌ [MULTIMODAL] CRITICAL: Analysis is empty or null!');
        console.error('🔍 [MULTIMODAL] Analysis value:', JSON.stringify(analysis));
        console.error('🔍 [MULTIMODAL] Response object:', JSON.stringify(response, null, 2));
      } else {
        //console.log('📝 [MULTIMODAL] Analysis result (first 200 chars):', analysis.substring(0, 200) + '...');
        //console.log('📊 [MULTIMODAL] Full analysis length:', analysis.length);
      }

      //console.log('✅ Image analysis completed');

      // ملاحظة: حفظ الذاكرة سيتم في aiAgentService بعد إنشاء الرد النهائي
      //console.log('📝 Image analysis completed - memory will be saved by aiAgentService with final response');

      // استخراج المعلومات المهمة باستخدام RAG الذكي
      const productMatch = await this.findProductWithRAG(analysis, companyId);

      // تحسين معالجة النتائج بناءً على مستوى الثقة
      const processedContent = this.buildProcessedContent(productMatch, analysis);

      return {
        type: 'image_analysis',
        originalMessage: messageData.content || `${imageParts.length} صورة`,
        analysis: analysis,
        imageUrl: imageUrls[0], // الصورة الأولى للتوافق مع الكود القديم
        imageUrls: imageUrls, // 🆕 جميع روابط الصور
        imageCount: imageParts.length, // 🆕 عدد الصور
        productMatch: productMatch,
        processedContent: processedContent,
        confidence: productMatch.confidence || 0,
        shouldEscalate: false
      };

    } catch (error) {
      console.error('❌ Error processing image:', error);
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);

      // 🔄 نظام إعادة المحاولة للأخطاء المؤقتة
      if (error.message && (error.message.includes('503') || error.message.includes('502'))) {
        //console.log('🔄 [RETRY] Attempting retry for temporary error...');
        try {
          await new Promise(resolve => setTimeout(resolve, 2000)); // انتظار ثانيتين

          //console.log('🔄 [RETRY] Retrying image analysis...');
          const retryAnalysis = await this.analyzeImageWithGemini(imageUrl, messageData.companyId);

          if (retryAnalysis) {
            //console.log('✅ [RETRY] Retry successful!');
            const retryProductMatch = await this.findBestProductMatch(retryAnalysis, messageData.companyId);
            const retryProcessedContent = this.formatAnalysisResult(retryAnalysis, retryProductMatch);

            return {
              type: 'image_analysis',
              originalMessage: messageData.content || 'صورة',
              analysis: retryAnalysis,
              imageUrl: imageUrl,
              productMatch: retryProductMatch,
              processedContent: retryProcessedContent,
              confidence: retryProductMatch.confidence || 0,
              shouldEscalate: false,
              wasRetried: true
            };
          }
        } catch (retryError) {
          console.error('❌ [RETRY] Retry also failed:', retryError);
        }
      }

      // تحديد نوع الخطأ لتقديم رد مناسب
      let errorMessage = '';
      let shouldEscalate = false;

      if (error.message && error.message.includes('PROHIBITED_CONTENT')) {
        // خطأ محتوى محظور - Gemini رفض تحليل الصورة
        return {
          type: 'image_error',
          originalMessage: messageData.content || 'صورة',
          processedContent: `العميل أرسل صورة لكن لا يمكن تحليلها حالياً. اعتذر للعميل بلطف واطلب منه وصف المنتج المطلوب بالكلمات، أو إرسال صورة أخرى أوضح.`,
          shouldEscalate: false,
          errorType: 'prohibited_content'
        };
      } else if (error.message && error.message.includes('timeout')) {
        // خطأ timeout - Gemini استغرق وقت طويل
        return {
          type: 'image_error',
          originalMessage: messageData.content || 'صورة',
          processedContent: `العميل أرسل صورة وتم استلامها بنجاح، لكن تحليل الصورة استغرق وقتاً أطول من المتوقع. اعتذر للعميل واطلب منه وصف المنتج أو إعادة المحاولة.`,
          shouldEscalate: true,
          errorType: 'timeout'
        };
      } else if (error.message && error.message.includes('429')) {
        // خطأ تجاوز الحد - نرجع للـ AI Agent للرد بشخصية ساره
        return {
          type: 'image_error',
          originalMessage: messageData.content || 'صورة',
          processedContent: `العميل أرسل صورة وتم استلامها بنجاح، لكن النظام وصل لحد الاستخدام اليومي لتحليل الصور. اعتذر للعميل واطلب منه وصف المنتج أو إعادة المحاولة لاحقاً.`,
          shouldEscalate: true,
          errorType: 'quota_exceeded'
        };
      } else if (error.message && error.message.includes('503')) {
        // خطأ الخدمة غير متاحة - نرجع للـ AI Agent للرد بشخصية ساره
        return {
          type: 'image_error',
          originalMessage: messageData.content || 'صورة',
          processedContent: `العميل أرسل صورة وتم استلامها، لكن خدمة تحليل الصور غير متاحة مؤقتاً. اعتذر للعميل واطلب منه وصف المنتج المطلوب.`,
          shouldEscalate: true,
          errorType: 'service_unavailable'
        };
      } else {
        // خطأ عام - نرجع للـ AI Agent للرد بشخصية ساره مع المنتجات المتاحة
        return {
          type: 'image_error',
          originalMessage: messageData.content || 'صورة',
          processedContent: `العميل أرسل صورة وتم استلامها، لكن حدث خطأ تقني في تحليلها. اعتذر للعميل واعرض عليه المنتجات المتاحة أو اطلب منه وصف المنتج.`,
          shouldEscalate: false,
          errorType: 'general_error'
        };
      }
    } finally {
      // 🔄 إضافة معلومات إضافية للمساعدة في التشخيص
      const processingTime = Date.now() - startTime;
      //console.log('🔍 [MULTIMODAL-FINAL] Image processing completed');
      //console.log('🏢 [MULTIMODAL-FINAL] Company ID:', messageData.companyId);
      //console.log('📊 [MULTIMODAL-FINAL] Processing time:', processingTime + 'ms');
      //console.log('⏱️ [MULTIMODAL-FINAL] End time:', new Date().toISOString());

      // تسجيل الأداء للمراقبة
      if (processingTime > 10000) { // أكثر من 10 ثواني
        console.warn('⚠️ [PERFORMANCE] Slow image processing detected:', processingTime + 'ms');
      }
    }
  }

  async processVoice(messageData) {
    try {
      //console.log('🎤 Processing voice message...');
      
      // في الوقت الحالي، سنعتبر الرسالة الصوتية كنص
      // يمكن إضافة خدمة تحويل الصوت إلى نص لاحقاً
      
      return {
        type: 'voice_message',
        originalMessage: messageData.content || 'رسالة صوتية',
        processedContent: 'شكراً لرسالتك الصوتية! يمكنك كتابة استفسارك بالنص لمساعدتك بشكل أفضل؟ 🎤'
      };

    } catch (error) {
      console.error('❌ Error processing voice:', error);
      return {
        type: 'voice_error',
        originalMessage: messageData.content || 'رسالة صوتية',
        processedContent: 'عذراً، لم أتمكن من معالجة الرسالة الصوتية. يمكنك كتابة استفسارك؟'
      };
    }
  }

  async processVideo(messageData) {
    try {
      //console.log('🎥 Processing video message...');
      
      // معالجة أساسية للفيديو
      return {
        type: 'video_message',
        originalMessage: messageData.content || 'فيديو',
        processedContent: 'شكراً لإرسال الفيديو! يمكنك وصف ما تريد مساعدة فيه بالكلمات؟ 🎥'
      };

    } catch (error) {
      console.error('❌ Error processing video:', error);
      return {
        type: 'video_error',
        originalMessage: messageData.content || 'فيديو',
        processedContent: 'عذراً، لم أتمكن من معالجة الفيديو. يمكنك وصف استفسارك بالكلمات؟'
      };
    }
  }

  async downloadImage(imageUrl) {
    try {
      //console.log('📥 [MULTIMODAL] Downloading image from:', imageUrl);

      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'arraybuffer',
        timeout: 10000 // 10 seconds timeout
      });

      //console.log('✅ [MULTIMODAL] Image download successful, status:', response.status);
      //console.log('📊 [MULTIMODAL] Response headers:', response.headers['content-type']);

      return Buffer.from(response.data);
    } catch (error) {
      console.error('❌ [MULTIMODAL] Error downloading image:', error.message);
      console.error('❌ [MULTIMODAL] Image URL was:', imageUrl);
      throw new Error('Failed to download image: ' + error.message);
    }
  }

  async analyzeImageForProduct(imageBuffer) {
    try {
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `
        حلل هذه الصورة وحدد:
        1. نوع المنتج (حذاء، كوتشي، صندل، إلخ)
        2. جميع الألوان الموجودة في المنتج (مثل: أسود مع بيج)
        3. الماركة إن أمكن
        4. الحالة (جديد، مستعمل، تالف)
        5. أي تفاصيل مميزة

        مهم: المنتج الواحد يمكن أن يحتوي على ألوان متعددة. اذكر جميع الألوان المرئية.

        رد بتنسيق JSON:
        {
          "productType": "نوع المنتج",
          "colors": "جميع الألوان (مثل: أسود مع بيج)",
          "brand": "الماركة",
          "condition": "الحالة",
          "details": "تفاصيل إضافية"
        }
      `;

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      };

      // إضافة timeout للـ Gemini API
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000);
      });

      const geminiPromise = this.visionModel.generateContent([prompt, imagePart]);
      const result = await Promise.race([geminiPromise, timeoutPromise]);
      const response = await result.response;
      const analysis = response.text();

      try {
        return JSON.parse(analysis);
      } catch (parseError) {
        // إذا فشل في تحليل JSON، أرجع النص كما هو
        return {
          productType: 'غير محدد',
          colors: 'غير محدد',
          brand: 'غير محدد',
          condition: 'غير محدد',
          details: analysis
        };
      }

    } catch (error) {
      console.error('❌ Error analyzing image for product:', error);
      return null;
    }
  }

  async generateImageResponse(imageAnalysis, customerMessage) {
    try {
      const prompt = `
        بناءً على تحليل الصورة التالي:
        ${JSON.stringify(imageAnalysis, null, 2)}
        
        ورسالة العميل: "${customerMessage}"
        
        اكتب رداً مفيداً وودوداً باللغة العربية.
        إذا كان العميل يسأل عن منتج مشابه، اقترح منتجات من المتجر.
        إذا كان المنتج تالف، اعرض المساعدة في الإرجاع أو الاستبدال.
      `;

      // إضافة timeout للـ Gemini API
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000);
      });

      const geminiPromise = this.textModel.generateContent(prompt);
      const result = await Promise.race([geminiPromise, timeoutPromise]);
      const response = await result.response;

      return response.text();

    } catch (error) {
      console.error('❌ Error generating image response:', error);
      return 'شكراً لإرسال الصورة! كيف يمكنني مساعدتك؟';
    }
  }

  // تحليل المشاعر من الصورة (تعبيرات الوجه إذا وجدت)
  async analyzeImageSentiment(imageBuffer) {
    try {
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `
        حلل هذه الصورة وحدد:
        1. هل يوجد وجه أو تعبير في الصورة؟
        2. ما هو المزاج العام للصورة؟
        3. هل تبدو الصورة إيجابية أم سلبية؟
        
        رد بكلمة واحدة: positive, negative, أو neutral
      `;

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      };

      // إضافة timeout للـ Gemini API
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000);
      });

      const geminiPromise = this.visionModel.generateContent([prompt, imagePart]);
      const result = await Promise.race([geminiPromise, timeoutPromise]);
      const response = await result.response;
      const sentiment = response.text().trim().toLowerCase();

      if (sentiment.includes('positive')) return 'positive';
      if (sentiment.includes('negative')) return 'negative';
      return 'neutral';

    } catch (error) {
      console.error('❌ Error analyzing image sentiment:', error);
      return 'neutral';
    }
  }

  // إنشاء وصف للمنتج من الصورة
  async generateProductDescription(imageBuffer) {
    try {
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `
        اكتب وصفاً تسويقياً جذاباً لهذا المنتج باللغة العربية.
        ركز على:
        - المظهر والتصميم
        - الألوان
        - المواد المحتملة
        - الاستخدام المناسب
        
        اجعل الوصف قصيراً ومشوقاً (2-3 جمل).
      `;

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      };

      // إضافة timeout للـ Gemini API
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000);
      });

      const geminiPromise = this.visionModel.generateContent([prompt, imagePart]);
      const result = await Promise.race([geminiPromise, timeoutPromise]);
      const response = await result.response;

      return response.text().trim();

    } catch (error) {
      console.error('❌ Error generating product description:', error);
      return 'منتج رائع ومميز!';
    }
  }

  // فحص جودة الصورة
  async checkImageQuality(imageBuffer) {
    try {
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `
        قيم جودة هذه الصورة من 1 إلى 10:
        - الوضوح
        - الإضاءة
        - زاوية التصوير
        
        رد برقم فقط من 1 إلى 10.
      `;

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      };

      // إضافة timeout للـ Gemini API
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000);
      });

      const geminiPromise = this.visionModel.generateContent([prompt, imagePart]);
      const result = await Promise.race([geminiPromise, timeoutPromise]);
      const response = await result.response;
      const quality = parseInt(response.text().trim());

      return isNaN(quality) ? 5 : Math.max(1, Math.min(10, quality));

    } catch (error) {
      console.error('❌ Error checking image quality:', error);
      return 5; // متوسط
    }
  }

  // بناء prompt مخصص لتحليل الصور حسب الشركة
  async buildImageAnalysisPrompt(companyId, availableProductsText) {
    try {
      //console.log('🎯 [PROMPT] Building custom image analysis prompt for company:', companyId);

      // الحصول على إعدادات الشركة
      const aiAgentService = require('./aiAgentService');
      const companyPrompts = await aiAgentService.getCompanyPrompts(companyId);

      let prompt = '';

      // استخدام شخصية الشركة المخصصة
      if (companyPrompts.personalityPrompt) {
        // استخراج الشخصية وتكييفها لتحليل الصور
        const imagePersonality = this.adaptPersonalityForImages(companyPrompts.personalityPrompt);
        prompt += `${imagePersonality}\n\n`;
        //console.log('✅ [PROMPT] Using custom company personality for image analysis');
      } else {
        // prompt افتراضي
        prompt += `أنت خبير في تحليل المنتجات والتعرف عليها بصرياً.\n\n`;
        //console.log('⚠️ [PROMPT] Using default personality for image analysis');
      }

      // إضافة تعليمات تحليل الصور المحسنة مع منع استخدام السياق السابق
      prompt += `🎯 مهمة مستقلة: تحليل الصورة المرسلة بدقة عالية

🚫 تعليمات حرجة - ممنوع منعاً باتاً:
- الإشارة لأي محادثة سابقة أو سياق سابق
- استخدام عبارات مثل "لسه مهتمة" أو "اللي كنتي سألتي عليه" أو "واضح إنك"
- الاعتماد على أي معلومات خارج الصورة الحالية
- ربط هذه الصورة بأي صور أو تفاعلات سابقة

✅ المطلوب: تحليل مستقل تماماً للصورة الحالية فقط

المنتجات المتاحة في المتجر:
${availableProductsText}

📋 تعليمات التحليل المهمة:
1. 🔍 حلل الصورة بصرياً بشكل مستقل تماماً
2. 🎨 حدد جميع الألوان المرئية في المنتج (مثل: أسود مع بيج، أبيض مع أحمر)
3. 👟 صف نوع المنتج (حذاء، سليبر، كوتشي، صندل)
4. 🔍 اذكر التفاصيل المميزة (الشكل، المواد، التصميم)
5. ✅ ابحث عن المنتج المطابق في القائمة أعلاه بناءً على النوع والتصميم العام
6. 🎯 إذا وجدت مطابقة، اذكر اسم المنتج والسعر

⚠️ مهم جداً - فهم المنتجات متعددة الألوان:
- المنتج الواحد يمكن أن يحتوي على ألوان متعددة (مثل: سليبر أسود مع جزء بيج)
- لا تعامل كل لون كمنتج منفصل
- ابحث عن المنتج الذي يطابق التصميم العام والشكل
- إذا كان المنتج في قائمتنا يسمى "الأسود" وهو يحتوي على أسود وبيج، فهذا مطابق
- ركز على التطابق الشامل للمنتج وليس الألوان المنفردة

✅ مثال للرد الصحيح:
"أهلاً بيكي يا قمر! ده سليبر حريمي جميل، شايفة إن لونه [الألوان الفعلية المرئية في الصورة]. عندنا منه بـ [السعر] جنيه. تحبي تعرفي تفاصيل أكتر؟"

🎯 المطلوب: وصف دقيق للمنتج في الصورة الحالية فقط - بدون أي إشارة لسياق سابق.`;

      //console.log('✅ [PROMPT] Custom image analysis prompt built successfully');
      return prompt;

    } catch (error) {
      console.error('❌ [PROMPT] Error building custom prompt:', error);

      // prompt افتراضي في حالة الخطأ
      return `أنت خبير في تحليل المنتجات. حلل هذه الصورة بدقة.

المنتجات المتاحة:
${availableProductsText}

مهم: المنتج الواحد يمكن أن يحتوي على ألوان متعددة. ابحث عن المنتج المطابق في التصميم العام وليس الألوان المنفردة.
صف المنتج بالتفصيل وقارنه مع المنتجات المتاحة كوحدة واحدة.`;
    }
  }

  // بناء محتوى معالج ذكي بناءً على نتيجة المطابقة
  buildProcessedContent(productMatch, analysis) {
    try {
      if (productMatch.found) {
        const confidence = productMatch.confidence || 0;
        const confidencePercentage = (confidence * 100).toFixed(1);

        if (confidence > 0.9) {
          // ثقة عالية جداً - مطابقة مؤكدة
          return `العميل أرسل صورة منتج. تم التعرف عليه بدقة عالية جداً (${confidencePercentage}%): ${productMatch.productName}${productMatch.price ? ` - السعر: ${productMatch.price} جنيه` : ''}. ${productMatch.reasoning || ''}`;
        } else if (confidence > 0.85) {
          // ثقة عالية - مطابقة موثوقة
          return `العميل أرسل صورة منتج. تم التعرف عليه بدقة عالية (${confidencePercentage}%): ${productMatch.productName}${productMatch.price ? ` - السعر: ${productMatch.price} جنيه` : ''}. ${productMatch.reasoning || ''}`;
        } else if (confidence > 0.7) {
          // ثقة جيدة - مطابقة محتملة مع تحقق إضافي
          return `العميل أرسل صورة منتج. يبدو أنه: ${productMatch.productName}${productMatch.price ? ` - السعر: ${productMatch.price} جنيه` : ''}. (دقة التعرف: ${confidencePercentage}%). يحتاج تأكيد من العميل. ${productMatch.reasoning || ''}`;
        } else {
          // ثقة منخفضة - لا يجب أن نصل هنا مع المعايير الجديدة
          return `العميل أرسل صورة منتج. الثقة في المطابقة منخفضة (${confidencePercentage}%). يحتاج توضيح أكثر من العميل.`;
        }
      } else {
        // لم يتم العثور على مطابقة
        const reason = productMatch.reason || 'لم يتم العثور على مطابقة';
        const analysisPreview = analysis ? analysis.substring(0, 200) + '...' : 'لا يوجد تحليل';
        
        return `العميل أرسل صورة منتج لكن لم يتم العثور على مطابقة دقيقة في المتجر (السبب: ${reason}). يحتاج عرض المنتجات المشابهة أو المتاحة. وصف الصورة: ${analysisPreview}`;
      }
    } catch (error) {
      console.error('❌ [CONTENT] Error building processed content:', error);
      return `العميل أرسل صورة منتج. يحتاج مساعدة في تحديد المنتج المطلوب.`;
    }
  }

  // تكييف شخصية الشركة لتحليل الصور
  adaptPersonalityForImages(personalityPrompt) {
    try {
      // استخراج الاسم والشخصية الأساسية
      let adaptedPrompt = personalityPrompt;

      // تحويل من شخصية المحادثة إلى شخصية تحليل الصور
      adaptedPrompt = adaptedPrompt
        .replace(/تتحدثين|تتحدث/g, 'تحلل الصور')
        .replace(/في المحادثة|في الرد/g, 'في تحليل الصور')
        .replace(/مع العملاء|للعملاء/g, 'للصور المرسلة')
        .replace(/الردود|الرد/g, 'التحليل');

      // إضافة تخصص تحليل الصور
      adaptedPrompt += '\nأنت متخصص في تحليل الصور والتعرف على المنتجات بصرياً.';

      return adaptedPrompt;

    } catch (error) {
      console.error('❌ [PROMPT] Error adapting personality:', error);
      return 'أنت خبير في تحليل المنتجات بصرياً.';
    }
  }

  // البحث الذكي عن المنتج باستخدام RAG
  async findProductWithRAG(imageAnalysis, companyId) {
    try {
      //console.log('🧠 [RAG-MATCH] Using RAG for intelligent product matching...');
      //console.log('🔍 [RAG-MATCH] Image analysis input:', imageAnalysis ? imageAnalysis.substring(0, 100) + '...' : 'EMPTY OR NULL');
      //console.log('📏 [RAG-MATCH] Analysis length:', imageAnalysis ? imageAnalysis.length : 0, 'characters');

      if (!imageAnalysis || imageAnalysis.trim().length === 0) {
        console.error('❌ [RAG-MATCH] CRITICAL: Image analysis is empty - cannot match products!');
        return {
          found: false,
          reason: 'فشل في تحليل الصورة - لا يمكن مطابقة المنتجات',
          confidence: 0,
          reasoning: 'تحليل الصورة فارغ أو فاشل'
        };
      }

      const ragService = require('./ragService');

      // استخدام RAG للبحث الذكي عن المنتج
      const ragResult = await ragService.retrieveSpecificProduct(
        imageAnalysis,
        'product_inquiry',
        null,
        [],
        companyId
      );

      if (ragResult && ragResult.product && ragResult.confidence > 0.85) {
        //console.log(`✅ [RAG-MATCH] HIGH CONFIDENCE MATCH FOUND! (${(ragResult.confidence * 100).toFixed(1)}%)`);
        //console.log(`📦 Product: ${ragResult.product.metadata?.name}`);
        //console.log(`💰 Price: ${ragResult.product.metadata?.price}`);
        //console.log(`🧠 AI Reasoning: ${ragResult.reasoning}`);

        return {
          found: true,
          productName: ragResult.product.metadata?.name || 'منتج',
          price: ragResult.product.metadata?.price || 'غير محدد',
          description: ragResult.product.metadata?.description || '',
          productId: ragResult.product.metadata?.id,
          confidence: ragResult.confidence,
          reasoning: ragResult.reasoning
        };
      }

      // إذا كانت الثقة متوسطة (0.7-0.85)، نحاول التحقق الإضافي
      if (ragResult && ragResult.product && ragResult.confidence > 0.7) {
        //console.log(`⚠️ [RAG-MATCH] MEDIUM CONFIDENCE (${(ragResult.confidence * 100).toFixed(1)}%) - Running additional verification...`);
        
        // تحقق إضافي من التطابق
        const additionalVerification = await this.verifyProductMatch(
          imageAnalysis, 
          ragResult.product.metadata, 
          companyId
        );
        
        if (additionalVerification.isVerified) {
          //console.log('✅ [RAG-MATCH] Additional verification passed - accepting match');
          
          return {
            found: true,
            productName: ragResult.product.metadata?.name || 'منتج',
            price: ragResult.product.metadata?.price || 'غير محدد',
            description: ragResult.product.metadata?.description || '',
            productId: ragResult.product.metadata?.id,
            confidence: Math.min(ragResult.confidence + 0.1, 0.95), // تحسين الثقة قليلاً
            reasoning: ragResult.reasoning + ' - تم التحقق الإضافي'
          };
        }
      }

      //console.log(`❌ [RAG-MATCH] REJECTED - Confidence too low: ${ragResult?.confidence ? (ragResult.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
      //console.log(`🚫 [RAG-MATCH] Minimum confidence required: 85%`);
      //console.log(`🧠 [RAG-MATCH] AI Reasoning: ${ragResult?.reasoning || 'No reasoning provided'}`);

      return {
        found: false,
        reason: 'لم يتم العثور على منتج مطابق بدقة كافية (85%+)',
        confidence: ragResult?.confidence || 0,
        reasoning: ragResult?.reasoning
      };

    } catch (error) {
      console.error('❌ [RAG-MATCH] Error in RAG matching:', error);

      // لا نستخدم fallback - الذكاء الاصطناعي هو المسؤول الوحيد
      //console.log('🚫 [RAG-MATCH] No fallback - AI is the only decision maker');
      return {
        found: false,
        reason: 'خطأ في تحليل الصورة بالذكاء الاصطناعي',
        error: error.message
      };
    }
  }

  /**
   * تحقق إضافي من مطابقة المنتج للثقة المتوسطة
   * @param {string} imageAnalysis - تحليل الصورة
   * @param {Object} productMetadata - بيانات المنتج
   * @param {string} companyId - معرف الشركة
   * @returns {Object} - نتائج التحقق
   */
  async verifyProductMatch(imageAnalysis, productMetadata, companyId) {
    try {
      //console.log('🔍 [VERIFY] Starting additional verification for medium confidence match...');
      //console.log('📦 [VERIFY] Product being verified:', productMetadata?.name);
      
      // معايير التحقق المتعددة
      const verificationScores = {
        nameMatch: 0,
        colorMatch: 0,
        categoryMatch: 0,
        detailsMatch: 0
      };
      
      const analysisLower = imageAnalysis.toLowerCase();
      
      // 1. فحص مطابقة اسم المنتج
      if (productMetadata.name) {
        const productWords = productMetadata.name.toLowerCase().split(' ');
        const matchedWords = productWords.filter(word => {
          if (word.length > 2) { // تجاهل الكلمات القصيرة
            return analysisLower.includes(word);
          }
          return false;
        });
        
        verificationScores.nameMatch = matchedWords.length / productWords.length;
        //console.log('📝 [VERIFY] Name match score:', verificationScores.nameMatch);
      }
      
      // 2. فحص مطابقة الألوان
      const commonColors = ['أسود', 'أبيض', 'أحمر', 'أزرق', 'بيج', 'black', 'white', 'red', 'blue', 'beige'];
      const colorsInAnalysis = commonColors.filter(color => analysisLower.includes(color));
      const colorsInProduct = commonColors.filter(color => productMetadata.name.toLowerCase().includes(color));
      
      if (colorsInAnalysis.length > 0 && colorsInProduct.length > 0) {
        const commonColorCount = colorsInAnalysis.filter(color => colorsInProduct.includes(color)).length;
        verificationScores.colorMatch = commonColorCount / Math.max(colorsInAnalysis.length, colorsInProduct.length);
      }
      //console.log('🎨 [VERIFY] Color match score:', verificationScores.colorMatch);
      
      // 3. فحص مطابقة الفئة
      const shoeKeywords = ['حذاء', 'كوتشي', 'سليبر', 'صندل', 'shoe', 'sneaker', 'sandal', 'slipper'];
      const hasShoeInAnalysis = shoeKeywords.some(keyword => analysisLower.includes(keyword));
      const hasShoeInProduct = shoeKeywords.some(keyword => productMetadata.name.toLowerCase().includes(keyword));
      
      if (hasShoeInAnalysis && hasShoeInProduct) {
        verificationScores.categoryMatch = 0.8;
      } else if (hasShoeInAnalysis || hasShoeInProduct) {
        verificationScores.categoryMatch = 0.4;
      }
      //console.log('📂 [VERIFY] Category match score:', verificationScores.categoryMatch);
      
      // 4. فحص تفاصيل إضافية
      if (productMetadata.description) {
        const descWords = productMetadata.description.toLowerCase().split(' ');
        const matchedDescWords = descWords.filter(word => {
          if (word.length > 3) {
            return analysisLower.includes(word);
          }
          return false;
        });
        
        verificationScores.detailsMatch = matchedDescWords.length / Math.max(descWords.length, 1);
      }
      //console.log('🔍 [VERIFY] Details match score:', verificationScores.detailsMatch);
      
      // حساب النقاط الإجمالية
      const weights = {
        nameMatch: 0.4,    // 40% وزن لاسم المنتج
        colorMatch: 0.3,   // 30% وزن للألوان
        categoryMatch: 0.2, // 20% وزن للفئة
        detailsMatch: 0.1  // 10% وزن للتفاصيل
      };
      
      const totalScore = Object.keys(verificationScores).reduce((total, key) => {
        return total + (verificationScores[key] * weights[key]);
      }, 0);
      
      const isVerified = totalScore >= 0.6; // يتطلب 60% على الأقل
      
      //console.log('📊 [VERIFY] Verification scores:', verificationScores);
      //console.log('🎯 [VERIFY] Total verification score:', (totalScore * 100).toFixed(1) + '%');
      //console.log('✅ [VERIFY] Verification result:', isVerified ? 'PASSED' : 'FAILED');
      
      return {
        isVerified,
        totalScore,
        detailedScores: verificationScores,
        threshold: 0.6
      };
      
    } catch (error) {
      console.error('❌ [VERIFY] Error in additional verification:', error);
      return {
        isVerified: false,
        totalScore: 0,
        error: error.message
      };
    }
  }

  // استخراج معلومات المنتج من التحليل (الطريقة القديمة كـ fallback)
  extractProductMatch(analysis, availableProducts) {
    try {
      // التحقق من صحة المدخلات
      if (!analysis || typeof analysis !== 'string') {
        //console.log('⚠️ [PRODUCT-MATCH] Invalid analysis input');
        return { found: false, reason: 'تحليل الصورة غير صالح' };
      }

      if (!availableProducts || !Array.isArray(availableProducts)) {
        //console.log('⚠️ [PRODUCT-MATCH] Invalid products input');
        return { found: false, reason: 'قائمة المنتجات غير متاحة' };
      }

      // البحث عن كلمات مفتاحية في التحليل
      const analysisLower = analysis.toLowerCase();
      //console.log('🔍 [PRODUCT-MATCH] Analyzing:', analysisLower.substring(0, 100) + '...');

      // البحث عن منتج مطابق
      for (const product of availableProducts) {
        if (!product || !product.name) {
          //console.log('⚠️ [PRODUCT-MATCH] Skipping invalid product:', product);
          continue;
        }

        const productName = product.name.toLowerCase();

        // فحص إذا كان اسم المنتج موجود في التحليل
        if (analysisLower.includes(productName) || analysisLower.includes('كوتشي') || analysisLower.includes('حذاء')) {

          // البحث عن اللون
          let matchedColor = 'غير محدد';
          let matchedPrice = product.price;

          if (product.variants && product.variants.length > 0) {
            // البحث عن اللون المحدد في التحليل
            let foundColor = false;

            // أولاً: البحث عن الألوان الأساسية في بداية التحليل
            const analysisStart = analysisLower.substring(0, 500); // أول 500 حرف فقط
            //console.log('🔍 [COLOR-ANALYSIS] Analyzing first 500 chars:', analysisStart);

            for (const variant of product.variants) {
              const colorName = variant.name.toLowerCase();
              //console.log('🔍 [COLOR-CHECK] Checking variant:', variant.name, 'against analysis');

              // مطابقة الألوان بدقة - بدون أولوية مسبقة
              const colorMatches = [
                {
                  keywords: ['أحمر', 'احمر', 'red'],
                  variants: ['أحمر', 'احمر', 'الاحمر', 'red'],
                  name: 'red'
                },
                {
                  keywords: ['أسود', 'اسود', 'black'],
                  variants: ['أسود', 'اسود', 'الاسود', 'black'],
                  name: 'black'
                },
                {
                  keywords: ['أبيض', 'ابيض', 'white'],
                  variants: ['أبيض', 'ابيض', 'الابيض', 'white'],
                  name: 'white'
                },
                {
                  keywords: ['بيج', 'beige'],
                  variants: ['بيج', 'البيج', 'beige'],
                  name: 'beige'
                },
                {
                  keywords: ['أزرق', 'ازرق', 'blue'],
                  variants: ['أزرق', 'ازرق', 'الازرق', 'blue'],
                  name: 'blue'
                }
              ];

              for (const colorMatch of colorMatches) {
                const hasColorInAnalysis = colorMatch.keywords.some(keyword =>
                  analysisStart.includes(keyword)
                );

                if (hasColorInAnalysis) {
                  const hasVariantMatch = colorMatch.variants.some(variantKeyword =>
                    colorName.includes(variantKeyword)
                  );

                  if (hasVariantMatch) {
                    matchedColor = variant.name;
                    matchedPrice = variant.price;
                    foundColor = true;
                    //console.log(`🎯 [COLOR-MATCH] Found ${colorMatch.name} color match:`, variant.name);
                    break;
                  }
                }
              }

              if (foundColor) break;
            }

            // إذا لم نجد مطابقة في البداية، ابحث في النص كاملاً لكن بحذر
            if (!foundColor) {
              //console.log('🔍 [COLOR-FALLBACK] No color found in first 500 chars, searching full text...');

              // ترتيب الألوان حسب الأولوية (الأبيض أولاً لأنه الأكثر شيوعاً)
              const colorPriority = ['الابيض', 'الاسود', 'البيج'];

              for (const priorityColor of colorPriority) {
                for (const variant of product.variants) {
                  const colorName = variant.name.toLowerCase();

                  if (colorName.includes(priorityColor)) {
                    // تحقق من وجود اللون في النص
                    const colorKeywords = {
                      'الابيض': ['أبيض', 'ابيض', 'white'],
                      'الاسود': ['أسود', 'اسود', 'black'],
                      'البيج': ['بيج', 'beige']
                    };

                    const keywords = colorKeywords[priorityColor] || [];
                    const hasColorInText = keywords.some(keyword => analysisLower.includes(keyword));

                    if (hasColorInText) {
                      matchedColor = variant.name;
                      matchedPrice = variant.price;
                      foundColor = true;
                      //console.log('🎯 [COLOR-MATCH] Priority match found:', variant.name, 'for', priorityColor);
                      break;
                    }
                  }
                }
                if (foundColor) break;
              }

              // إذا لم نجد أي مطابقة، استخدم أول لون متاح
              if (!foundColor && product.variants.length > 0) {
                matchedColor = product.variants[0].name;
                matchedPrice = product.variants[0].price;
                foundColor = true;
                //console.log('🎯 [COLOR-MATCH] Using default first variant:', matchedColor);
              }
            }

            // إذا لم نجد لون محدد، استخدم أول variant
            if (!foundColor && product.variants.length > 0) {
              matchedColor = product.variants[0].name;
              matchedPrice = product.variants[0].price;
            }
          }

          return {
            found: true,
            productName: product.name,
            color: matchedColor,
            price: matchedPrice,
            description: product.description,
            productId: product.id
          };
        }
      }

      // لم يتم العثور على منتج مطابق
      return {
        found: false,
        reason: 'المنتج غير متوفر في المتجر'
      };

    } catch (error) {
      console.error('❌ Error extracting product match:', error);
      return {
        found: false,
        reason: 'خطأ في تحليل المنتج'
      };
    }
  }

  // إحصائيات المعالجة
  getProcessingStats() {
    return {
      supportedTypes: ['image', 'voice', 'video', 'text'],
      imageFormats: ['jpeg', 'png', 'gif', 'webp'],
      maxImageSize: '10MB',
      processingTime: 'متوسط 2-5 ثواني',
      accuracy: '85-95%'
    };
  }
}

module.exports = new MultimodalService();
