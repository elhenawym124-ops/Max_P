const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to generate unique IDs
function generateId() {
  return 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}

async function fixTestAIKey() {
  try {
    console.log('🔧 إصلاح مفتاح AI للاختبار...');
    console.log('=' * 50);
    
    // استخدام معرف الشركة المطلوب من الاختبار
    const targetCompanyId = 'cmdkj6coz0000uf0cyscco6lr';
    
    // التحقق من وجود الشركة
    console.log('🏢 التحقق من وجود الشركة...');
    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId },
      select: { id: true, name: true }
    });
    
    if (!company) {
      console.log('❌ الشركة غير موجودة، سنقوم بإنشائها...');
      
      const newCompany = await prisma.company.create({
        data: {
          id: targetCompanyId,
          name: 'شركة الاختبار',
          email: 'test@company.com',
          industry: 'TECHNOLOGY',
          size: 'SMALL',
          plan: 'PRO',
          isActive: true,
          currency: 'SAR'
        }
      });
      
      console.log(`✅ تم إنشاء الشركة: ${newCompany.name}`);
    } else {
      console.log(`✅ الشركة موجودة: ${company.name}`);
    }
    
    // التحقق من المفاتيح الموجودة
    console.log('🔑 التحقق من المفاتيح الموجودة...');
    const existingKeys = await prisma.geminiKey.findMany({
      where: { companyId: targetCompanyId },
      select: { id: true, name: true, isActive: true }
    });
    
    console.log(`📋 عدد المفاتيح الموجودة: ${existingKeys.length}`);
    
    if (existingKeys.length > 0) {
      console.log('✅ توجد مفاتيح بالفعل، سنتأكد من تفعيل واحد منها...');
      
      // تفعيل أول مفتاح إذا لم يكن أي منها مفعل
      const activeKey = existingKeys.find(key => key.isActive);
      if (!activeKey) {
        await prisma.geminiKey.update({
          where: { id: existingKeys[0].id },
          data: { isActive: true }
        });
        console.log(`✅ تم تفعيل المفتاح: ${existingKeys[0].name}`);
      } else {
        console.log(`✅ المفتاح النشط: ${activeKey.name}`);
      }
    } else {
      console.log('📥 إضافة مفتاح جديد...');
      
      // إنشاء مفتاح جديد
      const keyId = generateId();
      const testApiKey = 'AIzaSyChIIlqr04fB2SjZ8-JtrUq_Bc0VUcN0wI'; // مفتاح تجريبي
      
      await prisma.geminiKey.create({
        data: {
          id: keyId,
          name: 'مفتاح الاختبار الرئيسي',
          apiKey: testApiKey,
          model: 'gemini-2.5-flash',
          isActive: true,
          priority: 1,
          description: 'مفتاح للاختبار والتطوير',
          companyId: targetCompanyId,
          usage: JSON.stringify({ used: 0, limit: 1000000 }),
          currentUsage: 0,
          maxRequestsPerDay: 1500
        }
      });
      
      console.log(`✅ تم إنشاء مفتاح جديد: ${keyId}`);
    }
    
    // التحقق النهائي
    console.log('🧪 التحقق النهائي...');
    const finalCheck = await prisma.geminiKey.findFirst({
      where: { 
        companyId: targetCompanyId,
        isActive: true 
      },
      select: { id: true, name: true, model: true }
    });
    
    if (finalCheck) {
      console.log('🎉 نجح الإعداد!');
      console.log(`📍 الشركة: ${targetCompanyId}`);
      console.log(`🔑 المفتاح النشط: ${finalCheck.name}`);
      console.log(`🤖 النموذج: ${finalCheck.model}`);
      console.log('✅ يجب أن يعمل الذكاء الاصطناعي الآن في صفحة الاختبار');
    } else {
      console.log('❌ فشل في العثور على مفتاح نشط');
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error('❌ التفاصيل:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الإصلاح
fixTestAIKey();