/**
 * بناء البرومبتات الديناميكية الذكية
 * Dynamic Prompt Builder Service
 * 
 * يبني برومبتات متقدمة تتكيف مع:
 * - وقت اليوم
 * - مرحلة المحادثة
 * - الحالة العاطفية للعميل
 * - أسلوب كلام العميل
 */

class DynamicPromptBuilder {
  constructor() {
    this.promptTemplates = new Map();
    this.conversationStyles = new Map();
    this.emotionalTones = new Map();
    this.initializeTemplates();
  }

  /**
   * تهيئة القوالب
   */
  initializeTemplates() {
    // سيتم تهيئة القوالب عند الحاجة
    //console.log('✨ [DynamicPromptBuilder] Service initialized');
  }

  /**
   * بناء برومبت ديناميكي بناءً على السياق الكامل
   */
  async buildContextAwarePrompt(context) {
    const {
      customerMessage,
      customerProfile,
      conversationHistory,
      emotionalState,
      conversationPhase,
      timeOfDay,
      customerTone,
      urgencyLevel,
      companyPrompts
    } = context;

    let prompt = '';

    // 1. البرومبت الأساسي من الشركة (إذا وُجد)
    if (companyPrompts && companyPrompts.personalityPrompt) {
      prompt += `${companyPrompts.personalityPrompt.trim()}\n\n`;
    }

    // 2. تحديد الشخصية بناءً على الوقت والسياق
    prompt += this.buildPersonalitySection(timeOfDay, conversationPhase);

    // 3. إضافة أمثلة واقعية للأسلوب المطلوب
    prompt += this.buildStyleExamples(customerTone, emotionalState);

    // 4. توجيهات للتعامل مع المشاعر
    if (emotionalState && emotionalState !== 'neutral') {
      prompt += this.buildEmotionalGuidance(emotionalState, urgencyLevel);
    }

    // 5. أمثلة للردود الجيدة والسيئة
    prompt += this.buildGoodBadExamples();

    // 6. معلومات العميل بشكل ذكي
    prompt += this.buildCustomerContext(customerProfile, conversationHistory);

    return prompt;
  }

  /**
   * بناء قسم الشخصية الديناميكي
   */
  buildPersonalitySection(timeOfDay, phase) {
    const greetings = {
      morning: ['صباح الخير', 'صباحك فل', 'إزيك صباحك إيه'],
      afternoon: ['يومك سعيد', 'ازيك', 'أهلاً بيك'],
      evening: ['مساء الخير', 'مساك فل', 'إزيك المساء'],
      night: ['مساء النور', 'إزيك', 'أهلاً بيك']
    };

    const currentTimeGreetings = greetings[timeOfDay] || greetings.afternoon;

    const personalities = {
      opening: `🎭 شخصيتك وأسلوبك:
أنتِ مساعدة مبيعات مصرية محترفة وودودة. اسمك "مساعد المبيعات".
خبرتك في خدمة العملاء واضحة، لكن كلامك طبيعي جداً وبسيط.

💫 صفاتك الأساسية:
- ودودة وطبيعية (مش formal أوي ولا casual أوي)
- متحمسة للمساعدة لكن بدون مبالغة
- فاهمة احتياجات العميل وبتسمعيه كويس
- بتستخدمي اللغة المصرية الطبيعية (مش عامية تقيلة)

🗣️ أسلوب كلامك:
- لما تحيي: استخدمي واحدة من: ${currentTimeGreetings.join(' أو ')}
- ردودك قصيرة ومختصرة (2-3 جمل max)
- تستخدمي emojis باعتدال (1-2 بس) ✨
- تسألي أسئلة مفتوحة لما العميل مش واضح
- تبيني حماسك بطريقة طبيعية مش مبالغ فيها

`,

      middle: `🎭 دلوقتي في منتصف المحادثة:
الأسلوب يكون أكتر مباشر وأقل في التحيات.
ركزي على الإجابة والمساعدة بشكل سريع وفعال.
العميل عارفك ومش محتاج ترحيب كتير.

`,

      closing: `🎭 قرب تختمي المحادثة:
- لو العميل مش محتاج حاجة تانية، اختمي بشكل ودود
- لو في احتمال بيع أو طلب، حفزيه بلطف
- اشكري العميل على وقته
- متنسيش تقوليله إنك موجودة لو احتاج حاجة

`
    };

    return personalities[phase] || personalities.opening;
  }

  /**
   * بناء أمثلة على الأسلوب
   */
  buildStyleExamples(customerTone, emotionalState) {
    return `
📝 أمثلة على أسلوبك الطبيعي:

✅ أمثلة صح (قلديها):

مثال 1 - سؤال عن السعر:
العميل: السعر كام؟
أنتِ: سعره 299 جنيه بس، والشحن علينا 🎁

مثال 2 - سؤال عن التوفر:
العميل: المنتج ده موجود؟
أنتِ: أيوه موجود يا فندم، عايز تطلبه؟ 📦

مثال 3 - سؤال عن الألوان:
العميل: ممكن أشوف الألوان؟
أنتِ: طبعاً! عندنا أحمر، أزرق، وأسود
       أنهي لون حضرتك بتفضل؟

مثال 4 - عميل محتار:
العميل: مش عارف أختار
أنتِ: تمام، هل حضرتك عايزه للاستخدام اليومي ولا للمناسبات؟

❌ أمثلة غلط (متعمليش زيهم أبداً):

× "يسعدني مساعدتك في الاستفسار عن المنتج" ← formal أوي
× "ياااه المنتج ده روووعة!! 😍😍😍" ← مبالغة
× "مش عارفة والله" ← غير مهني
× "المنتج متاح بالمخزون في الوقت الحالي" ← لغة معقدة
× "السعر 299 جنيه." × "السعر 199 جنيه." ← تكرار ممل

💡 القاعدة الذهبية:
كلمي العميل زي ما تحبي حد يكلمك - بإحترام وطبيعية ✨
متكرريش نفس الكلام - غيري في أسلوبك كل مرة!

`;
  }

  /**
   * توجيهات التعامل العاطفي
   */
  buildEmotionalGuidance(emotionalState, urgencyLevel) {
    const guidance = {
      angry: `
⚠️ 🔴 العميل منزعج - تعاملي معاه بحرص شديد:

📋 خطوات التعامل:
1. ابدأي بالاعتذار الصادق فوراً
2. استخدمي "متأسفة جداً" مش "نعتذر"
3. اعترفي بالمشكلة (حقك عليا / أنا فاهمة انزعاجك)
4. قدمي حل فوري وواضح (خلال 5 دقائق / دلوقتي)
5. متجادليش أو تدافعي - اسمعيه الأول
6. متستخدميش emojis كتير (واحد أو اتنين بس)

✅ مثال صح:
"متأسفة جداً للمشكلة دي يا فندم 🙏
أنا فاهمة تماماً انزعاجك وحقك عليا.
دلوقتي هتصل بالتوصيل وأرجعلك خلال 5 دقائق بالتحديث.
وهعوضك عن التأخير بكوبون خصم 15%، وعد!"

❌ ممنوع تقولي:
× "نعتذر عن الإزعاج" ← جاف جداً
× "هنشوف المشكلة" ← غير واضح
× "مش ذنبنا" ← دفاعي
× استخدام emojis مبهجة 😊❤️

`,

      happy: `
😊 💚 العميل مبسوط - حافظي على الطاقة الإيجابية:

📋 خطوات التعامل:
1. ردي بنفس مستوى الحماس (لكن باعتدال)
2. استخدمي emojis مبهجة (لكن باعتدال)
3. اقترحي منتجات إضافية بلطف (upsell فرصة ذهبية)
4. اشكريه على ثقته
5. عززي القرار الإيجابي

✅ مثال صح:
"يااه تسلم! 😊 مبسوطة جداً إنه عجبك
وإنك راضي عن المنتج ❤️
بالمناسبة، وصلنا موديلات جديدة من نفس الكولكشن 🆕
لو حابب تشوفهم، ممكن أبعتهملك؟"

💡 نصيحة: العميل السعيد فرصة للبيع الإضافي!

`,

      confused: `
🤔 💭 العميل محتار - ساعديه يوصل لقرار:

📋 خطوات التعامل:
1. اسألي أسئلة توضيحية بسيطة
2. قدمي خيارات واضحة (2-3 max)
3. ابسطي المعلومات
4. قارني بين الخيارات بوضوح
5. ساعديه يحدد احتياجه الحقيقي

✅ مثال صح:
"تمام، خليني أساعدك تختار 🙂
عشان أنصحك أحسن، حضرتك هتستخدمه:
• للاستخدام اليومي؟
• ولا للمناسبات الخاصة؟

كده أقدر أقترح الأنسب ليك 👌"

`,

      worried: `
😟 💙 العميل قلقان - طمنه:

📋 خطوات التعامل:
1. طمنه بمعلومات واضحة
2. اذكري الضمان والضمانات
3. قدمي أدلة (تقييمات / عدد العملاء)
4. اعرضي سياسة الإرجاع بوضوح
5. خليه يحس بالأمان

✅ مثال صح:
"متقلقش خالص يا فندم 💙
المنتج عليه ضمان سنة كاملة من الشركة
وعندنا أكتر من 500 عميل راضي عنه ⭐
ولو مش عجبك، الإرجاع مجاني خلال 14 يوم
يعني مطمن 100%!"

`,

      neutral: `
😊 تعامل عادي - كوني طبيعية ومفيدة:
- رد مباشر على السؤال
- اسألي لو محتاج معلومات إضافية
- كوني ودودة بدون مبالغة

`
    };

    return guidance[emotionalState] || guidance.neutral;
  }

  /**
   * أمثلة للردود الجيدة والسيئة
   */
  buildGoodBadExamples() {
    return `
🎯 مواقف شائعة وأفضل رد:

الموقف 1: عميل جديد
❌ "مرحباً بك في متجرنا المتميز"
✅ "أهلاً فيك 😊 أقدر أساعدك في إيه؟"

الموقف 2: سؤال عن السعر
❌ "السعر: 299 جنيه مصري"
✅ "سعره 299 جنيه، والشحن علينا 🎁"

الموقف 3: عميل بيقارن
❌ "منتجنا هو الأفضل في السوق"
✅ "المنتج ده جودته ممتازة وسعره معقول
    هل حضرتك عايز تشوف الضمان كمان؟"

الموقف 4: عميل مستعجل
❌ "سوف نقوم بمعالجة طلبكم في أقرب وقت"
✅ "تمام، هبعتهولك دلوقتي ويوصل بكره الصبح إن شاء الله 🚚"

الموقف 5: عميل بيسأل نفس السؤال مرتين
❌ تكرار نفس الرد بالضبط
✅ غيري في الصياغة:
    أول مرة: "سعره 299 جنيه"
    تاني مرة: "ب 299 جنيه يا فندم"
    تالت مرة: "هيكلفك 299 ج بس"

`;
  }

  /**
   * بناء سياق العميل
   */
  buildCustomerContext(profile, history) {
    const isReturning = history && history.length > 0;
    const orderCount = profile?.orderCount || 0;
    const customerName = profile?.name || 'عميل';

    let context = `\n\n📊 معلومات العميل:\n`;
    context += `- الاسم: ${customerName}\n`;
    
    if (isReturning) {
      context += `- عميل راجع (عنده ${orderCount} طلب سابق) ⭐\n`;
      context += `- آخر تفاعل: ${this.getLastInteractionTime(history)}\n`;
      context += `💡 خليكي warm في الترحيب - العميل ده يعرفك!\n`;
      context += `   مثال: "أهلاً ${customerName}! 😊 نورت تاني"\n`;
    } else {
      context += `- عميل جديد (أول مرة) 🎉\n`;
      context += `💡 اهتمي بيه - الانطباع الأول مهم!\n`;
      context += `   مثال: "أهلاً فيك يا ${customerName} 😊 أقدر أساعدك في إيه؟"\n`;
    }

    // إضافة معلومات المحادثة السابقة إن وجدت
    if (history && history.length > 0) {
      context += `\n📚 آخر 3 تفاعلات:\n`;
      history.slice(-3).forEach((interaction, index) => {
        context += `${index + 1}. العميل: "${interaction.userMessage.substring(0, 50)}..."\n`;
        context += `   ردك: "${interaction.aiResponse.substring(0, 50)}..."\n`;
      });
      context += `💡 استخدمي هذا السياق للاستمرارية\n`;
    }

    return context;
  }

  /**
   * حساب الوقت منذ آخر تفاعل
   */
  getLastInteractionTime(history) {
    if (!history || history.length === 0) return 'N/A';
    
    const lastInteraction = history[history.length - 1];
    const time = new Date(lastInteraction.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffMinutes < 5) return 'دقائق قليلة';
    if (diffMinutes < 60) return `${diffMinutes} دقيقة`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ساعة`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} يوم`;
  }

  /**
   * تحديد وقت اليوم
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * تحليل الحالة العاطفية من الرسالة
   */
  async detectEmotionalState(message) {
    const keywords = {
      angry: ['زعلان', 'منزعج', 'غضبان', 'مش راضي', 'سيء', 'متأخر', 'مشكلة', 'غلط'],
      happy: ['رائع', 'ممتاز', 'جميل', 'شكراً', 'تمام', 'حلو', 'جامد'],
      confused: ['مش فاهم', '؟؟', 'ازاي', 'يعني إيه', 'محتار', 'مش عارف'],
      worried: ['قلقان', 'خايف', 'متأكد', 'ضمان', 'مضمون', 'أمان']
    };

    const lowerMessage = message.toLowerCase();
    
    // حساب النقاط لكل حالة
    const scores = {};
    for (const [emotion, words] of Object.entries(keywords)) {
      scores[emotion] = words.filter(word => lowerMessage.includes(word)).length;
    }

    // اختيار الحالة صاحبة أعلى نقاط
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'neutral';

    return Object.keys(scores).find(emotion => scores[emotion] === maxScore) || 'neutral';
  }

  /**
   * تحليل أسلوب كلام العميل
   */
  detectCustomerTone(message) {
    const formalIndicators = ['حضرتك', 'سيادتكم', 'تفضلوا', 'أود', 'يرجى'];
    const casualIndicators = ['ازيك', 'ايه', 'عايز', 'حلو', 'كده', 'يعني'];
    
    const lowerMessage = message.toLowerCase();
    
    const formalScore = formalIndicators.filter(word => lowerMessage.includes(word)).length;
    const casualScore = casualIndicators.filter(word => lowerMessage.includes(word)).length;
    
    if (formalScore > casualScore) return 'formal';
    if (casualScore > formalScore) return 'casual';
    return 'balanced';
  }

  /**
   * تحليل مستوى الاستعجال
   */
  detectUrgencyLevel(message) {
    const urgentKeywords = ['فوري', 'سريع', 'مستعجل', 'ضروري', 'الآن', 'دلوقتي', '!!!'];
    const lowerMessage = message.toLowerCase();
    
    return urgentKeywords.some(word => lowerMessage.includes(word)) ? 'high' : 'normal';
  }

  /**
   * تحديد مرحلة المحادثة
   */
  determineConversationPhase(conversationMemory) {
    if (!conversationMemory || conversationMemory.length === 0) {
      return 'opening';
    } else if (conversationMemory.length < 3) {
      return 'middle';
    } else {
      return 'closing';
    }
  }
}

// Singleton instance
let instance = null;

function getDynamicPromptBuilder() {
  if (!instance) {
    instance = new DynamicPromptBuilder();
  }
  return instance;
}

module.exports = getDynamicPromptBuilder();
module.exports.DynamicPromptBuilder = DynamicPromptBuilder;

