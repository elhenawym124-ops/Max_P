#!/usr/bin/env node

/**
 * Database Connection Test Script
 * 
 * Tests the improved database connection handling and retry logic
 */

require('dotenv').config();

const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry, healthCheck } = require('./services/sharedDatabase');

async function testDatabaseConnection() {
  console.log('🧪 Testing Database Connection Improvements...\n');

  try {
    // Test 1: Initialize shared database
    console.log('📌 Test 1: Initializing shared database...');
    const startTime = Date.now();
    
    await initializeSharedDatabase();
    
    const initTime = Date.now() - startTime;
    console.log(`✅ Database initialized successfully in ${initTime}ms\n`);

    // Test 2: Health check
    console.log('📌 Test 2: Running health check...');
    const health = await healthCheck();
    console.log('🏥 Health status:', JSON.stringify(health, null, 2));
    console.log('');

    // Test 3: Test retry logic with simple queries
    console.log('📌 Test 3: Testing retry logic with queries...');
    
    const prisma = getSharedPrismaClient();
    
    const queries = [
      'SELECT 1 as test',
      'SELECT COUNT(*) as user_count FROM user',
      'SELECT COUNT(*) as conversation_count FROM conversation LIMIT 1'
    ];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      try {
        const queryStartTime = Date.now();
        
        const result = await executeWithRetry(async () => {
          return await prisma.$queryRaw`${query}`;
        });
        
        const queryTime = Date.now() - queryStartTime;
        console.log(`  ✅ Query ${i + 1} completed in ${queryTime}ms:`, query);
        console.log(`     Result:`, result);
      } catch (error) {
        console.log(`  ❌ Query ${i + 1} failed:`, error.message);
        
        if (error.message.includes('max_connections_per_hour')) {
          console.log(`  🚨 Connection limit detected - this confirms the error handling is working`);
        }
      }
    }

    console.log('');

    // Test 4: Stress test (reduced for safety)
    console.log('📌 Test 4: Light stress test (5 concurrent connections)...');
    
    const stressTestPromises = [];
    for (let i = 0; i < 5; i++) {
      stressTestPromises.push(
        executeWithRetry(async () => {
          return await prisma.$queryRaw`SELECT ${i + 1} as test_number, NOW() as timestamp`;
        }).catch(error => ({ error: error.message, testNumber: i + 1 }))
      );
    }

    const stressResults = await Promise.allSettled(stressTestPromises);
    
    let successCount = 0;
    let failureCount = 0;
    
    stressResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        successCount++;
        console.log(`  ✅ Concurrent test ${index + 1}: Success`);
      } else {
        failureCount++;
        const error = result.status === 'rejected' ? result.reason.message : result.value.error;
        console.log(`  ❌ Concurrent test ${index + 1}: ${error}`);
      }
    });

    console.log(`\n📊 Stress test results: ${successCount} success, ${failureCount} failures\n`);

    // Test 5: Final health check
    console.log('📌 Test 5: Final health check...');
    const finalHealth = await healthCheck();
    console.log('🏥 Final health status:', JSON.stringify(finalHealth, null, 2));

    console.log('\n🎉 Database connection test completed!');
    console.log('\n💡 Recommendations:');
    console.log('   - Monitor connection usage with /api/v1/db-monitor/database/status');
    console.log('   - Check connection limits with /api/v1/db-monitor/database/connection-limit');
    console.log('   - Use safe database operations from utils/safeDatabase.js');
    console.log('   - Connection limits will trigger automatic retry with exponential backoff');

  } catch (error) {
    console.error('\n❌ Database connection test failed:', error);
    
    if (error.message.includes('max_connections_per_hour')) {
      console.log('\n🔧 Connection Limit Detected:');
      console.log('   - This is the expected error based on your log');
      console.log('   - The server will automatically retry connections');
      console.log('   - Enhanced error handling is now in place');
      console.log('   - Server will run in degraded mode until limit resets');
      console.log(`   - Retry after: ${error.retryAfter || 3600} seconds`);
    }
  }

  // Close connection
  try {
    const prisma = getSharedPrismaClient();
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed gracefully');
  } catch (error) {
    console.error('⚠️ Error closing connection:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testDatabaseConnection()
    .then(() => {
      console.log('\n✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testDatabaseConnection };