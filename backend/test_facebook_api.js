const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testFacebookAPI() {
  try {
    console.log('🧪 Testing Facebook API call for company ali@ali.com');
    
    // First find the company
    const company = await prisma.company.findUnique({
      where: { email: 'ali@ali.com' }
    });
    
    if (!company) {
      console.log('❌ Company not found');
      return;
    }
    
    console.log('✅ Company found:', company.name, '(', company.id, ')');
    
    // Test the exact query that getConnectedFacebookPages uses
    const facebookPages = await prisma.facebookPage.findMany({
      where: {
        companyId: company.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${facebookPages.length} Facebook pages for company ${company.id}`);
    
    // Transform to expected format (same as backend controller)
    const pages = facebookPages.map(page => ({
      id: page.id,
      pageId: page.pageId,
      pageName: page.pageName,
      status: page.status || 'connected',
      connectedAt: page.connectedAt || page.createdAt,
      lastActivity: page.updatedAt,
      messageCount: 0,
    }));
    
    console.log('\n📱 Transformed pages data:');
    pages.forEach((page, index) => {
      console.log(`   ${index + 1}. ${page.pageName} (${page.pageId})`);
      console.log(`      Status: ${page.status}`);
      console.log(`      Connected: ${page.connectedAt}`);
      console.log(`      Last Activity: ${page.lastActivity}`);
      console.log('      ---');
    });
    
    console.log('\n🔍 API Response simulation:');
    const response = {
      success: true,
      pages: pages,
      total: pages.length,
      message: `Found ${pages.length} connected Facebook pages`
    };
    
    console.log(JSON.stringify(response, null, 2));
    
    // Check if there are any pages with status !== 'connected'
    const nonConnectedPages = pages.filter(page => page.status !== 'connected');
    if (nonConnectedPages.length > 0) {
      console.log('\n⚠️  WARNING: Some pages have non-connected status:');
      nonConnectedPages.forEach(page => {
        console.log(`   - ${page.pageName}: ${page.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing Facebook API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFacebookAPI();