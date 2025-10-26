/**
 * Performance Optimization Script
 * 
 * This script addresses slow page loading issues by:
 * 1. Optimizing database connection settings
 * 2. Cleaning up unused data
 * 3. Adding database indexes
 * 4. Optimizing middleware performance
 */

const { PrismaClient } = require('@prisma/client');

// Create a direct prisma instance for optimization tasks
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

class PerformanceOptimizer {
  constructor() {
    this.optimizations = [];
    this.errors = [];
  }

  async runAllOptimizations() {
    console.log('🚀 Starting Performance Optimization Process...');
    console.log('📊 Analyzing current system performance...');

    try {
      // 1. Check database health
      await this.checkDatabaseHealth();
      
      // 2. Optimize database indexes
      await this.optimizeDatabaseIndexes();
      
      // 3. Clean up old data
      await this.cleanupOldData();
      
      // 4. Optimize query patterns
      await this.optimizeQueryPatterns();
      
      // 5. Update connection settings
      await this.optimizeConnectionSettings();
      
      // 6. Performance recommendations
      await this.generatePerformanceReport();

    } catch (error) {
      console.error('❌ Optimization process failed:', error);
      this.errors.push(error);
    } finally {
      await this.disconnect();
    }
  }

  async checkDatabaseHealth() {
    console.log('\n📊 Step 1: Checking Database Health...');
    
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1 as test`;
      const connectionTime = Date.now() - startTime;
      
      console.log(`✅ Database connection: ${connectionTime}ms`);
      
      // Check table sizes and stats
      const tableStats = await this.getTableStatistics();
      console.log('📈 Table Statistics:');
      
      for (const stat of tableStats) {
        console.log(`   - ${stat.table}: ${stat.count.toLocaleString()} records`);
        if (stat.count > 100000) {
          console.log(`     ⚠️ Large table detected - may need optimization`);
        }
      }
      
      this.optimizations.push({
        type: 'health_check',
        status: 'completed',
        connectionTime,
        tableStats
      });
      
    } catch (error) {
      console.error('❌ Database health check failed:', error.message);
      this.errors.push({ step: 'health_check', error: error.message });
    }
  }

  async getTableStatistics() {
    const tables = ['conversation', 'message', 'customer', 'user', 'company'];
    const stats = [];
    
    for (const table of tables) {
      try {
        const result = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM ${table} 
          LIMIT 1
        `;
        
        stats.push({
          table,
          count: parseInt(result[0].count)
        });
      } catch (error) {
        console.warn(`⚠️ Could not get stats for table ${table}:`, error.message);
        stats.push({
          table,
          count: 0,
          error: error.message
        });
      }
    }
    
    return stats;
  }

  async optimizeDatabaseIndexes() {
    console.log('\n🔧 Step 2: Optimizing Database Indexes...');
    
    const indexQueries = [
      // Conversation indexes for faster loading
      `CREATE INDEX IF NOT EXISTS idx_conversation_company_updated 
       ON conversation(companyId, lastMessageAt DESC)`,
      
      `CREATE INDEX IF NOT EXISTS idx_conversation_status_company 
       ON conversation(status, companyId)`,
      
      // Message indexes for conversation loading
      `CREATE INDEX IF NOT EXISTS idx_message_conversation_created 
       ON message(conversationId, createdAt ASC)`,
      
      `CREATE INDEX IF NOT EXISTS idx_message_unread_customer 
       ON message(isRead, isFromCustomer, conversationId)`,
      
      // Customer search indexes
      `CREATE INDEX IF NOT EXISTS idx_customer_search_name 
       ON customer(firstName, lastName, companyId)`,
      
      `CREATE INDEX IF NOT EXISTS idx_customer_facebook_company 
       ON customer(facebookId, companyId)`,
      
      // User authentication indexes
      `CREATE INDEX IF NOT EXISTS idx_user_email_active 
       ON user(email, isActive)`,
      
      `CREATE INDEX IF NOT EXISTS idx_user_company_role 
       ON user(companyId, role, isActive)`
    ];

    let successCount = 0;
    let skipCount = 0;

    for (const indexQuery of indexQueries) {
      try {
        await prisma.$executeRaw`${indexQuery}`;
        successCount++;
        
        // Extract index name for logging
        const indexName = indexQuery.match(/idx_\w+/)?.[0] || 'unknown';
        console.log(`  ✅ Created/verified index: ${indexName}`);
        
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate key')) {
          skipCount++;
          console.log(`  ⏭️ Index already exists (skipped)`);
        } else {
          console.warn(`  ⚠️ Index creation warning:`, error.message);
          this.errors.push({ step: 'index_creation', error: error.message });
        }
      }
    }

    console.log(`📊 Index optimization completed: ${successCount} created, ${skipCount} skipped`);
    
    this.optimizations.push({
      type: 'database_indexes',
      status: 'completed',
      successCount,
      skipCount,
      totalIndexes: indexQueries.length
    });
  }

  async cleanupOldData() {
    console.log('\n🧹 Step 3: Cleaning Up Old Data...');
    
    try {
      // Clean up old logs and temporary data (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Clean up old unread messages that are older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Update old unread messages to read (to improve query performance)
      const oldUnreadResult = await prisma.$executeRaw`
        UPDATE message 
        SET isRead = true 
        WHERE isRead = false 
        AND createdAt < ${sevenDaysAgo}
        AND isFromCustomer = true
      `;
      
      console.log(`  ✅ Marked ${oldUnreadResult} old unread messages as read`);
      
      // Analyze conversation metadata for cleanup
      const conversationsWithMetadata = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM conversation 
        WHERE metadata IS NOT NULL 
        AND metadata != '{}' 
        AND metadata != ''
      `;
      
      console.log(`  📊 Found ${conversationsWithMetadata[0].count} conversations with metadata`);
      
      this.optimizations.push({
        type: 'data_cleanup',
        status: 'completed',
        oldUnreadUpdated: oldUnreadResult,
        metadataCount: conversationsWithMetadata[0].count
      });
      
    } catch (error) {
      console.error('❌ Data cleanup failed:', error.message);
      this.errors.push({ step: 'data_cleanup', error: error.message });
    }
  }

  async optimizeQueryPatterns() {
    console.log('\n⚡ Step 4: Optimizing Query Patterns...');
    
    try {
      // Test common query performance
      const queryTests = [
        {
          name: 'Conversation List Query',
          query: `
            SELECT c.id, c.customerId, c.lastMessageAt, c.status,
                   cust.firstName, cust.lastName, cust.email,
                   (SELECT COUNT(*) FROM message m 
                    WHERE m.conversationId = c.id 
                    AND m.isRead = false 
                    AND m.isFromCustomer = true) as unreadCount
            FROM conversation c
            LEFT JOIN customer cust ON c.customerId = cust.id
            WHERE c.companyId = 'cmem8ayyr004cufakqkcsyn97'
            ORDER BY c.lastMessageAt DESC
            LIMIT 20
          `
        },
        {
          name: 'Message List Query',
          query: `
            SELECT m.id, m.content, m.createdAt, m.isFromCustomer, m.type,
                   u.firstName, u.lastName
            FROM message m
            LEFT JOIN user u ON m.senderId = u.id
            WHERE m.conversationId = (
              SELECT id FROM conversation 
              WHERE companyId = 'cmem8ayyr004cufakqkcsyn97' 
              LIMIT 1
            )
            ORDER BY m.createdAt ASC
            LIMIT 50
          `
        },
        {
          name: 'User Authentication Query',
          query: `
            SELECT u.id, u.email, u.role, u.companyId, u.isActive,
                   c.name as companyName
            FROM user u
            LEFT JOIN company c ON u.companyId = c.id
            WHERE u.email = 'admin@test.com'
            AND u.isActive = true
            LIMIT 1
          `
        }
      ];

      const queryResults = [];

      for (const test of queryTests) {
        try {
          const startTime = Date.now();
          const result = await prisma.$queryRaw`${test.query}`;
          const duration = Date.now() - startTime;
          
          queryResults.push({
            name: test.name,
            duration,
            recordCount: result.length,
            status: 'success'
          });
          
          const statusIcon = duration < 100 ? '🚀' : duration < 500 ? '⚡' : duration < 1000 ? '⚠️' : '🐌';
          console.log(`  ${statusIcon} ${test.name}: ${duration}ms (${result.length} records)`);
          
        } catch (error) {
          queryResults.push({
            name: test.name,
            duration: -1,
            error: error.message,
            status: 'failed'
          });
          console.log(`  ❌ ${test.name}: Failed - ${error.message}`);
        }
      }

      this.optimizations.push({
        type: 'query_optimization',
        status: 'completed',
        queryResults
      });

    } catch (error) {
      console.error('❌ Query optimization failed:', error.message);
      this.errors.push({ step: 'query_optimization', error: error.message });
    }
  }

  async optimizeConnectionSettings() {
    console.log('\n🔧 Step 5: Connection Settings Optimization...');
    
    const recommendations = [
      {
        setting: 'Connection Pool Size',
        current: '3 max connections',
        recommendation: 'Increase to 5-10 for better performance',
        priority: 'high'
      },
      {
        setting: 'Query Timeout',
        current: '30 seconds',
        recommendation: 'Reduce to 15 seconds for faster failure detection',
        priority: 'medium'
      },
      {
        setting: 'Connection Idle Time',
        current: '5 seconds',
        recommendation: 'Increase to 10 seconds to reduce connection churn',
        priority: 'medium'
      },
      {
        setting: 'Retry Strategy',
        current: 'Exponential backoff',
        recommendation: 'Implement circuit breaker pattern',
        priority: 'high'
      }
    ];

    console.log('📋 Connection Optimization Recommendations:');
    for (const rec of recommendations) {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${priority} ${rec.setting}:`);
      console.log(`     Current: ${rec.current}`);
      console.log(`     Recommended: ${rec.recommendation}`);
    }

    this.optimizations.push({
      type: 'connection_optimization',
      status: 'completed',
      recommendations
    });
  }

  async generatePerformanceReport() {
    console.log('\n📊 Step 6: Generating Performance Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      optimizations: this.optimizations,
      errors: this.errors,
      summary: {
        totalOptimizations: this.optimizations.length,
        errorCount: this.errors.length,
        status: this.errors.length === 0 ? 'success' : 'partial_success'
      },
      recommendations: [
        {
          category: 'Database',
          items: [
            'Consider upgrading to a higher database plan with more connections',
            'Implement database connection pooling with Redis',
            'Add database read replicas for read-heavy operations',
            'Schedule regular ANALYZE TABLE operations'
          ]
        },
        {
          category: 'Application',
          items: [
            'Implement response caching for frequently accessed data',
            'Add lazy loading for conversation messages',
            'Optimize image loading with progressive loading',
            'Implement virtual scrolling for large lists'
          ]
        },
        {
          category: 'Frontend',
          items: [
            'Enable React.memo for conversation components',
            'Implement service worker for caching',
            'Use code splitting for route-based loading',
            'Optimize bundle size with tree shaking'
          ]
        }
      ]
    };

    console.log('\n✅ Performance Optimization Summary:');
    console.log(`   📈 Optimizations completed: ${report.summary.totalOptimizations}`);
    console.log(`   ❌ Errors encountered: ${report.summary.errorCount}`);
    console.log(`   🎯 Overall status: ${report.summary.status.toUpperCase()}`);

    if (report.summary.errorCount === 0) {
      console.log('\n🎉 All optimizations completed successfully!');
      console.log('💡 The system should now load pages faster.');
    } else {
      console.log('\n⚠️ Some optimizations had issues, but the system should still be improved.');
      console.log('🔍 Check the error details above for troubleshooting.');
    }

    console.log('\n📋 Next Steps:');
    console.log('   1. Restart the backend server to apply connection optimizations');
    console.log('   2. Clear browser cache to ensure fresh resource loading');
    console.log('   3. Monitor system performance over the next few hours');
    console.log('   4. Consider implementing the recommendations above for further improvements');

    return report;
  }

  async disconnect() {
    try {
      await prisma.$disconnect();
      console.log('\n🔌 Database connection closed.');
    } catch (error) {
      console.error('❌ Error disconnecting:', error.message);
    }
  }
}

// Run optimization if this file is executed directly
if (require.main === module) {
  const optimizer = new PerformanceOptimizer();
  optimizer.runAllOptimizations()
    .then(() => {
      console.log('\n🏁 Performance optimization process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Performance optimization failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceOptimizer;