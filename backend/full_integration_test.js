const express = require('express');
const { PrismaClient } = require('@prisma/client');

// Create a minimal test server to simulate the exact endpoint
const app = express();
const prisma = new PrismaClient();

// Middleware to parse JSON
app.use(express.json());

// Simulate the exact /facebook-oauth/status endpoint
app.get('/api/v1/facebook-oauth/status', async (req, res) => {
  try {
    const { companyId } = req.query;

    console.log('📥 Received request with companyId:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required',
        message: 'معرف الشركة مطلوب'
      });
    }

    // Get all pages for the company (connected or not) to better understand the state
    const allPages = await prisma.facebookPage.findMany({
      where: {
        companyId: companyId
      },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        status: true,
        connectedAt: true,
        updatedAt: true,
      },
      orderBy: {
        connectedAt: 'desc'
      }
    });

    // Filter for connected pages
    const connectedPages = allPages.filter(page => page.status === 'connected');

    console.log(`📊 Status check for company ${companyId}:`, {
      totalPages: allPages.length,
      connectedPages: connectedPages.length,
      allPagesStatus: allPages.map(p => ({id: p.pageId, status: p.status}))
    });

    res.json({
      success: true,
      connected: connectedPages.length > 0,
      pagesCount: connectedPages.length,
      pages: connectedPages.map(page => ({
        ...page,
        lastActivity: page.updatedAt
      })),
      companyId: companyId,
      message: connectedPages.length > 0 ? 'Facebook pages connected successfully' : 'No Facebook pages connected'
    });

  } catch (error) {
    console.error(`❌ Error getting status for company:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get Facebook OAuth status'
    });
  }
});

// Start the test server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  
  // Run the test requests
  setTimeout(() => {
    runTestRequests();
  }, 1000);
});

async function runTestRequests() {
  try {
    console.log('\n🧪 Running integration tests...\n');
    
    // Get a real company ID
    const samplePage = await prisma.facebookPage.findFirst();
    if (!samplePage) {
      console.log('❌ No Facebook pages found in database');
      process.exit(1);
    }
    
    const companyId = samplePage.companyId;
    console.log(`🏢 Using company ID: ${companyId}\n`);
    
    // Test 1: Correct request with companyId
    console.log('Test 1: Correct request with companyId');
    const correctResponse = await fetch(`http://localhost:${PORT}/api/v1/facebook-oauth/status?companyId=${companyId}`);
    const correctData = await correctResponse.json();
    console.log('✅ Status:', correctResponse.status);
    console.log('✅ Connected:', correctData.connected);
    console.log('✅ Pages count:', correctData.pagesCount);
    console.log('');
    
    // Test 2: Request without companyId
    console.log('Test 2: Request without companyId');
    const missingResponse = await fetch(`http://localhost:${PORT}/api/v1/facebook-oauth/status`);
    const missingData = await missingResponse.json();
    console.log('✅ Status:', missingResponse.status);
    console.log('✅ Error:', missingData.error);
    console.log('');
    
    // Test 3: Request with wrong companyId
    console.log('Test 3: Request with wrong companyId');
    const wrongResponse = await fetch(`http://localhost:${PORT}/api/v1/facebook-oauth/status?companyId=wrong-id`);
    const wrongData = await wrongResponse.json();
    console.log('✅ Status:', wrongResponse.status);
    console.log('✅ Connected:', wrongData.connected);
    console.log('✅ Pages count:', wrongData.pagesCount);
    console.log('');
    
    console.log('🏁 All tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}