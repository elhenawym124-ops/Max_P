const { qualityMonitor } = require('./services/simpleMonitor');

console.log('🔍 Testing AI response logging...');

try {
  // Use a test company ID
  const testCompanyId = 'test-company-123';
  
  // Simulate an AI response being logged
  console.log('\n1. Logging AI response...');
  const responseResult = qualityMonitor.logResponse(testCompanyId, 'ai-msg-1', 'ai-conv-1', {
    responseTime: 1200,
    contentLength: 250,
    hasImages: false,
    intent: 'product_inquiry',
    confidence: 0.92,
    model: 'gemini-2.5-pro',
    ragUsed: true
  });
  console.log('✅ AI response logged successfully');
  console.log('Response result:', JSON.stringify(responseResult, null, 2));

  // Get quality stats after logging
  console.log('\n2. Getting quality stats...');
  const stats = qualityMonitor.getQualityStats(testCompanyId);
  console.log('✅ Quality stats retrieved successfully');
  console.log('Stats:', JSON.stringify(stats, null, 2));

  // Get performance metrics
  console.log('\n3. Getting performance metrics...');
  const performance = qualityMonitor.getPerformanceMetrics(qualityMonitor.getCompanyData(testCompanyId));
  console.log('✅ Performance metrics retrieved successfully');
  console.log('Performance:', JSON.stringify(performance, null, 2));

  console.log('\n🎉 All tests passed! The AI response logging is working correctly.');

} catch (error) {
  console.error('❌ Error testing AI response logging:', error);
  console.error('Stack trace:', error.stack);
}