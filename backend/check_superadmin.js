const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function checkSuperAdmin() {
    const prisma = getSharedPrismaClient();
    
    try {
        console.log('🔍 البحث عن السوبر أدمن في قاعدة البيانات...');
        
        const user = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' }
        });
        
        if (user) {
            console.log('✅ تم العثور على السوبر أدمن:');
            console.log('📧 البريد الإلكتروني:', user.email);
            console.log('👤 الاسم:', user.firstName, user.lastName);
            console.log('🎭 الدور:', user.role);
            console.log('✅ مفعل:', user.isActive ? 'نعم' : 'لا');
            console.log('📧 البريد مؤكد:', user.isEmailVerified ? 'نعم' : 'لا');
        } else {
            console.log('❌ لم يتم العثور على أي سوبر أدمن');
            console.log('💡 يجب إنشاء السوبر أدمن أولاً');
        }
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    }
}

checkSuperAdmin();