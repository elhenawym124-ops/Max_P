const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to generate unique IDs
function generateId() {
  return 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}

async function fixTestAIKeySimple() {
  try {
    console.log('🔧 إعداد مفتاح AI للاختبار...');
    console.log('=' * 50);
    
    // البحث عن شركة موجودة
    console.log('🔍 البحث عن الشركات الموجودة...');
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
      take: 5
    });
    
    console.log(`📋 عدد الشركات الموجودة: ${companies.length}`);
    companies.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name} (${company.id})`);
    });
    
    if (companies.length === 0) {
      console.log('❌ لا توجد شركات في النظام');
      return;
    }
    
    // استخدام أول شركة موجودة
    const targetCompany = companies[0];
    console.log(`✅ سنستخدم الشركة: ${targetCompany.name} (${targetCompany.id})`);
    
    // التحقق من المفاتيح الموجودة
    console.log('🔑 التحقق من المفاتيح الموجودة...');
    const existingKeys = await prisma.geminiKey.findMany({
      where: { companyId: targetCompany.id },
      select: { id: true, name: true, isActive: true, apiKey: true }
    });
    
    console.log(`📋 عدد المفاتيح الموجودة: ${existingKeys.length}`);
    
    if (existingKeys.length > 0) {
      console.log('مفاتيح موجودة:');
      existingKeys.forEach((key, index) => {
        console.log(`   ${index + 1}. ${key.name} - نشط: ${key.isActive} - مفتاح: ${key.apiKey.substring(0, 15)}...`);
      });
      
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
          companyId: targetCompany.id,
          usage: JSON.stringify({ used: 0, limit: 1000000 }),
          currentUsage: 0,
          maxRequestsPerDay: 1500
        }
      });
      
      console.log(`✅ تم إنشاء مفتاح جديد: ${keyId}`);
    }
    
    // الآن نحديث كود صفحة الاختبار لاستخدام الشركة الصحيحة
    console.log('🔧 تحديث إعدادات صفحة الاختبار...');
    console.log(`📍 الشركة المستهدفة: ${targetCompany.id}`);
    console.log('✅ يجب تحديث companyId في testRagRoutes.js');
    
    // التحقق النهائي
    console.log('🧪 التحقق النهائي...');
    const finalCheck = await prisma.geminiKey.findFirst({
      where: { 
        companyId: targetCompany.id,
        isActive: true 
      },
      select: { id: true, name: true, model: true, apiKey: true }
    });
    
    if (finalCheck) {
      console.log('🎉 نجح الإعداد!');
      console.log(`📍 الشركة: ${targetCompany.name} (${targetCompany.id})`);
      console.log(`🔑 المفتاح النشط: ${finalCheck.name}`);
      console.log(`🤖 النموذج: ${finalCheck.model}`);
      console.log(`🔐 المفتاح: ${finalCheck.apiKey.substring(0, 15)}...`);
      
      console.log('\n📝 الخطوة التالية:');
      console.log('   يجب تحديث companyId في ملف testRagRoutes.js إلى:');
      console.log(`   companyId: '${targetCompany.id}'`);
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
fixTestAIKeySimple();