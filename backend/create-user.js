const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');

const prisma = getSharedPrismaClient();

async function createUser() {
  try {
    console.log('🚀 إنشاء مستخدم جديد...');

    // بيانات المستخدم الجديد
    const userData = {
      email: 'admin@test.com',
      password: 'admin123',
      firstName: 'أحمد',
      lastName: 'المدير',
      role: 'COMPANY_ADMIN',
      companyName: 'شركة الاختبار'
    };

    // البحث عن شركة موجودة أو إنشاء شركة جديدة
    let company = await executeWithRetry(async () => {
      return await prisma.company.findFirst();
    });
    
    if (!company) {
      console.log('📝 إنشاء شركة جديدة...');
      company = await executeWithRetry(async () => {
        return await prisma.company.create({
          data: {
            name: userData.companyName,
            email: userData.email,
            phone: '+20123456789',
            plan: 'PRO',
            isActive: true,
            settings: JSON.stringify({
              aiEnabled: true,
              autoReply: true,
              language: 'ar'
            })
          }
        });
      });
      console.log('✅ تم إنشاء الشركة:', company.name);
    }

    // التحقق من وجود المستخدم
    const existingUser = await executeWithRetry(async () => {
      return await prisma.user.findFirst({
        where: { email: userData.email }
      });
    });

    if (existingUser) {
      console.log('⚠️ المستخدم موجود بالفعل!');
      console.log('📋 بيانات الدخول:');
      console.log(`📧 البريد الإلكتروني: ${existingUser.email}`);
      console.log(`🔑 كلمة المرور: ${userData.password}`);
      console.log(`👤 الاسم: ${existingUser.firstName} ${existingUser.lastName}`);
      console.log(`🏢 الشركة: ${company.name}`);
      console.log(`🎭 الدور: ${existingUser.role}`);
      console.log('');
      console.log('🌐 للوصول إلى النظام:');
      console.log('http://localhost:3000/auth/login');
      return;
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // إنشاء المستخدم
    const user = await executeWithRetry(async () => {
      return await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: true,
          isEmailVerified: true,
          companyId: company.id
        }
      });
    });

    console.log('✅ تم إنشاء المستخدم بنجاح!');
    console.log('📋 بيانات الدخول:');
    console.log(`📧 البريد الإلكتروني: ${user.email}`);
    console.log(`🔑 كلمة المرور: ${userData.password}`);
    console.log(`👤 الاسم: ${user.firstName} ${user.lastName}`);
    console.log(`🏢 الشركة: ${company.name}`);
    console.log(`🎭 الدور: ${user.role}`);
    console.log('');
    console.log('🌐 للوصول إلى النظام:');
    console.log('http://localhost:3000/auth/login');
    console.log('');
    console.log('🔧 للوصول إلى لوحة الإدارة:');
    console.log('http://localhost:3000/super-admin/login');

  } catch (error) {
    console.error('❌ خطأ في إنشاء المستخدم:', error.message);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

// تشغيل الدالة
createUser();