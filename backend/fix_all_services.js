#!/usr/bin/env node

/**
 * Script لإصلاح جميع ملفات Services لاستخدام safeQuery
 * 
 * الاستخدام:
 * node fix_all_services.js
 */

const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, 'services');

// الملفات التي تحتاج إصلاح
const filesToFix = [
  'broadcastSchedulerService.js',
  'aiResponseMonitor.js',
  'orderService.js',
  'memoryService.js',
  'subscriptionRenewalService.js',
  'ragService.js',
  'shippingService.js',
  'socketService.js'
];

// Pattern للبحث والاستبدال
const patterns = [
  {
    // استبدال await prisma. مباشرة
    search: /(\s+)(const\s+\w+\s*=\s*)?await\s+prisma\.(\w+)\.(\w+)\(/g,
    replace: (match, indent, varDecl, model, method) => {
      const declaration = varDecl || '';
      return `${indent}${declaration}await safeQuery(async () => {\n${indent}  return await prisma.${model}.${method}(`;
    }
  }
];

function fixFile(filePath) {
  console.log(`\n🔧 Fixing: ${path.basename(filePath)}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // تحقق من وجود safeQuery في imports
    if (!content.includes('safeQuery')) {
      console.log('  ➕ Adding safeQuery import...');
      content = content.replace(
        /const\s+{\s*getSharedPrismaClient\s*}\s*=\s*require\(['"]\.\/sharedDatabase['"]\);/,
        "const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');"
      );
      modified = true;
    }
    
    // عد استخدامات await prisma
    const prismaMatches = content.match(/await\s+prisma\.\w+\.\w+\(/g);
    const count = prismaMatches ? prismaMatches.length : 0;
    
    if (count > 0) {
      console.log(`  📊 Found ${count} direct prisma calls`);
      console.log(`  ⚠️  Manual conversion recommended for this file`);
      console.log(`  💡 Use pattern: await safeQuery(async () => { return await prisma... }, priority)`);
    } else {
      console.log('  ✅ No direct prisma calls found');
    }
    
    if (modified) {
      // إنشاء نسخة احتياطية
      const backupPath = filePath + '.backup';
      fs.writeFileSync(backupPath, fs.readFileSync(filePath));
      
      // حفظ الملف المعدل
      fs.writeFileSync(filePath, content);
      console.log('  ✅ Import added successfully');
      console.log(`  💾 Backup saved: ${path.basename(backupPath)}`);
    }
    
    return { success: true, count, modified };
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🚀 Starting Services Fix Script\n');
  console.log('=' .repeat(60));
  
  const results = [];
  let totalCalls = 0;
  
  for (const fileName of filesToFix) {
    const filePath = path.join(servicesDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠️  Skipping: ${fileName} (not found)`);
      continue;
    }
    
    const result = fixFile(filePath);
    results.push({ fileName, ...result });
    
    if (result.count) {
      totalCalls += result.count;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:\n');
  
  const successful = results.filter(r => r.success).length;
  const modified = results.filter(r => r.modified).length;
  
  console.log(`✅ Files processed: ${successful}/${filesToFix.length}`);
  console.log(`📝 Files modified: ${modified}`);
  console.log(`🔍 Total prisma calls found: ${totalCalls}`);
  
  if (totalCalls > 0) {
    console.log('\n⚠️  IMPORTANT:');
    console.log('   Manual conversion is still required for all prisma calls');
    console.log('   This script only added the safeQuery import');
    console.log('\n💡 Next steps:');
    console.log('   1. Review each file with prisma calls');
    console.log('   2. Wrap each call with safeQuery()');
    console.log('   3. Add appropriate priority (0-10)');
    console.log('   4. Test thoroughly');
  }
  
  console.log('\n✅ Script completed!\n');
}

// تشغيل
main();
