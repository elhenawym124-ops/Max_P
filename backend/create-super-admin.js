const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');

const prisma = getSharedPrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🚀 إنشاء السوبر أدمن...');

    // Check if super admin already exists
    const existingSuperAdmin = await executeWithRetry(async () => {
      return await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });
    });

    if (existingSuperAdmin) {
      console.log('⚠️ السوبر أدمن موجود بالفعل في النظام');
      console.log(`📧 البريد الإلكتروني: ${existingSuperAdmin.email}`);
      console.log(`👤 الاسم: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
      return;
    }

    // Super admin data
    const superAdminData = {
      email: 'superadmin@system.com',
      password: 'SuperAdmin123!',
      firstName: 'مدير',
      lastName: 'النظام',
      role: 'SUPER_ADMIN',
      isActive: true,
      isEmailVerified: true,
      companyId: null // Super admin doesn't belong to any company
    };

    // Hash password
    const hashedPassword = await bcrypt.hash(superAdminData.password, 12);

    // Create super admin
    const superAdmin = await executeWithRetry(async () => {
      return await prisma.user.create({
        data: {
          email: superAdminData.email,
          password: hashedPassword,
          firstName: superAdminData.firstName,
          lastName: superAdminData.lastName,
          role: superAdminData.role,
          isActive: superAdminData.isActive,
          isEmailVerified: superAdminData.isEmailVerified,
          companyId: superAdminData.companyId
        }
      });
    });

    console.log('✅ تم إنشاء السوبر أدمن بنجاح!');
    console.log('📋 بيانات الدخول:');
    console.log(`📧 البريد الإلكتروني: ${superAdmin.email}`);
    console.log(`🔑 كلمة المرور: ${superAdminData.password}`);
    console.log(`👤 الاسم: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`🎭 الدور: ${superAdmin.role}`);
    console.log('');
    console.log('🌐 للوصول إلى لوحة الإدارة:');
    console.log('http://localhost:3000/super-admin/login');

  } catch (error) {
    console.error('❌ خطأ في إنشاء السوبر أدمن:', error);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

// Run the function
createSuperAdmin();