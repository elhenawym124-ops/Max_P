/**
 * Fast Backend Startup
 * تشغيل سريع للخادم الخلفي مع تحسينات الأداء
 */

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// تحديد منافذ بديلة
const FALLBACK_PORTS = [3001, 3007, 3004, 3005];

// إنشاء Prisma client محسن
const prisma = new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// إنشاء Express app
const app = express();

// إعدادات CORS سريعة
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
    'http://localhost:5173',
    'https://www.mokhtarelhenawy.online'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// middleware أساسي
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes أساسية للاختبار
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend is running fast!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route بسيط لاختبار قاعدة البيانات
app.get('/api/v1/test-db', async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    res.json({ success: true, database: 'connected', result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// دالة للعثور على منفذ متاح
async function findAvailablePort(ports) {
  const net = require('net');
  
  for (const port of ports) {
    try {
      await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(port, () => {
          server.close(() => resolve(port));
        });
        server.on('error', reject);
      });
      return port;
    } catch (error) {
      console.log(`⚠️ Port ${port} is busy, trying next...`);
      continue;
    }
  }
  throw new Error('No available ports found');
}

// تشغيل الخادم
async function startFastServer() {
  try {
    console.log('🚀 Starting Fast Backend Server...');
    
    // العثور على منفذ متاح
    const port = await findAvailablePort(FALLBACK_PORTS);
    
    // تشغيل الخادم
    const server = app.listen(port, () => {
      console.log(`✅ Fast Backend Server running on:`);
      console.log(`   🌐 Local:    http://localhost:${port}`);
      console.log(`   📡 Network:  http://127.0.0.1:${port}`);
      console.log(`   🔗 API:      http://localhost:${port}/api/v1`);
      console.log(`   🩺 Health:   http://localhost:${port}/api/v1/health`);
      console.log(`   💾 DB Test:  http://localhost:${port}/api/v1/test-db`);
      console.log('');
      console.log('📋 إعدادات البيئة:');
      console.log(`   🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   🗄️ Database: ${process.env.DATABASE_URL ? 'configured' : 'not configured'}`);
      console.log('');
      console.log('🎯 Ready for frontend connections!');
    });

    // معالجة الإغلاق النظيف
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down fast server...');
      await prisma.$disconnect();
      server.close(() => {
        console.log('✅ Fast server stopped successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start fast server:', error.message);
    process.exit(1);
  }
}

// تشغيل الخادم
startFastServer();