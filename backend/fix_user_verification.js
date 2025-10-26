const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function fixUserVerification() {
  try {
    console.log('🔧 Fixing user verification for ali@ali.com');
    
    const updatedUser = await prisma.user.update({
      where: { email: 'ali@ali.com' },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      }
    });
    
    console.log('✅ User verification updated:');
    console.log('   Email:', updatedUser.email);
    console.log('   Verified:', updatedUser.isEmailVerified);
    console.log('   Verified At:', updatedUser.emailVerifiedAt);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserVerification();