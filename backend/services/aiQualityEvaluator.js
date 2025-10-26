/**
 * محرك التقييم الذكي لجودة ردود البوت
 * يقيم كل رد تلقائياً بناءً على معايير الجودة المحددة
 */

class AIQualityEvaluator {
  constructor() {
    this.evaluationHistory = new Map(); // معرف الرسالة -> تقييم مفصل
    this.qualityMetrics = {
      relevance: [], // ملاءمة الرد للسؤال
      accuracy: [], // دقة المعلومات
      clarity: [], // وضوح الرد
      completeness: [], // اكتمال الإجابة
      ragUsage: [] // استخدام قاعدة المعرفة
    };
    
    // إعدادات التقييم
    this.settings = {
      minScoreThreshold: 60, // الحد الأدنى للجودة المقبولة
      excellentThreshold: 85, // حد الجودة الممتازة
      ragBonus: 10, // نقاط إضافية لاستخدام RAG
      contextWindow: 100 // عدد الكلمات للسياق
    };

    //console.log('🤖 [AI-EVALUATOR] AI Quality Evaluator initialized');
  }

  /**
   * فحص إذا كان التقييم الذكي مفعل للشركة
   * @param {string} companyId - معرف الشركة
   * @returns {boolean} - هل التقييم مفعل
   */
  async isQualityEvaluationEnabled(companyId) {
    try {
      // أولاً: محاولة قراءة من قاعدة البيانات
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const aiSettings = await prisma.aiSettings.findUnique({
          where: { companyId },
          select: { qualityEvaluationEnabled: true }
        });

        await prisma.$disconnect();

        if (aiSettings !== null) {
          const isEnabled = aiSettings.qualityEvaluationEnabled !== false;
          //console.log(`🔧 [AI-EVALUATOR] Quality evaluation from DB for company ${companyId}: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
          return isEnabled;
        }
      } catch (dbError) {
        //console.log(`⚠️ [AI-EVALUATOR] Database not available, using temporary system: ${dbError.message}`);
      }

      // النظام المؤقت: فحص ملف الإعدادات (fallback)
      const fs = require('fs');
      const path = require('path');

      try {
        const settingsPath = path.join(__dirname, '../../temp_quality_settings.json');
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          const isEnabled = settings.qualityEvaluationEnabled !== false;
          //console.log(`🔧 [AI-EVALUATOR] Quality evaluation from file for company ${companyId}: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
          return isEnabled;
        }
      } catch (fileError) {
        //console.log(`🔧 [AI-EVALUATOR] No settings file found, using default: ENABLED`);
      }

      // افتراضياً: مفعل
      //console.log(`🔧 [AI-EVALUATOR] Quality evaluation check for company ${companyId}: ENABLED (default)`);
      return true;

    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error checking evaluation setting:', error);
      // في حالة الخطأ، نفعل التقييم افتراضياً
      return true;
    }
  }

  /**
   * تقييم جودة رد البوت تلقائياً
   * @param {Object} responseData - بيانات الرد
   * @returns {Object} - تقييم مفصل للجودة
   */
  async evaluateResponse(responseData) {
    try {
      const {
        messageId,
        conversationId,
        userMessage,
        botResponse,
        ragData,
        confidence,
        model,
        timestamp,
        companyId
      } = responseData;

      // فحص إذا كان التقييم الذكي مفعل للشركة
      if (companyId) {
        const isEvaluationEnabled = await this.isQualityEvaluationEnabled(companyId);
        if (!isEvaluationEnabled) {
          //console.log(`⏭️ [AI-EVALUATOR] Quality evaluation disabled for company: ${companyId}`);
          return {
            messageId,
            scores: {
              relevance: 80,
              accuracy: 80,
              clarity: 80,
              completeness: 80,
              ragUsage: 80,
              overall: 80
            },
            qualityLevel: 'good',
            issues: [],
            suggestions: [],
            enabled: false,
            reason: 'Quality evaluation disabled in settings'
          };
        }
      }

      //console.log(`🔍 [AI-EVALUATOR] Evaluating response: ${messageId}`);

      // 1. تحليل ملاءمة الرد للسؤال (باستخدام AI الذكي)
      const relevanceScore = await this.evaluateRelevance(userMessage, botResponse);

      // 2. تحليل دقة المعلومات (باستخدام AI الذكي)
      const accuracyScore = await this.evaluateAccuracy(userMessage, botResponse, ragData);

      // 3. تحليل وضوح الرد (باستخدام AI الذكي)
      const clarityScore = await this.evaluateClarity(userMessage, botResponse);

      // 4. تحليل اكتمال الإجابة (باستخدام AI الذكي)
      const completenessScore = await this.evaluateCompleteness(userMessage, botResponse);

      // 5. تحليل استخدام قاعدة المعرفة
      const ragUsageScore = this.evaluateRAGUsage(ragData, botResponse);

      // 6. تحليل الصور المرسلة (جديد)
      const images = responseData.images || responseData.attachments || [];
      const imageScore = this.evaluateImages(userMessage, botResponse, images);
      //console.log(`📸 [IMAGE-EVALUATION] Image score: ${imageScore}% (${images.length} images found)`);

      // 6. تحليل المشاعر والرضا (جديد)
      let sentimentAnalysis = null;
      try {
        // تحليل مشاعر العميل من رسالته الأصلية ونوعية طلبه
        if (userMessage && userMessage.trim().length > 0) {
          sentimentAnalysis = await this.analyzeSentiment(userMessage, botResponse, responseData.companyId);
          //console.log(`😊 [SENTIMENT] Customer sentiment from original message: ${sentimentAnalysis.level} (${sentimentAnalysis.score}%)`);
        }

        // إذا كان هناك رد تالي من العميل، نحلله أيضاً (للمستقبل)
        const customerFollowUp = responseData.customerFollowUp || '';
        if (customerFollowUp && customerFollowUp.trim().length > 0) {
          const followUpSentiment = await this.analyzeSentiment(customerFollowUp, botResponse, responseData.companyId);
          //console.log(`😊 [SENTIMENT] Customer follow-up sentiment: ${followUpSentiment.level} (${followUpSentiment.score}%)`);
          // استخدام رد العميل التالي إذا كان متاح (أكثر دقة)
          sentimentAnalysis = followUpSentiment;
        }
      } catch (error) {
        console.error('⚠️ [SENTIMENT] Error analyzing sentiment:', error);
      }

      // حساب النتيجة الإجمالية
      const overallScore = this.calculateOverallScore({
        relevance: relevanceScore,
        accuracy: accuracyScore,
        clarity: clarityScore,
        completeness: completenessScore,
        ragUsage: ragUsageScore,
        images: imageScore
      });

      // إذا فشل التقييم بالذكاء الصناعي، إرجاع نتيجة فشل
      if (overallScore === null) {
        //console.log(`❌ [EVALUATOR] AI evaluation failed - returning failure result`);
        return {
          messageId,
          conversationId,
          timestamp: timestamp || new Date(),
          scores: {
            relevance: relevanceScore,
            accuracy: accuracyScore,
            clarity: clarityScore,
            completeness: completenessScore,
            ragUsage: ragUsageScore,
            overall: null
          },
          qualityLevel: 'evaluation_failed',
          model: model || 'unknown',
          confidence: 0,
          sentiment: sentimentAnalysis,
          issues: ['فشل في التقييم بالذكاء الصناعي'],
          recommendations: ['يرجى التحقق من إعدادات الذكاء الصناعي'],
          failed: true
        };
      }

      // تحديد مستوى الجودة
      const qualityLevel = this.determineQualityLevel(overallScore);

      // إنشاء التقييم المفصل
      const evaluation = {
        messageId,
        conversationId,
        timestamp: timestamp || new Date(),
        scores: {
          relevance: relevanceScore,
          accuracy: accuracyScore,
          clarity: clarityScore,
          completeness: completenessScore,
          ragUsage: ragUsageScore,
          overall: overallScore
        },
        qualityLevel,
        model,
        confidence: confidence || 0,
        // إضافة تحليل المشاعر
        sentiment: sentimentAnalysis,
        issues: this.identifyIssues({
          relevance: relevanceScore,
          accuracy: accuracyScore,
          clarity: clarityScore,
          completeness: completenessScore,
          ragUsage: ragUsageScore
        }),
        recommendations: this.generateRecommendations({
          relevance: relevanceScore,
          accuracy: accuracyScore,
          clarity: clarityScore,
          completeness: completenessScore,
          ragUsage: ragUsageScore
        })
      };

      // حفظ التقييم
      this.evaluationHistory.set(messageId, evaluation);

      // تحديث المقاييس العامة
      this.updateMetrics(evaluation.scores);

      //console.log(`✅ [AI-EVALUATOR] Response evaluated: ${messageId} - Score: ${overallScore}% (${qualityLevel})`);

      return evaluation;

    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error evaluating response:', error);
      throw error;
    }
  }

  /**
   * تقييم ملاءمة الرد للسؤال باستخدام AI ذكي
   * @param {string} userMessage - رسالة المستخدم
   * @param {string} botResponse - رد البوت
   * @returns {Promise<number>} - نقاط الملاءمة (0-100)
   */
  async evaluateRelevance(userMessage, botResponse) {
    try {
      //console.log(`🧠 [AI-RELEVANCE] Evaluating relevance with AI...`);

      // محاولة التقييم بالـ AI أولاً
      const aiScore = await this.evaluateRelevanceWithAI(userMessage, botResponse);
      if (aiScore !== null) {
        //console.log(`✅ [AI-RELEVANCE] AI evaluation successful: ${aiScore}%`);
        return aiScore;
      }

      // في حالة فشل الـ AI، لا نستخدم النظام التقليدي
      //console.log(`❌ [AI-RELEVANCE] AI evaluation failed - no fallback`);
      return null; // إرجاع null بدلاً من النظام التقليدي

    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error in relevance evaluation:', error);
      // لا fallback - إرجاع null
      return null;
    }
  }

  /**
   * تقييم الملاءمة باستخدام الذكاء الاصطناعي
   * @param {string} userMessage - رسالة المستخدم
   * @param {string} botResponse - رد البوت
   * @returns {Promise<number|null>} - نقاط الملاءمة أو null في حالة الفشل
   */
  async evaluateRelevanceWithAI(userMessage, botResponse) {
    try {
      const prompt = `أنت خبير في تقييم جودة المحادثات وخدمة العملاء. قيم مدى ملاءمة الرد للسؤال.

رسالة العميل: "${userMessage}"
رد البوت: "${botResponse}"

قيم الملاءمة من 0-100 بناءً على:

1. **فهم السؤال** (30 نقطة):
   - هل البوت فهم السؤال الحقيقي؟
   - هل فهم النية والهدف من السؤال؟

2. **الإجابة المباشرة** (40 نقطة):
   - هل الرد يجيب على السؤال المطروح؟
   - هل المعلومات المقدمة مفيدة للعميل؟

3. **السياق والمعنى** (30 نقطة):
   - هل الرد منطقي في سياق المحادثة؟
   - هل يساعد العميل في تحقيق هدفه؟

أمثلة:
- سؤال عن السعر + رد بالسعر = 95-100
- سؤال عن السعر + رد عام عن المنتج = 60-70
- سؤال عن السعر + رد غير مرتبط = 0-20

أعطي فقط الرقم من 0-100 بدون تفسير.`;

      const response = await this.callGeminiForEvaluation(`${userMessage}|||${botResponse}|||RELEVANCE`, userMessage, botResponse);

      if (response && response.score !== undefined) {
        const score = Math.min(100, Math.max(0, Math.round(response.score * 20))); // تحويل من 1-5 إلى 20-100
        //console.log(`🧠 [AI-RELEVANCE] AI score: ${score}%, confidence: ${response.confidence || 'N/A'}`);
        return score;
      }

      return null;

    } catch (error) {
      console.error('❌ [AI-RELEVANCE] Error in AI evaluation:', error);
      return null;
    }
  }

  /**
   * تقييم الملاءمة بالطريقة التقليدية (fallback)
   * @param {string} userMessage - رسالة المستخدم
   * @param {string} botResponse - رد البوت
   * @returns {number} - نقاط الملاءمة (0-100)
   */
  evaluateRelevanceTraditional(userMessage, botResponse) {
    try {
      // تحليل الكلمات المفتاحية
      const userKeywords = this.extractKeywords(userMessage);
      const responseKeywords = this.extractKeywords(botResponse);

      // حساب التطابق في الكلمات المفتاحية
      const keywordMatch = this.calculateKeywordMatch(userKeywords, responseKeywords);

      // تحليل نوع السؤال ونوع الإجابة
      const questionType = this.identifyQuestionType(userMessage);
      const responseType = this.identifyResponseType(botResponse);
      const typeMatch = this.calculateTypeMatch(questionType, responseType);

      // حساب النتيجة النهائية
      const relevanceScore = Math.round((keywordMatch * 0.6) + (typeMatch * 0.4));

      return Math.min(100, Math.max(0, relevanceScore));

    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error in traditional relevance evaluation:', error);
      return 50; // نتيجة متوسطة في حالة الخطأ
    }
  }

  /**
   * تقييم دقة المعلومات باستخدام AI ذكي
   * @param {string} userMessage - رسالة المستخدم
   * @param {string} botResponse - رد البوت
   * @param {Object} ragData - بيانات قاعدة المعرفة
   * @returns {Promise<number>} - نقاط الدقة (0-100)
   */
  async evaluateAccuracy(userMessage, botResponse, ragData) {
    try {
      //console.log(`🧠 [AI-ACCURACY] Evaluating accuracy with AI...`);

      // محاولة التقييم بالـ AI أولاً
      const aiScore = await this.evaluateAccuracyWithAI(userMessage, botResponse, ragData);
      if (aiScore !== null) {
        //console.log(`✅ [AI-ACCURACY] AI evaluation successful: ${aiScore}%`);
        return aiScore;
      }

      // في حالة فشل الـ AI، لا نستخدم النظام التقليدي
      //console.log(`❌ [AI-ACCURACY] AI evaluation failed - no fallback`);
      return null; // إرجاع null بدلاً من النظام التقليدي

    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error in accuracy evaluation:', error);
      // لا fallback - إرجاع null
      return null;
    }
  }

  /**
   * تقييم الدقة باستخدام الذكاء الاصطناعي
   * @param {string} userMessage - رسالة المستخدم
   * @param {string} botResponse - رد البوت
   * @param {Object} ragData - بيانات قاعدة المعرفة
   * @returns {Promise<number|null>} - نقاط الدقة أو null في حالة الفشل
   */
  async evaluateAccuracyWithAI(userMessage, botResponse, ragData) {
    try {
      // إعداد معلومات إضافية للسياق
      let contextInfo = '';
      if (ragData && ragData.used && ragData.sources) {
        contextInfo = `\n\nمعلومات من قاعدة البيانات المستخدمة:\n${JSON.stringify(ragData.sources, null, 2)}`;
      }

      const prompt = `أنت خبير في تقييم دقة المعلومات في خدمة العملاء. قيم مدى دقة الرد المقدم.

رسالة العميل: "${userMessage}"
رد البوت: "${botResponse}"${contextInfo}

قيم الدقة من 0-100 بناءً على:

1. **صحة المعلومات الأساسية** (40 نقطة):
   - هل المعلومات المقدمة صحيحة؟
   - هل الأسعار والأرقام دقيقة؟
   - هل التفاصيل التقنية صحيحة؟

2. **التطابق مع قاعدة البيانات** (30 نقطة):
   - هل المعلومات تتطابق مع البيانات المرجعية؟
   - هل تم استخدام المصادر الموثوقة بشكل صحيح؟
   - هل هناك تناقضات مع المعلومات المعروفة؟

3. **عدم وجود معلومات خاطئة** (20 نقاط):
   - هل يوجد معلومات مضللة أو خاطئة؟
   - هل هناك ادعاءات غير مدعومة؟
   - هل المعلومات محدثة وليست قديمة؟

4. **التناسق الداخلي** (10 نقاط):
   - هل المعلومات متسقة داخل الرد نفسه؟
   - هل هناك تناقضات في الرد؟

أمثلة:
- معلومات صحيحة ومطابقة تماماً = 95-100
- معلومات صحيحة مع اختلافات طفيفة = 80-90
- معلومات صحيحة لكن ناقصة = 60-75
- معلومات مشكوك فيها أو غير مؤكدة = 40-60
- معلومات خاطئة أو مضللة = 0-30

أعطي فقط الرقم من 0-100 بدون تفسير.`;

      const response = await this.callGeminiForEvaluation(`${userMessage}|||${botResponse}|||ACCURACY`, userMessage, botResponse);

      if (response && response.score !== undefined) {
        const score = Math.min(100, Math.max(0, Math.round(response.score * 20))); // تحويل من 1-5 إلى 20-100
        //console.log(`🧠 [AI-ACCURACY] AI score: ${score}%, confidence: ${response.confidence || 'N/A'}`);
        return score;
      }

      return null;

    } catch (error) {
      console.error('❌ [AI-ACCURACY] Error in AI evaluation:', error);
      return null;
    }
  }

  /**
   * تقييم الدقة بالطريقة التقليدية (fallback)
   * @param {string} botResponse - رد البوت
   * @param {Object} ragData - بيانات قاعدة المعرفة
   * @returns {number} - نقاط الدقة (0-100)
   */
  evaluateAccuracyTraditional(botResponse, ragData) {
    try {
      let accuracyScore = 70; // نقطة بداية متوسطة

      // إذا تم استخدام RAG
      if (ragData && ragData.used) {
        // تحقق من مطابقة المعلومات مع قاعدة البيانات
        const dataMatch = this.checkDataConsistency(botResponse, ragData.sources);
        accuracyScore += dataMatch * 0.3;

        // نقاط إضافية لاستخدام مصادر موثوقة
        accuracyScore += this.settings.ragBonus;
      }

      // تحقق من وجود معلومات خاطئة واضحة
      const errorPenalty = this.detectObviousErrors(botResponse);
      accuracyScore -= errorPenalty;

      // تحقق من التناسق الداخلي في الرد
      const consistencyScore = this.checkInternalConsistency(botResponse);
      accuracyScore += consistencyScore * 0.2;

      return Math.min(100, Math.max(0, Math.round(accuracyScore)));

    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error in traditional accuracy evaluation:', error);
      return 60;
    }
  }

  /**
   * تقييم وضوح الرد باستخدام AI ذكي
   * @param {string} userMessage - رسالة المستخدم
   * @param {string} botResponse - رد البوت
   * @returns {Promise<number>} - نقاط الوضوح (0-100)
   */
  async evaluateClarity(userMessage, botResponse) {
    try {
      //console.log(`🧠 [AI-CLARITY] Evaluating clarity with AI...`);

      // محاولة التقييم بالـ AI أولاً
      const aiScore = await this.evaluateClarityWithAI(userMessage, botResponse);
      if (aiScore !== null) {
        //console.log(`✅ [AI-CLARITY] AI evaluation successful: ${aiScore}%`);
        return aiScore;
      }

      // في حالة فشل الـ AI، لا نستخدم النظام التقليدي
      //console.log(`❌ [AI-CLARITY] AI evaluation failed - no fallback`);
      return null; // إرجاع null بدلاً من النظام التقليدي

    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error in clarity evaluation:', error);
      // لا fallback - إرجاع null
      return null;
    }
  }

  /**
   * تقييم الوضوح باستخدام الذكاء الاصطناعي
   * @param {string} userMessage - رسالة المستخدم
   * @param {string} botResponse - رد البوت
   * @returns {Promise<number|null>} - نقاط الوضوح أو null في حالة الفشل
   */
  async evaluateClarityWithAI(userMessage, botResponse) {
    try {
      const prompt = `أنت خبير في تقييم وضوح التواصل وجودة الكتابة. قيم مدى وضوح الرد للعميل.

رسالة العميل: "${userMessage}"
رد البوت: "${botResponse}"

قيم الوضوح من 0-100 بناءً على:

1. **سهولة الفهم** (30 نقطة):
   - هل الرد مفهوم بسهولة؟
   - هل اللغة بسيطة وواضحة؟
   - هل يمكن للعميل فهم المقصود بسرعة؟

2. **التنظيم والترتيب** (25 نقطة):
   - هل المعلومات مرتبة بشكل منطقي؟
   - هل الأفكار متسلسلة بوضوح؟
   - هل استخدام علامات الترقيم صحيح؟

3. **الإيجاز والدقة** (25 نقطة):
   - هل الرد مباشر وليس مطول؟
   - هل يتجنب التعقيد غير الضروري؟
   - هل كل كلمة لها معنى وفائدة؟

4. **الملاءمة للسياق** (20 نقاط):
   - هل أسلوب الرد مناسب للعميل؟
   - هل مستوى اللغة مناسب؟
   - هل يراعي طبيعة السؤال؟

أمثلة:
- رد بسيط ومباشر ومفهوم = 90-100
- رد واضح لكن فيه تعقيد قليل = 70-85
- رد مفهوم لكن مطول أو غير منظم = 50-70
- رد غامض أو معقد = 20-50
- رد غير مفهوم = 0-20

أعطي فقط الرقم من 0-100 بدون تفسير.`;

      const response = await this.callGeminiForEvaluation(`${userMessage}|||${botResponse}|||CLARITY`, userMessage, botResponse);

      if (response && response.score !== undefined) {
        const score = Math.min(100, Math.max(0, Math.round(response.score * 20))); // تحويل من 1-5 إلى 20-100
        //console.log(`🧠 [AI-CLARITY] AI score: ${score}%, confidence: ${response.confidence || 'N/A'}`);
        return score;
      }

      return null;

    } catch (error) {
      console.error('❌ [AI-CLARITY] Error in AI evaluation:', error);
      return null;
    }
  }

  /**
   * تقييم الوضوح بالطريقة التقليدية (fallback)
   * @param {string} botResponse - رد البوت
   * @returns {number} - نقاط الوضوح (0-100)
   */
  evaluateClarityTraditional(botResponse) {
    try {
      let clarityScore = 50;

      // تحليل طول الرد
      const length = botResponse.length;
      if (length > 50 && length < 500) {
        clarityScore += 20; // طول مناسب
      } else if (length < 20) {
        clarityScore -= 20; // قصير جداً
      } else if (length > 800) {
        clarityScore -= 15; // طويل جداً
      }

      // تحليل بنية الجملة
      const sentences = botResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 0) {
        const avgSentenceLength = botResponse.length / sentences.length;
        if (avgSentenceLength > 20 && avgSentenceLength < 100) {
          clarityScore += 15; // جمل بطول مناسب
        }
      }

      // تحقق من استخدام علامات الترقيم
      const punctuationScore = this.evaluatePunctuation(botResponse);
      clarityScore += punctuationScore;

      // تحقق من وجود أرقام أو قوائم منظمة
      const structureScore = this.evaluateStructure(botResponse);
      clarityScore += structureScore;

      return Math.min(100, Math.max(0, Math.round(clarityScore)));

    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error in traditional clarity evaluation:', error);
      return 60;
    }
  }

  /**
   * تقييم اكتمال الإجابة باستخدام AI ذكي
   * @param {string} userMessage - رسالة المستخدم
   * @param {string} botResponse - رد البوت
   * @returns {Promise<number>} - نقاط الاكتمال (0-100)
   */
  async evaluateCompleteness(userMessage, botResponse) {
    try {
      //console.log(`🧠 [AI-COMPLETENESS] Evaluating completeness with AI...`);

      // محاولة التقييم بالـ AI أولاً
      const aiScore = await this.evaluateCompletenessWithAI(userMessage, botResponse);
      if (aiScore !== null) {
        //console.log(`✅ [AI-COMPLETENESS] AI evaluation successful: ${aiScore}%`);
        return aiScore;
      }

      // في حالة فشل الـ AI، لا نستخدم النظام التقليدي
      //console.log(`❌ [AI-COMPLETENESS] AI evaluation failed - no fallback`);
      return null; // إرجاع null بدلاً من النظام التقليدي

    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error in completeness evaluation:', error);
      // لا fallback - إرجاع null
      return null;
    }
  }

  /**
   * تقييم الاكتمال باستخدام الذكاء الاصطناعي
   * @param {string} userMessage - رسالة المستخدم
   * @param {string} botResponse - رد البوت
   * @returns {Promise<number|null>} - نقاط الاكتمال أو null في حالة الفشل
   */
  async evaluateCompletenessWithAI(userMessage, botResponse) {
    try {
      const prompt = `أنت خبير في تقييم اكتمال الإجابات في خدمة العملاء. قيم مدى اكتمال الرد للسؤال.

رسالة العميل: "${userMessage}"
رد البوت: "${botResponse}"

قيم الاكتمال من 0-100 بناءً على:

1. **الإجابة على السؤال الأساسي** (40 نقطة):
   - هل تم الإجابة على السؤال الرئيسي؟
   - هل المعلومة الأساسية المطلوبة موجودة؟

2. **المعلومات التكميلية المهمة** (30 نقطة):
   - معلومات إضافية مفيدة للعميل
   - تفاصيل تساعد في اتخاذ القرار

3. **المعلومات الاستباقية** (20 نقطة):
   - توقع احتياجات العميل التالية
   - معلومات قد يحتاجها لاحقاً

4. **الوضوح والتنظيم** (10 نقاط):
   - ترتيب المعلومات بشكل منطقي
   - سهولة فهم الإجابة

أمثلة:
- سؤال عن السعر + رد بالسعر فقط = 70-80
- سؤال عن السعر + رد بالسعر + الألوان + المقاسات = 90-100
- سؤال عن المنتج + رد شامل بكل التفاصيل = 95-100
- رد ناقص أو غير مكتمل = 30-60

أعطي فقط الرقم من 0-100 بدون تفسير.`;

      const response = await this.callGeminiForEvaluation(`${userMessage}|||${botResponse}|||COMPLETENESS`, userMessage, botResponse);

      if (response && response.score !== undefined) {
        const score = Math.min(100, Math.max(0, Math.round(response.score * 20))); // تحويل من 1-5 إلى 20-100
        //console.log(`🧠 [AI-COMPLETENESS] AI score: ${score}%, confidence: ${response.confidence || 'N/A'}`);
        return score;
      }

      return null;

    } catch (error) {
      console.error('❌ [AI-COMPLETENESS] Error in AI evaluation:', error);
      return null;
    }
  }

  /**
   * تقييم الاكتمال بالطريقة التقليدية (fallback)
   * @param {string} userMessage - رسالة المستخدم
   * @param {string} botResponse - رد البوت
   * @returns {number} - نقاط الاكتمال (0-100)
   */
  evaluateCompletenessTraditional(userMessage, botResponse) {
    try {
      // تحديد العناصر المطلوبة في السؤال
      const requiredElements = this.identifyRequiredElements(userMessage);

      // تحقق من وجود هذه العناصر في الرد
      const providedElements = this.identifyProvidedElements(botResponse);

      // حساب نسبة الاكتمال
      const completenessRatio = this.calculateCompleteness(requiredElements, providedElements);

      let completenessScore = completenessRatio * 100;

      // نقاط إضافية للمعلومات الإضافية المفيدة
      const bonusInfo = this.identifyBonusInformation(botResponse, userMessage);
      completenessScore += bonusInfo * 5;

      return Math.min(100, Math.max(0, Math.round(completenessScore)));

    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error in traditional completeness evaluation:', error);
      return 65;
    }
  }

  /**
   * تقييم استخدام قاعدة المعرفة
   * @param {Object} ragData - بيانات RAG
   * @param {string} botResponse - رد البوت
   * @returns {number} - نقاط استخدام RAG (0-100)
   */
  evaluateRAGUsage(ragData, botResponse) {
    try {
      if (!ragData || !ragData.used) {
        // لم يتم استخدام RAG - تحقق إذا كان مطلوباً
        const needsRAG = this.shouldUseRAG(botResponse);
        return needsRAG ? 20 : 70; // نقاط منخفضة إذا كان RAG مطلوباً
      }
      
      let ragScore = 60; // نقطة بداية لاستخدام RAG
      
      // جودة المصادر المستخدمة
      const sourceQuality = this.evaluateSourceQuality(ragData.sources);
      ragScore += sourceQuality * 0.3;
      
      // مدى الاستفادة من المعلومات المسترجعة
      const utilizationScore = this.evaluateRAGUtilization(ragData, botResponse);
      ragScore += utilizationScore * 0.4;
      
      // دقة ربط المعلومات بالسياق
      const contextScore = this.evaluateContextIntegration(ragData, botResponse);
      ragScore += contextScore * 0.3;
      
      return Math.min(100, Math.max(0, Math.round(ragScore)));
      
    } catch (error) {
      console.error('❌ [AI-EVALUATOR] Error in RAG evaluation:', error);
      return 50;
    }
  }

  /**
   * حساب النتيجة الإجمالية
   * @param {Object} scores - النقاط الفردية
   * @returns {number} - النتيجة الإجمالية
   */
  calculateOverallScore(scores) {
    // أوزان المعايير المختلفة
    const weights = {
      relevance: 0.22,    // 22% - ملاءمة الرد
      accuracy: 0.22,     // 22% - دقة المعلومات
      clarity: 0.18,      // 18% - وضوح الرد
      completeness: 0.18, // 18% - اكتمال الإجابة
      ragUsage: 0.10,     // 10% - استخدام قاعدة المعرفة
      images: 0.10        // 10% - الصور المرسلة
    };

    // التحقق من وجود قيم null وإرجاع null إذا فشل التقييم بالذكاء الصناعي
    const nullScores = [];
    if (scores.relevance === null) nullScores.push('relevance');
    if (scores.accuracy === null) nullScores.push('accuracy');
    if (scores.clarity === null) nullScores.push('clarity');
    if (scores.completeness === null) nullScores.push('completeness');

    if (nullScores.length > 0) {
      //console.log(`❌ [EVALUATOR] Cannot calculate overall score - AI evaluation failed for: ${nullScores.join(', ')}`);
      return null; // إرجاع null إذا فشل أي تقييم بالذكاء الصناعي
    }

    const weightedScore =
      (scores.relevance * weights.relevance) +
      (scores.accuracy * weights.accuracy) +
      (scores.clarity * weights.clarity) +
      (scores.completeness * weights.completeness) +
      (scores.ragUsage * weights.ragUsage) +
      ((scores.images || 80) * weights.images); // قيمة افتراضية 80 للصور

    return Math.round(weightedScore);
  }

  /**
   * تحديد مستوى الجودة
   * @param {number} score - النتيجة الإجمالية
   * @returns {string} - مستوى الجودة
   */
  determineQualityLevel(score) {
    if (score >= this.settings.excellentThreshold) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= this.settings.minScoreThreshold) return 'acceptable';
    if (score >= 40) return 'poor';
    return 'very_poor';
  }

  // دوال مساعدة للتحليل
  extractKeywords(text) {
    // استخراج الكلمات المفتاحية من النص
    return text.toLowerCase()
      .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 10); // أهم 10 كلمات
  }

  calculateKeywordMatch(keywords1, keywords2) {
    if (keywords1.length === 0) return 0;

    // معالجة خاصة للكلمات القصيرة أو التأكيدات
    if (keywords1.length === 1 && keywords1[0].length <= 3) {
      // إذا كان السؤال كلمة واحدة قصيرة (مثل "اه")، نعطي درجة متوسطة
      return 60;
    }

    // قاموس المترادفات
    const synonyms = {
      'مقاس': ['مقاسات', 'متاح', 'متاحة'],
      'مقاسات': ['مقاس', 'متاح', 'متاحة'],
      'كام': ['كم', 'عدد', 'كمية'],
      'صور': ['صورة', 'شكل', 'صوره'],
      'صورة': ['صور', 'شكل', 'صوره'],
      'لون': ['ألوان', 'لونه'],
      'ألوان': ['لون', 'لونه'],
      'متوفر': ['موجود', 'متاح'],
      'موجود': ['متوفر', 'متاح'],
      'شحن': ['توصيل', 'وصول'],
      'توصيل': ['شحن', 'وصول']
    };

    let matches = 0;

    // فحص التطابق المباشر والمترادفات
    for (const word1 of keywords1) {
      // تطابق مباشر
      if (keywords2.includes(word1)) {
        matches++;
        continue;
      }

      // فحص المترادفات
      if (synonyms[word1]) {
        const foundSynonym = synonyms[word1].some(synonym => keywords2.includes(synonym));
        if (foundSynonym) {
          matches += 0.8; // درجة أقل قليلاً للمترادفات
        }
      }

      // فحص التطابق الجزئي (للكلمات المشتقة)
      const partialMatch = keywords2.some(word2 =>
        (word1.length > 3 && word2.includes(word1)) ||
        (word2.length > 3 && word1.includes(word2))
      );
      if (partialMatch) {
        matches += 0.6; // درجة أقل للتطابق الجزئي
      }
    }

    return Math.min(100, (matches / keywords1.length) * 100);
  }

  identifyQuestionType(message) {
    // تحديد نوع السؤال بشكل أكثر دقة
    const msg = message.toLowerCase();

    // أسئلة المقاسات
    if (msg.includes('مقاس') || msg.includes('مقاسات') ||
        (msg.includes('كام') && (msg.includes('مقاس') || msg.includes('مقاسات')))) {
      return 'sizes';
    }

    // أسئلة الأسعار
    if ((msg.includes('كام') && !msg.includes('مقاس')) ||
        msg.includes('سعر') || msg.includes('ثمن') || msg.includes('بكام')) {
      return 'price';
    }

    // أسئلة التوفر
    if (msg.includes('متوفر') || msg.includes('موجود') || msg.includes('عندكم')) {
      return 'availability';
    }

    // أسئلة الشحن
    if (msg.includes('شحن') || msg.includes('توصيل') || msg.includes('وصول')) {
      return 'shipping';
    }

    // أسئلة المواصفات
    if (msg.includes('مواصفات') || msg.includes('تفاصيل') || msg.includes('وصف')) {
      return 'specifications';
    }

    // أسئلة الصور
    if (msg.includes('صور') || msg.includes('صورة') || msg.includes('شكل')) {
      return 'images';
    }

    // أسئلة الألوان
    if (msg.includes('لون') || msg.includes('ألوان') || msg.includes('أبيض') ||
        msg.includes('أسود') || msg.includes('أحمر') || msg.includes('أزرق')) {
      return 'colors';
    }

    // ردود قصيرة أو تأكيدات
    if (msg.length <= 5 || msg.includes('اه') || msg.includes('نعم') ||
        msg.includes('أوك') || msg.includes('تمام')) {
      return 'confirmation';
    }

    return 'general';
  }

  identifyResponseType(response) {
    // تحديد نوع الإجابة بشكل محسن
    const resp = response.toLowerCase();

    // إجابات المقاسات
    if (resp.includes('مقاس') || resp.includes('مقاسات') ||
        /من \d+ لحد \d+/.test(resp) || /\d+ إلى \d+/.test(resp)) {
      return 'sizes';
    }

    // إجابات الصور
    if (resp.includes('صور') || resp.includes('صورة') ||
        resp.includes('بتوصلك') || resp.includes('هبعتلك')) {
      return 'images';
    }

    // إجابات الألوان
    if (resp.includes('لون') || resp.includes('ألوان') || resp.includes('أبيض') ||
        resp.includes('أسود') || resp.includes('أحمر') || resp.includes('أزرق') ||
        resp.includes('بيج') || resp.includes('اابيج')) {
      return 'colors';
    }

    // إجابات تأكيدية
    if (resp.includes('تمام') || resp.includes('أهلاً') || resp.includes('حاضر') ||
        resp.includes('خلاص') || resp.includes('عشان نكمل')) {
      return 'confirmation';
    }

    // إجابات الأسعار
    if (/\d+\s*(جنيه|ريال|درهم)/.test(resp)) return 'price';

    // إجابات التوفر
    if (resp.includes('متوفر') || resp.includes('موجود')) return 'availability';

    // إجابات الشحن
    if (resp.includes('شحن') || resp.includes('توصيل') || resp.includes('محافظة')) return 'shipping';

    // إجابات المواصفات
    if (resp.includes('مواصفات') || resp.includes('تفاصيل')) return 'specifications';

    return 'general';
  }

  calculateTypeMatch(questionType, responseType) {
    // تطابق مثالي
    if (questionType === responseType) {
      return 100;
    }

    // تطابقات منطقية مقبولة
    const compatibleTypes = {
      'confirmation': ['confirmation', 'general', 'images', 'sizes', 'colors'], // التأكيدات تقبل أي رد
      'general': ['general', 'confirmation'], // الأسئلة العامة تقبل ردود عامة أو تأكيدية
      'images': ['images', 'confirmation', 'general'], // طلب الصور يمكن أن يُرد عليه بتأكيد
      'sizes': ['sizes', 'general'], // أسئلة المقاسات يمكن أن تُرد عليها بمعلومات عامة
      'colors': ['colors', 'general'], // أسئلة الألوان يمكن أن تُرد عليها بمعلومات عامة
      'price': ['price', 'general'], // أسئلة الأسعار يمكن أن تُرد عليها بمعلومات عامة
      'availability': ['availability', 'general'],
      'shipping': ['shipping', 'general'],
      'specifications': ['specifications', 'general']
    };

    // فحص التوافق
    if (compatibleTypes[questionType] && compatibleTypes[questionType].includes(responseType)) {
      return 80; // درجة جيدة للتطابق المنطقي
    }

    // حالات خاصة للردود التأكيدية
    if (responseType === 'confirmation' && questionType !== 'confirmation') {
      return 70; // الردود التأكيدية مقبولة نسبياً
    }

    // عدم تطابق
    return 40;
  }

  /**
   * تحليل المشاعر والرضا من رسالة العميل
   * @param {string} customerMessage - رسالة العميل
   * @param {string} botResponse - رد البوت (اختياري للسياق)
   * @returns {Object} نتيجة تحليل المشاعر
   */
  async analyzeSentiment(customerMessage, botResponse = '') {
    try {
      // إذا كانت الرسالة فارغة أو قصيرة جداً
      if (!customerMessage || customerMessage.trim().length < 2) {
        return {
          score: 50,
          level: 'neutral',
          confidence: 0.3,
          keywords: [],
          reasoning: 'رسالة قصيرة جداً أو فارغة'
        };
      }

      // التحليل السريع بالكلمات المفتاحية أولاً
      const quickAnalysis = this.quickSentimentAnalysis(customerMessage);

      // إذا كان التحليل السريع واضح، نستخدمه
      if (quickAnalysis.confidence > 0.8) {
        return quickAnalysis;
      }

      // استخدام AI للتحليل المتقدم
      const aiAnalysis = await this.aiSentimentAnalysis(customerMessage, botResponse, companyId);

      // دمج النتائج
      return this.combineSentimentResults(quickAnalysis, aiAnalysis);

    } catch (error) {
      console.error('❌ [SENTIMENT-ANALYZER] Error analyzing sentiment:', error);
      return {
        score: 50,
        level: 'neutral',
        confidence: 0.2,
        keywords: [],
        reasoning: 'خطأ في التحليل'
      };
    }
  }

  /**
   * تحليل سريع للمشاعر بالكلمات المفتاحية
   */
  quickSentimentAnalysis(message) {
    const msg = message.toLowerCase();
    //console.log(`🔍 [SENTIMENT-DEBUG] Analyzing message: "${msg}"`);

    // كلمات إيجابية قوية (تعبر عن رضا أو سعادة)
    const veryPositive = ['ممتاز', 'رائع', 'تحفة', 'شكراً كتير', 'بجد تسلم', 'فوق الممتاز', 'حلو اوي', 'جميل جداً'];
    const positive = ['شكراً', 'تمام', 'كويس', 'حلو', 'جميل', 'أوك', 'تسلم', 'ممكن', 'أهلاً', 'مرحبا', 'السلام عليكم'];

    // كلمات سلبية قوية (تعبر عن غضب أو إحباط)
    const veryNegative = ['فظيع', 'وحش', 'مش كده خالص', 'غلط تماماً', 'مش فاهم حاجة', 'زهقت', 'مش راضي'];
    const negative = ['مش كده', 'لا', 'غلط', 'مش عايز', 'مش مناسب', 'مش صح', 'مش عاجبني', 'مش كويس'];

    // كلمات محايدة (أسئلة عادية أو طلبات)
    const neutral = ['اه', 'أوك', 'حاضر', 'ممكن', 'يعني', 'كام', 'إيه', 'ازاي', 'فين', 'متى'];

    // كلمات استعجال أو قلق (تقلل الدرجة قليلاً)
    const urgent = ['بسرعة', 'عاجل', 'مستعجل', 'ضروري', 'لازم'];

    // كلمات مهذبة (تزيد الدرجة قليلاً)
    const polite = ['لو سمحت', 'من فضلك', 'ممكن', 'عايز', 'محتاج'];

    let score = 50;
    let level = 'neutral';
    let confidence = 0.5;
    let keywords = [];

    // فحص الكلمات الإيجابية القوية
    for (const word of veryPositive) {
      if (msg.includes(word)) {
        //console.log(`✅ [SENTIMENT-DEBUG] Found very positive word: "${word}"`);
        score = Math.min(100, score + 25);
        keywords.push(word);
        confidence = 0.9;
      }
    }

    // فحص الكلمات الإيجابية
    for (const word of positive) {
      if (msg.includes(word)) {
        score = Math.min(100, score + 15);
        keywords.push(word);
        confidence = Math.max(confidence, 0.7);
      }
    }

    // فحص الكلمات السلبية القوية
    for (const word of veryNegative) {
      if (msg.includes(word)) {
        score = Math.max(0, score - 30);
        keywords.push(word);
        confidence = 0.9;
      }
    }

    // فحص الكلمات السلبية
    for (const word of negative) {
      if (msg.includes(word)) {
        score = Math.max(0, score - 20);
        keywords.push(word);
        confidence = Math.max(confidence, 0.7);
      }
    }

    // فحص كلمات الاستعجال (تقلل الدرجة قليلاً)
    for (const word of urgent) {
      if (msg.includes(word)) {
        score = Math.max(0, score - 10);
        keywords.push(word);
        confidence = Math.max(confidence, 0.6);
      }
    }

    // فحص الكلمات المهذبة (تزيد الدرجة قليلاً)
    for (const word of polite) {
      if (msg.includes(word)) {
        score = Math.min(100, score + 5);
        keywords.push(word);
        confidence = Math.max(confidence, 0.6);
      }
    }

    // تحديد المستوى
    if (score >= 85) level = 'very_satisfied';
    else if (score >= 70) level = 'satisfied';
    else if (score >= 40) level = 'neutral';
    else if (score >= 25) level = 'dissatisfied';
    else level = 'very_dissatisfied';

    return {
      score,
      level,
      confidence,
      keywords: [...new Set(keywords)], // إزالة التكرار
      reasoning: 'تحليل بالكلمات المفتاحية'
    };
  }

  /**
   * تحليل متقدم للمشاعر باستخدام AI
   */
  async aiSentimentAnalysis(customerMessage, botResponse, companyId) {
    try {
      const prompt = `
أنت خبير في تحليل المشاعر والرضا من النصوص العربية. حلل رسالة العميل التالية:

رسالة العميل: "${customerMessage}"
${botResponse ? `رد البوت: "${botResponse}"` : ''}

المطلوب تحليل الحالة النفسية والتوقعات للعميل من رسالته:

إذا كانت الرسالة:
- سؤال عادي أو طلب معلومات → تحليل نبرة السؤال (مهذب، عادي، مستعجل، غاضب)
- شكوى أو مشكلة → تحليل مستوى الإحباط
- طلب مساعدة → تحليل مستوى الحاجة والتوقعات
- تحية أو ترحيب → تحليل الود والإيجابية

أعطي:
1. درجة من 0-100 (0 = غاضب/محبط جداً، 50 = محايد/عادي، 100 = سعيد/راضي جداً)
2. مستوى المشاعر: very_satisfied, satisfied, neutral, dissatisfied, very_dissatisfied
3. مستوى الثقة في التحليل من 0.0-1.0
4. الكلمات المفتاحية التي أثرت في القرار
5. سبب التقييم

أجب بصيغة JSON فقط:
{
  "score": 85,
  "level": "satisfied",
  "confidence": 0.9,
  "keywords": ["شكراً", "ممتاز"],
  "reasoning": "العميل استخدم كلمات إيجابية وأظهر رضا واضح"
}`;

      // الحصول على نموذج AI متاح
      const availableModel = await this.getAvailableModel(companyId);
      if (!availableModel) {
        throw new Error('No AI model available');
      }

      // إرسال للـ AI
      const response = await this.callAI(prompt, availableModel, companyId);

      // تحليل الاستجابة
      const result = this.parseAISentimentResponse(response);

      return {
        ...result,
        reasoning: result.reasoning + ' (تحليل AI)'
      };

    } catch (error) {
      console.error('❌ [AI-SENTIMENT] Error in AI sentiment analysis:', error);
      return {
        score: 50,
        level: 'neutral',
        confidence: 0.3,
        keywords: [],
        reasoning: 'فشل في التحليل بالـ AI'
      };
    }
  }

  /**
   * تحليل استجابة AI لتحليل المشاعر
   */
  parseAISentimentResponse(response) {
    try {
      // محاولة تحليل JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // التحقق من صحة البيانات
        return {
          score: Math.max(0, Math.min(100, parsed.score || 50)),
          level: this.validateSentimentLevel(parsed.level) || 'neutral',
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
          reasoning: parsed.reasoning || 'تحليل AI'
        };
      }

      // إذا فشل تحليل JSON، نحاول استخراج المعلومات
      return this.extractSentimentFromText(response);

    } catch (error) {
      console.error('❌ [AI-SENTIMENT] Error parsing AI response:', error);
      return {
        score: 50,
        level: 'neutral',
        confidence: 0.3,
        keywords: [],
        reasoning: 'خطأ في تحليل استجابة AI'
      };
    }
  }

  /**
   * التحقق من صحة مستوى المشاعر
   */
  validateSentimentLevel(level) {
    const validLevels = ['very_satisfied', 'satisfied', 'neutral', 'dissatisfied', 'very_dissatisfied'];
    return validLevels.includes(level) ? level : null;
  }

  /**
   * استخراج المشاعر من النص إذا فشل تحليل JSON
   */
  extractSentimentFromText(text) {
    let score = 50;
    let level = 'neutral';

    // البحث عن كلمات مفتاحية في النص
    if (text.includes('راضي جداً') || text.includes('ممتاز')) {
      score = 90;
      level = 'very_satisfied';
    } else if (text.includes('راضي') || text.includes('إيجابي')) {
      score = 75;
      level = 'satisfied';
    } else if (text.includes('غاضب') || text.includes('سلبي')) {
      score = 25;
      level = 'dissatisfied';
    }

    return {
      score,
      level,
      confidence: 0.4,
      keywords: [],
      reasoning: 'استخراج من نص AI'
    };
  }

  /**
   * دمج نتائج التحليل السريع والـ AI
   */
  combineSentimentResults(quickAnalysis, aiAnalysis) {
    // إعطاء وزن أكبر للتحليل الأكثر ثقة
    const quickWeight = quickAnalysis.confidence;
    const aiWeight = aiAnalysis.confidence;
    const totalWeight = quickWeight + aiWeight;

    if (totalWeight === 0) {
      return quickAnalysis;
    }

    // حساب المتوسط المرجح
    const combinedScore = Math.round(
      (quickAnalysis.score * quickWeight + aiAnalysis.score * aiWeight) / totalWeight
    );

    // اختيار المستوى بناءً على الدرجة المدمجة
    let combinedLevel = 'neutral';
    if (combinedScore >= 85) combinedLevel = 'very_satisfied';
    else if (combinedScore >= 70) combinedLevel = 'satisfied';
    else if (combinedScore >= 40) combinedLevel = 'neutral';
    else if (combinedScore >= 25) combinedLevel = 'dissatisfied';
    else combinedLevel = 'very_dissatisfied';

    return {
      score: combinedScore,
      level: combinedLevel,
      confidence: Math.max(quickAnalysis.confidence, aiAnalysis.confidence),
      keywords: [...new Set([...quickAnalysis.keywords, ...aiAnalysis.keywords])],
      reasoning: `دمج التحليل السريع (${quickAnalysis.confidence.toFixed(2)}) والـ AI (${aiAnalysis.confidence.toFixed(2)})`
    };
  }

  /**
   * الحصول على نموذج AI متاح
   */
  async getAvailableModel(companyId = null) {
    try {
      // استخدام نفس نظام إدارة المفاتيح الموجود في النظام
      const aiAgentService = require('./aiAgentService');
      const availableKey = await aiAgentService.getActiveGeminiKey(companyId);

      if (availableKey) {
        return {
          model: availableKey.model,
          keyId: availableKey.keyId,
          apiKey: availableKey.apiKey
        };
      }

      return null;
    } catch (error) {
      console.error('❌ [SENTIMENT-AI] Error getting available model:', error);
      return null;
    }
  }

  /**
   * استدعاء AI للتحليل
   */
  async callAI(prompt, modelInfo, companyId = null) {
    try {
      // استخدام نظام مباشر مع Gemini مع نظام التبديل
      const aiAgentService = require('./aiAgentService');

      //console.log(`🧠 [SENTIMENT-AI] بدء التحليل...`);

      // الحصول على النموذج النشط الحالي مع تمرير companyId
      const currentModel = await aiAgentService.getCurrentActiveModel(companyId);
      if (!currentModel) {
        console.error('❌ [SENTIMENT-AI] No active model found');
        throw new Error('No active model found');
      }

      //console.log(`🧠 [SENTIMENT-AI] استخدام النموذج: ${currentModel.model}`);

      const { GoogleGenerativeAI } = require('@google/generative-ai');

      let result;
      let usedModel = currentModel;

      try {
        // محاولة أولى مع النموذج الحالي
        const genAI = new GoogleGenerativeAI(currentModel.apiKey);
        const model = genAI.getGenerativeModel({
          model: currentModel.model,
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.1,
          }
        });

        result = await model.generateContent(prompt);
        //console.log(`✅ [SENTIMENT-AI] نجح التحليل مع النموذج: ${currentModel.model}`);

      } catch (error) {
        //console.log(`⚠️ [SENTIMENT-AI] خطأ مع النموذج ${currentModel.model}:`, error.message);

        // فحص إذا كان خطأ 429 (تجاوز الحد)
        if (error.status === 429 || error.message.includes('429') || error.message.includes('Too Many Requests')) {

          //console.log('🔄 [SENTIMENT-AI] تم تجاوز حد النموذج، محاولة التبديل...');

          // محاولة الحصول على نموذج بديل
          const backupModel = await aiAgentService.findNextAvailableModel();
          //console.log(`🔍 [SENTIMENT-AI] نتيجة البحث عن نموذج بديل:`, backupModel ? `${backupModel.model}` : 'لا يوجد');

          if (backupModel) {
            //console.log(`🔄 [SENTIMENT-AI] التبديل إلى النموذج البديل: ${backupModel.model}`);

            try {
              const genAI = new GoogleGenerativeAI(backupModel.apiKey);
              const model = genAI.getGenerativeModel({
                model: backupModel.model,
                generationConfig: {
                  maxOutputTokens: 100,
                  temperature: 0.1,
                }
              });

              result = await model.generateContent(prompt);
              usedModel = backupModel;

              // تحديث النموذج النشط
              aiAgentService.updateCurrentActiveModel(backupModel);

            } catch (retryError) {
              console.error('❌ [SENTIMENT-AI] فشل النموذج البديل أيضاً:', retryError.message);
              throw retryError;
            }
          } else {
            console.error('❌ [SENTIMENT-AI] لا يوجد نموذج بديل متاح');
            throw error;
          }
        } else {
          throw error;
        }
      }

      const response = await result.response;
      const text = response.text();

      //console.log(`✅ [SENTIMENT-AI] نجح التحليل مع النموذج: ${usedModel.model} - "${text.substring(0, 50)}..."`);
      return text;

    } catch (error) {
      console.error('❌ [SENTIMENT-AI] Error calling AI:', error.message);
      throw error;
    }
  }

  // المزيد من الدوال المساعدة...
  checkDataConsistency(response, sources) {
    // فحص تطابق البيانات مع المصادر
    return 80; // قيمة افتراضية
  }

  detectObviousErrors(response) {
    // كشف الأخطاء الواضحة
    return 0; // لا توجد أخطاء افتراضياً
  }

  checkInternalConsistency(response) {
    // فحص التناسق الداخلي
    return 15; // قيمة افتراضية
  }

  evaluatePunctuation(response) {
    // تقييم علامات الترقيم
    const punctuationCount = (response.match(/[.!?،؛]/g) || []).length;
    return Math.min(10, punctuationCount * 2);
  }

  evaluateStructure(response) {
    // تقييم البنية والتنظيم
    const hasNumbers = /\d/.test(response);
    const hasBullets = /[•\-\*]/.test(response);
    return (hasNumbers ? 5 : 0) + (hasBullets ? 5 : 0);
  }

  identifyRequiredElements(message) {
    // تحديد العناصر المطلوبة
    const elements = [];
    if (message.includes('سعر')) elements.push('price');
    if (message.includes('متوفر')) elements.push('availability');
    if (message.includes('شحن')) elements.push('shipping');
    return elements;
  }

  identifyProvidedElements(response) {
    // تحديد العناصر المقدمة
    const elements = [];
    if (/\d+\s*(جنيه|ريال|درهم)/.test(response)) elements.push('price');
    if (response.includes('متوفر') || response.includes('موجود')) elements.push('availability');
    if (response.includes('شحن') || response.includes('توصيل')) elements.push('shipping');
    return elements;
  }

  calculateCompleteness(required, provided) {
    if (required.length === 0) return 1;
    const matches = required.filter(elem => provided.includes(elem));
    return matches.length / required.length;
  }

  identifyBonusInformation(response, question) {
    // تحديد المعلومات الإضافية المفيدة
    return 2; // قيمة افتراضية
  }

  shouldUseRAG(response) {
    // تحديد إذا كان RAG مطلوباً
    return response.includes('معلومات') || response.includes('تفاصيل');
  }

  evaluateSourceQuality(sources) {
    // تقييم جودة المصادر
    return sources && sources.length > 0 ? 20 : 0;
  }

  evaluateRAGUtilization(ragData, response) {
    // تقييم الاستفادة من RAG
    return 15; // قيمة افتراضية
  }

  evaluateContextIntegration(ragData, response) {
    // تقييم دمج السياق
    return 15; // قيمة افتراضية
  }

  identifyIssues(scores) {
    const issues = [];
    if (scores.relevance < 60) issues.push('الرد غير مناسب للسؤال');
    if (scores.accuracy < 60) issues.push('دقة المعلومات منخفضة');
    if (scores.clarity < 60) issues.push('الرد غير واضح');
    if (scores.completeness < 60) issues.push('الإجابة غير مكتملة');
    if (scores.ragUsage < 50) issues.push('لم يتم استخدام قاعدة المعرفة بشكل مناسب');
    return issues;
  }

  generateRecommendations(scores) {
    const recommendations = [];
    if (scores.relevance < 70) recommendations.push('تحسين فهم السؤال والرد المناسب');
    if (scores.accuracy < 70) recommendations.push('التحقق من دقة المعلومات المقدمة');
    if (scores.clarity < 70) recommendations.push('تحسين وضوح الصياغة');
    if (scores.completeness < 70) recommendations.push('تقديم إجابة أكثر تفصيلاً');
    if (scores.ragUsage < 60) recommendations.push('الاستفادة أكثر من قاعدة المعرفة');
    return recommendations;
  }

  updateMetrics(scores) {
    // تحديث المقاييس العامة
    this.qualityMetrics.relevance.push(scores.relevance);
    this.qualityMetrics.accuracy.push(scores.accuracy);
    this.qualityMetrics.clarity.push(scores.clarity);
    this.qualityMetrics.completeness.push(scores.completeness);
    this.qualityMetrics.ragUsage.push(scores.ragUsage);

    // الاحتفاظ بآخر 1000 تقييم فقط
    Object.keys(this.qualityMetrics).forEach(key => {
      if (this.qualityMetrics[key].length > 1000) {
        this.qualityMetrics[key] = this.qualityMetrics[key].slice(-1000);
      }
    });
  }

  /**
   * الحصول على إحصائيات الجودة العامة
   * @returns {Object} - إحصائيات شاملة
   */
  getQualityStatistics() {
    const stats = {};
    
    Object.keys(this.qualityMetrics).forEach(metric => {
      const values = this.qualityMetrics[metric];
      if (values.length > 0) {
        stats[metric] = {
          average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
          trend: this.calculateTrend(values)
        };
      } else {
        stats[metric] = {
          average: 0,
          min: 0,
          max: 0,
          count: 0,
          trend: 'stable'
        };
      }
    });

    // إحصائيات إضافية
    stats.overall = {
      totalEvaluations: this.evaluationHistory.size,
      averageScore: this.calculateOverallAverage(),
      qualityDistribution: this.getQualityDistribution(),
      issuesCount: this.getIssuesCount(),
      topIssues: this.getTopIssues()
    };

    return stats;
  }

  calculateTrend(values) {
    if (values.length < 10) return 'stable';
    
    const recent = values.slice(-10);
    const previous = values.slice(-20, -10);
    
    if (previous.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  calculateOverallAverage() {
    if (this.evaluationHistory.size === 0) return 0;
    
    let totalScore = 0;
    for (const evaluation of this.evaluationHistory.values()) {
      totalScore += evaluation.scores.overall;
    }
    
    return Math.round(totalScore / this.evaluationHistory.size);
  }

  getQualityDistribution() {
    const distribution = {
      excellent: 0,
      good: 0,
      acceptable: 0,
      poor: 0,
      very_poor: 0
    };

    for (const evaluation of this.evaluationHistory.values()) {
      distribution[evaluation.qualityLevel]++;
    }

    return distribution;
  }

  getIssuesCount() {
    let totalIssues = 0;
    for (const evaluation of this.evaluationHistory.values()) {
      totalIssues += evaluation.issues.length;
    }
    return totalIssues;
  }

  getTopIssues() {
    const issueCount = {};
    
    for (const evaluation of this.evaluationHistory.values()) {
      evaluation.issues.forEach(issue => {
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      });
    }

    return Object.entries(issueCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }));
  }

  /**
   * الحصول على تقييم رسالة محددة
   * @param {string} messageId - معرف الرسالة
   * @returns {Object|null} - التقييم المفصل
   */
  getEvaluation(messageId) {
    return this.evaluationHistory.get(messageId) || null;
  }

  /**
   * الحصول على آخر التقييمات
   * @param {number} limit - عدد التقييمات
   * @returns {Array} - قائمة التقييمات
   */
  getRecentEvaluations(limit = 10) {
    const evaluations = Array.from(this.evaluationHistory.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    return evaluations;
  }

  /**
   * استدعاء Gemini لتقييم الجودة مع نظام التبديل الذكي
   * @param {string} prompt - النص المرسل للـ AI (أو userMessage|||botResponse|||TYPE)
   * @param {string} userMessage - رسالة العميل (اختياري)
   * @param {string} botResponse - رد البوت (اختياري)
   * @returns {Promise<Object|null>} - نتيجة التقييم
   */
  async callGeminiForEvaluation(prompt, userMessage = null, botResponse = null) {
    //console.log(`🧠 [AI-EVALUATION] بدء التقييم المحسن...`);

    try {
      // استخدام نظام مباشر مع Gemini للتقييم السريع
      const aiAgentService = require('./aiAgentService');

      // الحصول على النموذج النشط الحالي
      const currentModel = await aiAgentService.getCurrentActiveModel();
      if (!currentModel) {
        console.error('❌ [AI-EVALUATION] No active model found');
        return null;
      }

      //console.log(`🧠 [AI-EVALUATION] استخدام النموذج: ${currentModel.model}`);

      // تحليل الـ prompt لاستخراج المعلومات
      let actualUserMessage = userMessage;
      let actualBotResponse = botResponse;
      let evaluationType = 'GENERAL';

      // إذا كان الـ prompt يحتوي على تنسيق خاص
      if (prompt.includes('|||')) {
        const parts = prompt.split('|||');
        if (parts.length >= 3) {
          actualUserMessage = parts[0];
          actualBotResponse = parts[1];
          evaluationType = parts[2];
        }
      } else {
        actualBotResponse = prompt;
      }

      // استخدام prompt مفصل ومحسن مع أمثلة واضحة
      const evaluationPrompt = `You are an expert customer service quality evaluator. Your job is to rate customer service responses on a scale of 1-5.

CUSTOMER'S ORIGINAL QUESTION:
"${actualUserMessage || 'غير محدد'}"

CUSTOMER SERVICE RESPONSE TO EVALUATE:
"${actualBotResponse ? actualBotResponse.substring(0, 200) : prompt.substring(0, 200)}"

EVALUATION CRITERIA:
- Helpfulness: Does it answer the customer's question?
- Completeness: Does it provide all necessary information?
- Clarity: Is it easy to understand?
- Professionalism: Is the tone appropriate and friendly?
- Accuracy: Is the information correct?

RATING SCALE WITH EXAMPLES:

5 = EXCELLENT
- Fully answers customer question
- Provides complete, accurate information
- Professional and friendly tone
- Clear and easy to understand
Example: "تمام يا قمر، السعر 299 جنيه والشحن 50 جنيه. التوصيل خلال 2-3 أيام. عايزة تأكدي الأوردر؟"

4 = GOOD
- Answers most of the question
- Provides helpful information
- Professional tone
- Mostly clear
Example: "السعر 299 جنيه. الشحن حسب المحافظة. متاح بألوان مختلفة."

3 = AVERAGE
- Partially answers question
- Some helpful information
- Acceptable tone
- Somewhat clear
Example: "المنتج متاح. السعر كويس. ممكن تشوفي الألوان."

2 = POOR
- Barely addresses question
- Limited helpful information
- Unprofessional or unclear
Example: "ممكن. شوفي كده."

1 = VERY POOR
- Doesn't answer question
- Unhelpful or confusing
- Very unprofessional
Example: "مش عارف." or "ايه ده؟"

IMPORTANT: Respond with ONLY the number (1, 2, 3, 4, or 5). No explanation needed.

Your rating:`;

      //console.log(`🧠 [AI-EVALUATION] إرسال طلب التقييم...`);

      // استخدام Gemini مباشرة مع إعدادات محددة للتقييم
      const { GoogleGenerativeAI } = require('@google/generative-ai');

      let result;
      let usedModel = currentModel;

      try {
        // محاولة أولى مع النموذج الحالي
        const genAI = new GoogleGenerativeAI(currentModel.apiKey);
        const model = genAI.getGenerativeModel({
          model: currentModel.model,
          generationConfig: {
            maxOutputTokens: 50, // مساحة كافية للرد
            temperature: 0.1,
            topP: 0.1,
            topK: 1
          }
        });

        // timeout قصير جداً
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Evaluation timeout')), 5000);
        });

        const aiResponsePromise = model.generateContent(evaluationPrompt);
        result = await Promise.race([aiResponsePromise, timeoutPromise]);

        //console.log(`✅ [AI-EVALUATION] نجح التقييم مع النموذج: ${currentModel.model}`);

      } catch (error) {
        //console.log(`⚠️ [AI-EVALUATION] خطأ مع النموذج ${currentModel.model}:`, error.message);

        // فحص إذا كان خطأ 429 (تجاوز الحد)
        if (error.status === 429 || error.message.includes('429') || error.message.includes('Too Many Requests')) {
          //console.log('🔄 [AI-EVALUATION] تم تجاوز حد النموذج، محاولة التبديل...');

          // محاولة الحصول على نموذج بديل مع تمرير companyId
          const backupModel = await aiAgentService.findNextAvailableModel(companyId);
          //console.log(`🔍 [AI-EVALUATION] نتيجة البحث عن نموذج بديل:`, backupModel ? `${backupModel.model}` : 'لا يوجد');

          if (backupModel) {
            //console.log(`🔄 [AI-EVALUATION] التبديل إلى النموذج البديل: ${backupModel.model}`);

            try {
              const genAI = new GoogleGenerativeAI(backupModel.apiKey);
              const model = genAI.getGenerativeModel({
                model: backupModel.model,
                generationConfig: {
                  maxOutputTokens: 50,
                  temperature: 0.1,
                  topP: 0.1,
                  topK: 1
                }
              });

              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Evaluation timeout')), 5000);
              });

              const aiResponsePromise = model.generateContent(evaluationPrompt);
              result = await Promise.race([aiResponsePromise, timeoutPromise]);
              usedModel = backupModel;

              // تحديث النموذج النشط
              aiAgentService.updateCurrentActiveModel(backupModel);

            } catch (retryError) {
              console.error('❌ [AI-EVALUATION] فشل النموذج البديل أيضاً:', retryError.message);
              throw retryError;
            }
          } else {
            console.error('❌ [AI-EVALUATION] لا يوجد نموذج بديل متاح');
            throw error;
          }
        } else {
          throw error;
        }
      }

      const response = await result.response;
      const text = response.text().trim();

      //console.log(`🧠 [AI-EVALUATION] رد التقييم: "${text}" من ${usedModel.model}`);

      // تنظيف النص وتحليله بطرق متعددة
      const cleanText = text.trim();
      let score = null;

      // الطريقة 1: البحث عن رقم مباشر في بداية النص
      const directMatch = cleanText.match(/^([1-5])/);
      if (directMatch) {
        score = parseInt(directMatch[1]);
        //console.log(`🎯 [AI-EVALUATION] وجد رقم مباشر: ${score}`);
      }

      // الطريقة 2: البحث عن رقم في أي مكان
      if (!score) {
        const anyMatch = cleanText.match(/\b([1-5])\b/);
        if (anyMatch) {
          score = parseInt(anyMatch[1]);
          //console.log(`🎯 [AI-EVALUATION] وجد رقم في النص: ${score}`);
        }
      }

      // الطريقة 3: البحث عن أرقام فقط
      if (!score) {
        const numbersOnly = cleanText.replace(/[^\d]/g, '');
        if (numbersOnly.length === 1 && /[1-5]/.test(numbersOnly)) {
          score = parseInt(numbersOnly);
          //console.log(`🎯 [AI-EVALUATION] استخرج رقم من النص: ${score}`);
        }
      }

      if (score && score >= 1 && score <= 5) {
        // تحويل من 1-5 إلى 1-100
        const convertedScore = score * 20; // 1->20, 2->40, 3->60, 4->80, 5->100
        //console.log(`✅ [AI-EVALUATION] تقييم ناجح: ${score}/5 (${convertedScore}%) من ${usedModel.model}`);
        return {
          score: convertedScore,
          confidence: 0.9,
          rawResponse: text,
          model: usedModel.model,
          keyId: usedModel.keyId
        };
      }

      // إذا لم نحصل على رقم، نعطي تقييم افتراضي بناءً على طول الرد
      const responseLength = prompt.length;
      let defaultScore = 75; // تقييم متوسط افتراضي

      if (responseLength > 100) defaultScore = 80; // رد طويل = أفضل
      if (responseLength < 20) defaultScore = 60;  // رد قصير = أقل

      //console.log(`⚠️ [AI-EVALUATION] لم يتم العثور على رقم صحيح (1-5)، استخدام تقييم افتراضي: ${defaultScore}%`);

      return {
        score: defaultScore,
        confidence: 0.5,
        rawResponse: text,
        model: usedModel.model,
        keyId: usedModel.keyId,
        fallback: true
      };

    } catch (error) {
      console.error('❌ [AI-EVALUATION] Error in optimized evaluation:', error.message);

      // fallback نهائي - تقييم بناءً على طول الرد
      const responseLength = prompt.length;
      let fallbackScore = 70;

      if (responseLength > 100) fallbackScore = 75;
      if (responseLength < 20) fallbackScore = 55;

      //console.log(`🔄 [AI-EVALUATION] استخدام تقييم احتياطي: ${fallbackScore}%`);

      return {
        score: fallbackScore,
        confidence: 0.3,
        rawResponse: 'fallback evaluation',
        model: 'fallback',
        keyId: 'fallback',
        fallback: true
      };
    }
  }

  /**
   * تقييم الصور المرسلة مع الرد
   * @param {string} userMessage - رسالة العميل
   * @param {string} botResponse - رد البوت
   * @param {Array} images - الصور المرسلة
   * @returns {number} نتيجة تقييم الصور (0-100)
   */
  evaluateImages(userMessage, botResponse, images = []) {
    try {
      //console.log(`📸 [IMAGE-EVALUATION] Evaluating ${images.length} images for message: "${userMessage.substring(0, 50)}..."`);

      // إذا لم يكن هناك صور
      if (!images || images.length === 0) {
        // فحص إذا كان العميل يطلب صور
        const msg = userMessage.toLowerCase();
        const wantsImages = msg.includes('صور') || msg.includes('صورة') || msg.includes('شكل') ||
                           msg.includes('أشوف') || msg.includes('اشوف') || msg.includes('عايز أشوف') ||
                           msg.includes('ممكن أشوف') || msg.includes('عرضيلي');

        if (wantsImages) {
          //console.log(`📸 [IMAGE-EVALUATION] Customer wants images but none sent - Score: 20%`);
          return 20; // العميل يريد صور لكن لم ترسل
        } else {
          //console.log(`📸 [IMAGE-EVALUATION] No images needed - Score: 100%`);
          return 100; // لا حاجة للصور
        }
      }

      // إذا كان هناك صور
      const imageCount = images.length;
      //console.log(`📸 [IMAGE-EVALUATION] Found ${imageCount} images`);

      // فحص إذا كان العميل يطلب صور
      const msg = userMessage.toLowerCase();
      const wantsImages = msg.includes('صور') || msg.includes('صورة') || msg.includes('شكل') ||
                         msg.includes('أشوف') || msg.includes('اشوف') || msg.includes('عايز أشوف') ||
                         msg.includes('ممكن أشوف') || msg.includes('عرضيلي');

      if (wantsImages) {
        // العميل يريد صور وتم إرسالها
        const score = Math.min(100, 80 + (imageCount * 10)); // 80% أساسي + 10% لكل صورة إضافية
        //console.log(`📸 [IMAGE-EVALUATION] Customer wants images and ${imageCount} sent - Score: ${score}%`);
        return score;
      } else {
        // صور مرسلة بدون طلب (قد تكون مفيدة أو غير ضرورية)
        //console.log(`📸 [IMAGE-EVALUATION] Images sent without request - Score: 90%`);
        return 90; // صور إضافية مفيدة
      }

    } catch (error) {
      console.error('❌ [IMAGE-EVALUATION] Error evaluating images:', error);
      return 80; // تقييم افتراضي في حالة الخطأ
    }
  }
}

module.exports = AIQualityEvaluator;
