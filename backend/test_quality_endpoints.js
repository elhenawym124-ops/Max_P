const { qualityMonitor } = require('./services/simpleMonitor');

console.log('🔍 Testing quality monitor endpoints...');

try {
  // Use a test company ID
  const testCompanyId = 'test-company-123';
  
  // Test logging a response
  console.log('\n0. Testing logResponse...');
  const testResponse = qualityMonitor.logResponse(testCompanyId, 'test-msg-1', 'test-conv-1', {
    responseTime: 1500,
    contentLength: 100,
    hasImages: false,
    intent: 'product_inquiry',
    confidence: 0.85,
    model: 'gemini-2.5-pro',
    ragUsed: true
  });
  console.log('✅ logResponse successful');
  console.log('Response:', JSON.stringify(testResponse, null, 2));

  // Test getQualityStats
  console.log('\n1. Testing getQualityStats...');
  const stats = qualityMonitor.getQualityStats(testCompanyId);
  console.log('✅ getQualityStats successful');
  console.log('Stats:', JSON.stringify(stats, null, 2));

  // Test getPerformanceMetrics
  console.log('\n2. Testing getPerformanceMetrics...');
  const performance = qualityMonitor.getPerformanceMetrics(qualityMonitor.getCompanyData(testCompanyId));
  console.log('✅ getPerformanceMetrics successful');
  console.log('Performance:', JSON.stringify(performance, null, 2));

  // Test getDailyInsights
  console.log('\n3. Testing getDailyInsights...');
  const insights = qualityMonitor.getDailyInsights(qualityMonitor.getCompanyData(testCompanyId));
  console.log('✅ getDailyInsights successful');
  console.log('Insights:', JSON.stringify(insights, null, 2));

} catch (error) {
  console.error('❌ Error testing quality endpoints:', error);
  console.error('Stack trace:', error.stack);
}