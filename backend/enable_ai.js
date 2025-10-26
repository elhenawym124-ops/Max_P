/**
 * سكريبت لتفعيل الذكاء الاصطناعي لجميع الشركات
 * Script to enable AI for all companies
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableAI() {
  try {
    console.log('🤖 بدء تفعيل الذكاء الاصطناعي...');

    // الحصول على جميع الشركات
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    });

    console.log(`📊 تم العثور على ${companies.length} شركة`);

    for (const company of companies) {
      console.log(`🏢 تفعيل AI للشركة: ${company.name} (${company.id})`);

      // تحديث أو إنشاء إعدادات AI
      const aiSettings = await prisma.aiSettings.upsert({
        where: { companyId: company.id },
        update: {
          autoReplyEnabled: true,
          qualityEvaluationEnabled: true,
          confidenceThreshold: 0.7,
          multimodalEnabled: true,
          ragEnabled: true,
          maxRepliesPerCustomer: 5,
          workingHours: JSON.stringify({ start: '09:00', end: '18:00' }),
          workingHoursEnabled: false, // متاح 24/7
          updatedAt: new Date()
        },
        create: {
          companyId: company.id,
          autoReplyEnabled: true,
          qualityEvaluationEnabled: true,
          confidenceThreshold: 0.7,
          multimodalEnabled: true,
          ragEnabled: true,
          maxRepliesPerCustomer: 5,
          workingHours: JSON.stringify({ start: '09:00', end: '18:00' }),
          workingHoursEnabled: false
        }
      });

      console.log(`✅ تم تفعيل AI للشركة ${company.name}`);
    }

    console.log('🎉 تم تفعيل الذكاء الاصطناعي لجميع الشركات بنجاح!');
    console.log('📝 الإعدادات المفعلة:');
    console.log('   ✅ الرد التلقائي: مُفعل');
    console.log('   ✅ تقييم الجودة: مُفعل');
    console.log('   ✅ الوسائط المتعددة: مُفعل');
    console.log('   ✅ نظام RAG: مُفعل');
    console.log('   ⏰ ساعات العمل: 24/7');
    console.log('   🔢 الحد الأقصى للردود: 5 ردود لكل عميل');

  } catch (error) {
    console.error('❌ خطأ في تفعيل الذكاء الاصطناعي:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
enableAI();