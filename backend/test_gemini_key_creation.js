const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateId() {
  return 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}

async function checkTableExists(tableName) {
    try {
        const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = ${tableName}`;
        return result[0]?.count > 0;
    } catch (error) {
        console.log(`⚠️ Error checking table ${tableName}:`, error.message);
        return false;
    }
}

async function testGeminiKeyCreation() {
    try {
        console.log('🔍 Testing Gemini key creation process...');
        
        // Check if tables exist
        const geminiKeysExists = await checkTableExists('gemini_keys');
        const geminiKeyModelsExists = await checkTableExists('gemini_key_models');
        
        console.log('📊 Table existence:', {
            gemini_keys: geminiKeysExists,
            gemini_key_models: geminiKeyModelsExists
        });
        
        if (!geminiKeysExists) {
            console.log('❌ gemini_keys table does not exist');
            console.log('🔧 Attempting to create tables...');
            
            try {
                await prisma.$executeRaw`
                  CREATE TABLE IF NOT EXISTS \`gemini_keys\` (
                    \`id\` VARCHAR(191) NOT NULL,
                    \`name\` VARCHAR(191) NOT NULL,
                    \`apiKey\` VARCHAR(191) NOT NULL,
                    \`model\` VARCHAR(191) NOT NULL DEFAULT 'gemini-2.5-flash',
                    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
                    \`priority\` INT NOT NULL DEFAULT 1,
                    \`description\` TEXT,
                    \`companyId\` VARCHAR(191) NOT NULL,
                    \`usage\` JSON,
                    \`currentUsage\` INT NOT NULL DEFAULT 0,
                    \`maxRequestsPerDay\` INT NOT NULL DEFAULT 1500,
                    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                    PRIMARY KEY (\`id\`)
                  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
                `;
                console.log('✅ gemini_keys table created');
            } catch (error) {
                console.error('❌ Error creating gemini_keys table:', error.message);
            }
        }
        
        if (!geminiKeyModelsExists) {
            console.log('❌ gemini_key_models table does not exist');
            console.log('🔧 Attempting to create gemini_key_models table...');
            
            try {
                await prisma.$executeRaw`
                  CREATE TABLE IF NOT EXISTS \`gemini_key_models\` (
                    \`id\` VARCHAR(191) NOT NULL,
                    \`keyId\` VARCHAR(191) NOT NULL,
                    \`model\` VARCHAR(191) NOT NULL,
                    \`usage\` JSON,
                    \`isEnabled\` BOOLEAN NOT NULL DEFAULT true,
                    \`priority\` INT NOT NULL DEFAULT 1,
                    \`lastUsed\` DATETIME(3),
                    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
                    PRIMARY KEY (\`id\`),
                    FOREIGN KEY (\`keyId\`) REFERENCES \`gemini_keys\`(\`id\`) ON DELETE CASCADE
                  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
                `;
                console.log('✅ gemini_key_models table created');
            } catch (error) {
                console.error('❌ Error creating gemini_key_models table:', error.message);
            }
        }
        
        // Test insertion with a dummy company ID
        const testCompanyId = 'test_company_123';
        const testKeyId = generateId();
        const testName = 'Test Key';
        const testApiKey = 'test_api_key_123';
        const testDescription = 'Test Description';
        
        console.log('🧪 Testing key insertion...');
        console.log('Test data:', {
            keyId: testKeyId,
            name: testName,
            apiKey: testApiKey,
            companyId: testCompanyId
        });
        
        try {
            await prisma.$executeRaw`
              INSERT INTO gemini_keys (id, name, apiKey, model, isActive, priority, description, companyId, createdAt, updatedAt, \`usage\`, currentUsage, maxRequestsPerDay)
              VALUES (${testKeyId}, ${testName}, ${testApiKey}, 'gemini-2.5-flash', true, 1, ${testDescription}, ${testCompanyId}, NOW(), NOW(), '{"used": 0, "limit": 1000000}', 0, 1500)
            `;
            console.log('✅ Test key inserted successfully');
            
            // Clean up test data
            await prisma.$executeRaw`DELETE FROM gemini_keys WHERE id = ${testKeyId}`;
            console.log('🧹 Test data cleaned up');
            
        } catch (error) {
            console.error('❌ Error inserting test key:', error.message);
            console.error('❌ Error code:', error.code);
            console.error('❌ Full error:', error);
        }
        
    } catch (error) {
        console.error('❌ General error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testGeminiKeyCreation();