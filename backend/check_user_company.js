const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function checkUserCompany() {
  try {
    const userCompanyId = 'cmem8ayyr004cufakqkcsyn97'; // شركة التسويق
    
    console.log('🔍 التحقق من شركة المستخدم:', userCompanyId);
    
    const company = await executeWithRetry(async () => {
      return await prisma.company.findUnique({
        where: { id: userCompanyId },
        select: { id: true, name: true }
      });
    });
    
    console.log('🏢 الشركة:', company?.name || 'غير موجودة');
    
    const keys = await executeWithRetry(async () => {
      return await prisma.geminiKey.findMany({
        where: { companyId: userCompanyId },
        select: { id: true, name: true, isActive: true, apiKey: true, model: true }
      });
    });
    
    console.log('🔑 عدد المفاتيح:', keys.length);
    
    if (keys.length > 0) {
      console.log('المفاتيح:');
      keys.forEach((key, index) => {
        console.log(`   ${index + 1}. ${key.name} - نشط: ${key.isActive} - نموذج: ${key.model} - مفتاح: ${key.apiKey.substring(0, 15)}...`);
      });
      
      const activeKey = keys.find(k => k.isActive);
      if (!activeKey && keys.length > 0) {
        console.log('🔧 تفعيل أول مفتاح...');
        await executeWithRetry(async () => {
          await prisma.geminiKey.update({
            where: { id: keys[0].id },
            data: { isActive: true }
          });
        });
        console.log('✅ تم تفعيل المفتاح');
      } else if (activeKey) {
        console.log('✅ يوجد مفتاح نشط:', activeKey.name);
      }
    } else {
      console.log('❌ لا توجد مفاتيح لهذه الشركة');
      console.log('🔧 إضافة مفتاح تجريبي...');
      
      // إضافة مفتاح تجريبي
      await executeWithRetry(async () => {
        await prisma.geminiKey.create({
          data: {
            name: 'مفتاح التسويق الرئيسي',
            apiKey: 'AIzaSyChIIlqr04fB2SjZ8-JtrUq_Bc0VUcN0wI',
            model: 'gemini-2.5-flash',
            isActive: true,
            priority: 1,
            description: 'مفتاح للاختبار والتطوير - شركة التسويق',
            companyId: userCompanyId,
            usage: JSON.stringify({ used: 0, limit: 1000000 }),
            currentUsage: 0,
            maxRequestsPerDay: 1500
          }
        });
      });
      console.log('✅ تم إضافة مفتاح تجريبي');
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

checkUserCompany();