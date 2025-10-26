/**
 * سكريبت للتحقق من مفاتيح Gemini المتاحة
 * Script to check available Gemini keys
 */

const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function checkGeminiKeys() {
  try {
    console.log('🔍 التحقق من مفاتيح Gemini...');

    // الحصول على جميع الشركات
    const companies = await executeWithRetry(async () => {
      return await prisma.company.findMany({
        select: { id: true, name: true }
      });
    });

    console.log(`📊 تم العثور على ${companies.length} شركة`);

    for (const company of companies) {
      console.log(`\n🏢 الشركة: ${company.name} (${company.id})`);

      // البحث عن مفاتيح Gemini للشركة
      const geminiKeys = await executeWithRetry(async () => {
        return await prisma.geminiKey.findMany({
          where: { companyId: company.id },
          select: {
            id: true,
            name: true,
            isActive: true,
            model: true,
            priority: true,
            createdAt: true
          }
        });
      });

      if (geminiKeys.length === 0) {
        console.log('   ❌ لا توجد مفاتيح Gemini لهذه الشركة');
        console.log('   💡 يجب إضافة مفتاح Gemini من لوحة التحكم');
      } else {
        console.log(`   ✅ تم العثور على ${geminiKeys.length} مفتاح(مفاتيح)`);
        
        geminiKeys.forEach(key => {
          const status = key.isActive ? '🟢 نشط' : '🔴 غير نشط';
          console.log(`      - ${key.name}: ${status} (${key.model})`);
        });

        const activeKeys = geminiKeys.filter(key => key.isActive);
        if (activeKeys.length === 0) {
          console.log('   ⚠️ لا توجد مفاتيح نشطة - يجب تفعيل مفتاح واحد على الأقل');
        }
      }
    }

  } catch (error) {
    console.error('❌ خطأ في التحقق من مفاتيح Gemini:', error);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

// تشغيل السكريبت
checkGeminiKeys();