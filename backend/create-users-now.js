// Create users now
const { PrismaClient, UserRole, SubscriptionPlan } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 إنشاء المستخدمين الآن...');
    
    // 1. Create company
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'شركة الاختبار',
          email: 'test@company.com',
          phone: '+20123456789',
          plan: SubscriptionPlan.PRO,
          isActive: true
        }
      });
      console.log('✅ تم إنشاء الشركة:', company.name);
    } else {
      console.log('✅ الشركة موجودة:', company.name);
    }
    
    // 2. Create regular user
    const hashedPassword1 = await bcrypt.hash('admin123', 12);
    const user1 = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        password: hashedPassword1,
        firstName: 'أحمد',
        lastName: 'المدير',
        role: UserRole.COMPANY_ADMIN,
        isActive: true,
        isEmailVerified: true,
        companyId: company.id
      }
    });
    console.log('✅ تم إنشاء المستخدم العادي:', user1.email);
    
    // 3. Create super admin
    const hashedPassword2 = await bcrypt.hash('SuperAdmin123!', 12);
    const user2 = await prisma.user.upsert({
      where: { email: 'superadmin@system.com' },
      update: {},
      create: {
        email: 'superadmin@system.com',
        password: hashedPassword2,
        firstName: 'مدير',
        lastName: 'النظام',
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        isEmailVerified: true,
        companyId: null
      }
    });
    console.log('✅ تم إنشاء السوبر أدمن:', user2.email);
    
    console.log('\n🎉 تم إنشاء جميع المستخدمين بنجاح!');
    console.log('=====================================');
    console.log('👤 المستخدم العادي:');
    console.log('   📧 البريد: admin@test.com');
    console.log('   🔑 كلمة المرور: admin123');
    console.log('   🌐 الرابط: http://localhost:3000/auth/login');
    console.log('');
    console.log('🔧 السوبر أدمن:');
    console.log('   📧 البريد: superadmin@system.com');
    console.log('   🔑 كلمة المرور: SuperAdmin123!');
    console.log('   🌐 الرابط: http://localhost:3000/super-admin/login');
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
