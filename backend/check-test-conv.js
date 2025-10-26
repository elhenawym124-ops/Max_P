const { getSharedPrismaClient } = require('./services/sharedDatabase');
const jwt = require('jsonwebtoken');
const prisma = getSharedPrismaClient();

async function checkTokenAndConversation() {
  try {
    // Decode the token to see which company
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWVtOGF6bHYwMDRldWZha2JrbzB3bW4xIiwiZW1haWwiOiJhbGlAYWxpLmNvbSIsInJvbGUiOiJDT01QQU5ZX0FETUlOIiwiY29tcGFueUlkIjoiY21lbThheXlyMDA0Y3VmYWtxa2NzeW45NyIsImlhdCI6MTc1ODY1ODQyMywiZXhwIjoxNzU4NzQ0ODIzfQ.EywGCMr3V7mFfVsBtueiNFfHghnPB5oe-T8IxAkG_Bg';
    const decoded = jwt.decode(token);
    console.log('🔑 Token company ID:', decoded.companyId);
    
    // Find test conversation for this company
    const testConv = await prisma.conversation.findFirst({
      where: {
        companyId: decoded.companyId,
        metadata: { contains: 'isTestConversation' }
      }
    });
    
    if (testConv) {
      console.log('🧪 Test conversation for company:', testConv.id);
      
      const messagesWithImages = await prisma.message.count({
        where: {
          conversationId: testConv.id,
          metadata: { contains: 'images' }
        }
      });
      
      console.log('📸 Messages with images in this test conv:', messagesWithImages);
    } else {
      console.log('❌ No test conversation found for this company');
      
      // Check what test conversations exist
      const allTestConvs = await prisma.conversation.findMany({
        where: {
          metadata: { contains: 'isTestConversation' }
        },
        select: { id: true, companyId: true }
      });
      
      console.log('🔍 All test conversations:');
      allTestConvs.forEach(c => console.log(`   ${c.id} (company: ${c.companyId})`));
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTokenAndConversation();