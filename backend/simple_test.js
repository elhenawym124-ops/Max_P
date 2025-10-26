const { PrismaClient } = require('@prisma/client');

async function simpleTest() {
  const prisma = new PrismaClient();
  
  try {
    const pages = await prisma.facebookPage.findMany();
    console.log('Pages:', pages.length);
    
    if (pages.length > 0) {
      console.log('First page:', pages[0]);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleTest();