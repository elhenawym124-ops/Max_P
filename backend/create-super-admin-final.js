const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🚀 إنشاء السوبر أدمن...');

    // التحقق من وجود السوبر أدمن
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (existingSuperAdmin) {
      console.log('⚠️ السوبر أدمن موجود بالفعل!');
      console.log('📋 بيانات الدخول:');
      console.log(`📧 البريد الإلكتروني: ${existingSuperAdmin.email}`);
      console.log(`🔑 كلمة المرور: SuperAdmin123!`);
      console.log(`👤 الاسم: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
      console.log(`🎭 الدور: ${existingSuperAdmin.role}`);
      console.log('');
      console.log('🌐 للوصول إلى لوحة الإدارة:');
      console.log('http://localhost:3000/super-admin/login');
      return;
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);

    // إنشاء السوبر أدمن
    const superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin@system.com',
        password: hashedPassword,
        firstName: 'مدير',
        lastName: 'النظام',
        role: 'SUPER_ADMIN',
        isActive: true,
        isEmailVerified: true,
        companyId: null
      }
    });

    console.log('✅ تم إنشاء السوبر أدمن بنجاح!');
    console.log('📋 بيانات الدخول:');
    console.log(`📧 البريد الإلكتروني: ${superAdmin.email}`);
    console.log(`🔑 كلمة المرور: SuperAdmin123!`);
    console.log(`👤 الاسم: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`🎭 الدور: ${superAdmin.role}`);
    console.log('');
    console.log('🌐 للوصول إلى لوحة الإدارة:');
    console.log('http://localhost:3000/super-admin/login');

  } catch (error) {
    console.error('❌ خطأ في إنشاء السوبر أدمن:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الدالة
createSuperAdmin();
