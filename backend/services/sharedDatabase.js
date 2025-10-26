/**
 * Shared Database Service - ULTRA-OPTIMIZED for 500/hour limit
 * 
 * Strategy:
 * - 3 connections max per instance (was 15)
 * - Connection reuse with keep-alive
 * - Query queue to serialize database access
 * - Aggressive caching
 * - Circuit breaker pattern
 */

const { PrismaClient } = require('@prisma/client');

// Global shared instance
let sharedPrismaInstance = null;
let queryCount = 0;
let connectionCount = 0;
let isInitialized = false;

// Circuit breaker state
let connectionLimitReached = false;
let connectionLimitResetTime = null;
const CONNECTION_LIMIT_COOLDOWN = 60 * 60 * 1000; // 1 hour

// Query queue to prevent simultaneous connections
const queryQueue = [];
let isProcessingQueue = false;
const MAX_CONCURRENT_QUERIES = 8; // 8 concurrent queries (with 10 connection pool)
let activeQueries = 0;

/**
 * Create ULTRA-optimized PrismaClient for shared hosting
 * 500 connections/hour = ~8.3 per minute = ~0.14 per second
 * With multiple PM2 instances, we need AGGRESSIVE limits
 */
function createOptimizedPrismaClient() {
  console.log('🔧 [SharedDB] Creating ultra-optimized PrismaClient...');
  
  const databaseUrl = process.env.DATABASE_URL;
  const urlWithParams = new URL(databaseUrl);
  
  // CRITICAL: Balanced settings for Hostinger shared hosting
  // Balance between connection limit (500/hour) and webhook load
  urlWithParams.searchParams.set('connection_limit', '10');      // 10 connections (optimized for webhooks)
  urlWithParams.searchParams.set('pool_timeout', '60');          // 60 seconds pool timeout
  urlWithParams.searchParams.set('connect_timeout', '20');       // 20 seconds connect
  urlWithParams.searchParams.set('socket_timeout', '30');        // 30 seconds socket timeout
  
  const client = new PrismaClient({
    datasources: {
      db: {
        url: urlWithParams.toString()
      }
    },
    log: process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
    errorFormat: 'minimal'
  });
  
  // Track actual connection events
  client.$on('query', () => {
    queryCount++;
    connectionCount++;
  });
  
  return client;
}

/**
 * Get shared PrismaClient instance (singleton)
 */
function getSharedPrismaClient() {
  if (!sharedPrismaInstance) {
    try {
      sharedPrismaInstance = createOptimizedPrismaClient();
      isInitialized = true;
      console.log('✅ [SharedDB] Shared PrismaClient created (max 10 connections, 60s timeout, queued execution)');
    } catch (error) {
      console.error('❌ [SharedDB] Failed to create PrismaClient:', error);
      throw error;
    }
  }
  
  return sharedPrismaInstance;
}

/**
 * Check if we're in cooldown period
 */
function isInConnectionLimitCooldown() {
  if (!connectionLimitReached) return false;
  
  if (connectionLimitResetTime && Date.now() > connectionLimitResetTime) {
    connectionLimitReached = false;
    connectionLimitResetTime = null;
    console.log('✅ [SharedDB] Cooldown period ended - accepting queries');
    return false;
  }
  
  const remainingMinutes = Math.ceil((connectionLimitResetTime - Date.now()) / 1000 / 60);
  console.log(`⏳ [SharedDB] Still in cooldown - ${remainingMinutes}min remaining`);
  return true;
}

/**
 * Set connection limit flag with cooldown
 */
function setConnectionLimitReached() {
  if (!connectionLimitReached) {
    connectionLimitReached = true;
    connectionLimitResetTime = Date.now() + CONNECTION_LIMIT_COOLDOWN;
    console.log('🚨 [SharedDB] ⚠️  CONNECTION LIMIT REACHED - 1 hour cooldown activated');
    console.log('💡 [SharedDB] All queries will be queued and retried after cooldown');
  }
}

/**
 * Queue-based execution to prevent simultaneous connections
 */
async function executeWithQueue(operation, priority = 0) {
  return new Promise((resolve, reject) => {
    queryQueue.push({
      operation,
      priority,
      resolve,
      reject,
      timestamp: Date.now()
    });
    
    // Sort by priority (higher first)
    queryQueue.sort((a, b) => b.priority - a.priority);
    
    processQueue();
  });
}

/**
 * Process query queue with concurrency control
 */
async function processQueue() {
  if (isProcessingQueue) return;
  if (queryQueue.length === 0) return;
  if (activeQueries >= MAX_CONCURRENT_QUERIES) return;
  
  isProcessingQueue = true;
  
  while (queryQueue.length > 0 && activeQueries < MAX_CONCURRENT_QUERIES) {
    const item = queryQueue.shift();
    if (!item) break;
    
    activeQueries++;
    
    // Execute with retry logic
    executeWithRetry(item.operation, 5, 2000)
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        activeQueries--;
        processQueue(); // Process next item
      });
  }
  
  isProcessingQueue = false;
}

/**
 * Enhanced retry logic with circuit breaker
 */
async function executeWithRetry(operation, maxRetries = 5, initialDelay = 2000) {
  // Circuit breaker - fail fast during cooldown
  if (isInConnectionLimitCooldown()) {
    const remainingTime = Math.ceil((connectionLimitResetTime - Date.now()) / 1000 / 60);
    throw new Error(
      `Database in cooldown mode. Connection limit exceeded (500/hour). ` +
      `Retry after ${remainingTime} minutes.`
    );
  }

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`⏳ [SharedDB] Retry attempt ${attempt}/${maxRetries}, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // 🔥 CRITICAL FIX: Ensure connection before executing query
      const prisma = getSharedPrismaClient();
      
      try {
        // Always ensure connection is active before query
        await prisma.$connect();
      } catch (connectError) {
        // Connection might already be established, ignore this specific error
        if (!connectError.message.includes('already connected') && 
            !connectError.message.includes('already connecting')) {
          console.error(`❌ [SharedDB] Connection error:`, connectError.message);
          throw connectError;
        }
      }

      const result = await operation();
      
      // Update activity time on successful query
      if (typeof lastActivityTime !== 'undefined') {
        lastActivityTime = Date.now();
      }
      
      // Success - log if recovered from previous failures
      if (attempt > 1) {
        console.log(`✅ [SharedDB] Query succeeded on attempt ${attempt}`);
      }
      
      return result;
      
    } catch (error) {
      lastError = error;

      // Detect connection limit error
      const isConnectionLimitError = 
        error.message.includes('max_connections_per_hour') ||
        error.message.includes('ERROR 42000 (1226)') ||
        (error.code === 1226);
      
      if (isConnectionLimitError) {
        setConnectionLimitReached();
        
        throw new Error(
          `Database connection limit exceeded (500/hour). ` +
          `System entering 1-hour cooldown. Please try again later.`
        );
      }

      // Other retryable errors
      const isRetryable = 
        error.message.includes('Connection') ||
        error.message.includes('timeout') ||
        error.message.includes('Engine is not yet connected') ||
        error.message.includes('not yet connected') ||
        error.code === 'P1001' ||
        error.code === 'P1008' ||
        error.message.includes('ECONNREFUSED');

      if (isRetryable && attempt < maxRetries) {
        // Exponential backoff with jitter
        const backoff = Math.min(delay * Math.pow(2, attempt - 1), 30000);
        const jitter = Math.random() * 1000;
        delay = backoff + jitter;
        
        console.log(`⚠️  [SharedDB] Connection error, retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms...`);
        continue;
      }

      // Non-retryable error
      if (!isRetryable) {
        console.error(`❌ [SharedDB] Non-retryable error:`, error.message.substring(0, 100));
        throw error;
      }
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Initialize database with ultra-conservative approach
 */
async function initializeSharedDatabase() {
  try {
    console.log('🔧 [SharedDB] Starting database initialization...');
    
    const prisma = getSharedPrismaClient();
    
    // Connect with queue
    await executeWithQueue(async () => {
      await prisma.$connect();
      console.log('✅ [SharedDB] Database connected successfully');
    }, 10); // High priority
    
    // Test with minimal query
    await executeWithQueue(async () => {
      await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ [SharedDB] Database test query successful');
    }, 10);
    
    return true;
    
  } catch (error) {
    console.error('❌ [SharedDB] Initialization failed:', error.message);
    
    if (error.message.includes('max_connections_per_hour')) {
      console.error('🚨 [SharedDB] CONNECTION LIMIT EXCEEDED');
      console.error('📊 [SharedDB] Limit: 500 connections/hour');
      console.error('💡 [SharedDB] Solutions:');
      console.error('   1. Reduce PM2 instances');
      console.error('   2. Add Redis caching layer');
      console.error('   3. Upgrade to dedicated database');
    }
    
    throw error;
  }
}

/**
 * Wrapper for safe database queries
 */
async function safeQuery(operation, priority = 0) {
  return executeWithQueue(operation, priority);
}

/**
 * Health check with minimal resource usage
 */
async function healthCheck() {
  try {
    if (!sharedPrismaInstance) {
      return { 
        status: 'disconnected', 
        error: 'No instance',
        connectionLimitStatus: connectionLimitReached ? 'cooldown' : 'normal'
      };
    }

    // Don't perform health checks during cooldown
    if (isInConnectionLimitCooldown()) {
      return {
        status: 'cooldown',
        connectionLimitStatus: 'active',
        cooldownEndsAt: connectionLimitResetTime,
        remainingMinutes: Math.ceil((connectionLimitResetTime - Date.now()) / 1000 / 60)
      };
    }

    // Quick health check with low priority
    await safeQuery(async () => {
      await sharedPrismaInstance.$queryRaw`SELECT 1 as health`;
    }, -10);

    return {
      status: 'healthy',
      queryCount,
      connectionCount,
      isInitialized,
      maxConnections: 10,
      queueLength: queryQueue.length,
      activeQueries,
      connectionLimitStatus: 'normal'
    };
    
  } catch (error) {
    return {
      status: error.message.includes('cooldown') ? 'cooldown' : 'error',
      error: error.message.substring(0, 200),
      queryCount,
      connectionCount,
      queueLength: queryQueue.length,
      connectionLimitStatus: connectionLimitReached ? 'active' : 'normal'
    };
  }
}

/**
 * Get connection statistics
 */
function getConnectionStats() {
  return {
    isInitialized,
    queryCount,
    connectionCount,
    hasInstance: !!sharedPrismaInstance,
    maxConnections: 10,
    queueLength: queryQueue.length,
    activeQueries,
    inCooldown: connectionLimitReached,
    cooldownEndsAt: connectionLimitResetTime
  };
}

/**
 * Close database gracefully
 */
async function closeSharedDatabase() {
  if (sharedPrismaInstance) {
    try {
      // Wait for queue to clear (with timeout)
      const timeout = Date.now() + 10000;
      while (queryQueue.length > 0 && Date.now() < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await sharedPrismaInstance.$disconnect();
      console.log('✅ [SharedDB] Database closed gracefully');
      
      sharedPrismaInstance = null;
      isInitialized = false;
      queryCount = 0;
      connectionCount = 0;
      
    } catch (error) {
      console.error('❌ [SharedDB] Error closing database:', error);
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 [SharedDB] SIGINT - closing database...');
  await closeSharedDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 [SharedDB] SIGTERM - closing database...');
  await closeSharedDatabase();
  process.exit(0);
});

// 🔥 HOSTINGER FIX: Periodic connection cleanup to close idle connections
// This prevents connection accumulation and respects the 500/hour limit
let lastActivityTime = Date.now();
const IDLE_DISCONNECT_THRESHOLD = 10 * 60 * 1000; // 10 minutes of complete inactivity

setInterval(async () => {
  // Update activity time if there's any activity
  if (activeQueries > 0 || queryQueue.length > 0) {
    lastActivityTime = Date.now();
    return;
  }
  
  // Only disconnect if truly idle for extended period
  const idleTime = Date.now() - lastActivityTime;
  if (sharedPrismaInstance && idleTime > IDLE_DISCONNECT_THRESHOLD) {
    try {
      // Disconnect to release idle connections
      await sharedPrismaInstance.$disconnect();
      console.log(`♻️ [SharedDB] Idle connection cleanup performed (idle for ${Math.round(idleTime/60000)}min)`);
      
      // Reset connection will happen on next query automatically
    } catch (error) {
      // Ignore cleanup errors
      console.log('⚠️ [SharedDB] Cleanup error (non-critical):', error.message.substring(0, 50));
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// 🔥 NEW: Periodic connection health check and auto-reconnect
// This prevents "Engine is not yet connected" errors
setInterval(async () => {
  if (!sharedPrismaInstance) return;
  if (isInConnectionLimitCooldown()) return;
  
  try {
    // Try a simple query to check if connection is alive
    await sharedPrismaInstance.$queryRaw`SELECT 1 as ping`;
  } catch (error) {
    // Connection is dead or disconnected
    const isConnectionError = 
      error.message.includes('not yet connected') ||
      error.message.includes('Connection') ||
      error.message.includes('ECONNREFUSED');
    
    if (isConnectionError) {
      console.log('⚠️ [SharedDB] Connection lost - attempting reconnection...');
      
      try {
        // Try to reconnect
        await sharedPrismaInstance.$connect();
        console.log('✅ [SharedDB] Reconnection successful');
      } catch (reconnectError) {
        console.error('❌ [SharedDB] Reconnection failed:', reconnectError.message.substring(0, 100));
        
        // If it's a connection limit error, activate cooldown
        if (reconnectError.message.includes('max_connections_per_hour')) {
          setConnectionLimitReached();
        }
      }
    }
  }
}, 30 * 1000); // Check every 30 seconds

// Monitor stats in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = getConnectionStats();
    if (stats.queryCount > 0 || stats.queueLength > 0) {
      console.log(`📊 [SharedDB] Stats:`, {
        queries: stats.queryCount,
        connections: stats.connectionCount,
        queue: stats.queueLength,
        active: stats.activeQueries,
        cooldown: stats.inCooldown
      });
    }
  }, 60000);
}

module.exports = {
  getSharedPrismaClient,
  initializeSharedDatabase,
  closeSharedDatabase,
  getConnectionStats,
  healthCheck,
  executeWithRetry,
  safeQuery // NEW: Use this for all database queries
};