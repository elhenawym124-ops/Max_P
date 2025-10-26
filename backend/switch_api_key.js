const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function switchToWorkingKey() {
  try {
    const userCompanyId = 'cmem8ayyr004cufakqkcsyn97';
    
    console.log('🔧 البحث عن مفاتيح أخرى...');
    
    const allKeys = await prisma.geminiKey.findMany({
      where: { companyId: userCompanyId },
      orderBy: { priority: 'asc' }
    });
    
    console.log('عدد المفاتيح المتاحة:', allKeys.length);
    
    if (allKeys.length > 0) {
      console.log('المفاتيح المتاحة:');
      allKeys.forEach((key, index) => {
        console.log(`  ${index + 1}. ${key.name} - نشط: ${key.isActive} - ${key.apiKey.substring(0, 20)}...`);
      });
    }
    
    // تعطيل المفتاح الحالي المعطل
    await prisma.geminiKey.updateMany({
      where: { 
        companyId: userCompanyId,
        isActive: true 
      },
      data: { isActive: false }
    });
    console.log('🔄 تم تعطيل المفتاح الحالي');
    
    // تفعيل مفتاح جديد (أول مفتاح غير نشط)
    if (allKeys.length > 1) {
      const nextKey = allKeys.find(k => k.name !== '1') || allKeys[1] || allKeys[0];
      await prisma.geminiKey.update({
        where: { id: nextKey.id },
        data: { isActive: true }
      });
      console.log('✅ تم تفعيل مفتاح جديد:', nextKey.name);
      console.log('🔑 المفتاح:', nextKey.apiKey.substring(0, 20) + '...');
    } else {
      console.log('❌ لا توجد مفاتيح بديلة');
    }
    
    // التحقق النهائي
    const activeKey = await prisma.geminiKey.findFirst({
      where: { 
        companyId: userCompanyId,
        isActive: true 
      }
    });
    
    if (activeKey) {
      console.log('🎯 المفتاح النشط الآن:', activeKey.name);
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

switchToWorkingKey();