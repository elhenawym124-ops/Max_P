// Simple script to create super admin
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 إنشاء السوبر أدمن...');
    
    // Check if exists
    const existing = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });
    
    if (existing) {
      console.log('✅ السوبر أدمن موجود بالفعل!');
      console.log(`📧 البريد: ${existing.email}`);
      console.log(`👤 الاسم: ${existing.firstName} ${existing.lastName}`);
      return;
    }
    
    // Create super admin
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);
    
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
    console.log(`📧 البريد: superadmin@system.com`);
    console.log(`🔑 كلمة المرور: SuperAdmin123!`);
    console.log(`👤 الاسم: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log('');
    console.log('🌐 للوصول: http://localhost:3000/super-admin/login');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
