const { getSharedPrismaClient } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');

async function checkSuperAdminPassword() {
    const prisma = getSharedPrismaClient();
    
    try {
        console.log('🔍 البحث عن السوبر أدمن...');
        
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
            
            // Test password
            const testPassword = 'SuperAdmin123!';
            const isPasswordValid = await bcrypt.compare(testPassword, user.password);
            console.log(`🔑 كلمة المرور "${testPassword}" صحيحة:`, isPasswordValid ? 'نعم' : 'لا');
            
            if (!isPasswordValid) {
                console.log('🔧 محاولة تحديث كلمة المرور...');
                const hashedPassword = await bcrypt.hash(testPassword, 12);
                
                await prisma.user.update({
                    where: { id: user.id },
                    data: { password: hashedPassword }
                });
                
                console.log('✅ تم تحديث كلمة المرور بنجاح!');
                
                // Test again
                const newCheck = await bcrypt.compare(testPassword, hashedPassword);
                console.log('🔑 التحقق من كلمة المرور الجديدة:', newCheck ? 'نجح' : 'فشل');
            }
        } else {
            console.log('❌ لم يتم العثور على أي سوبر أدمن');
        }
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    }
}

checkSuperAdminPassword();