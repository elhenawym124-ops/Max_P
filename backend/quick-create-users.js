// Quick script to create users
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 إنشاء المستخدمين...');
    
    // 1. إنشاء شركة
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'شركة الاختبار',
          email: 'test@company.com',
          phone: '+20123456789',
          plan: 'PRO',
          isActive: true
        }
      });
      console.log('✅ تم إنشاء الشركة:', company.name);
    }
    
    // 2. إنشاء مستخدم عادي
    const hashedPassword1 = await bcrypt.hash('admin123', 12);
    const user1 = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        password: hashedPassword1,
        firstName: 'أحمد',
        lastName: 'المدير',
        role: 'COMPANY_ADMIN',
        isActive: true,
        isEmailVerified: true,
        companyId: company.id
      }
    });
    
    // 3. إنشاء سوبر أدمن
    const hashedPassword2 = await bcrypt.hash('SuperAdmin123!', 12);
    const user2 = await prisma.user.upsert({
      where: { email: 'superadmin@system.com' },
      update: {},
      create: {
        email: 'superadmin@system.com',
        password: hashedPassword2,
        firstName: 'مدير',
        lastName: 'النظام',
        role: 'SUPER_ADMIN',
        isActive: true,
        isEmailVerified: true,
        companyId: null
      }
    });
    
    console.log('\n✅ تم إنشاء المستخدمين بنجاح!');
    console.log('\n📋 بيانات الدخول:');
    console.log('\n👤 المستخدم العادي:');
    console.log(`   البريد: admin@test.com`);
    console.log(`   كلمة المرور: admin123`);
    console.log(`   الرابط: http://localhost:3000/auth/login`);
    
    console.log('\n🔧 السوبر أدمن:');
    console.log(`   البريد: superadmin@system.com`);
    console.log(`   كلمة المرور: SuperAdmin123!`);
    console.log(`   الرابط: http://localhost:3000/super-admin/login`);
    
    console.log('\n🌐 تأكد من تشغيل الخوادم:');
    console.log('   الخادم الخلفي: http://localhost:3001');
    console.log('   الخادم الأمامي: http://localhost:3000');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
