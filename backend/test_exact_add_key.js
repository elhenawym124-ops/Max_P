const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateId() {
  return 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}

// Helper function to test Gemini key
async function testGeminiKey(apiKey, model) {
    try {
        // Skip actual API test for now
        console.log(`🧪 Would test API key with model: ${model}`);
        return {
            success: true,
            model,
            status: 'Working (simulated)',
            response: 'Test response...'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Exact copy of the addNewGeminKey logic
async function simulateAddNewGeminKey(requestBody, user) {
    try {
        console.log('🔍 Starting addNewGeminKey simulation...');
        console.log('📥 Request body:', requestBody);
        console.log('👤 User:', user);
        
        // 🔐 الحصول على companyId من المستخدم المصادق عليه
        if (!user || !user.companyId) {
            throw new Error('مستخدم غير صالح');
        }

        const companyId = user.companyId;
        console.log('🏢 [GEMINI-KEYS] Adding key for company:', companyId);

        const { name, apiKey, description } = requestBody;

        if (!name || !apiKey) {
            throw new Error('Name and API key are required');
        }

        // Test the key with a basic model first (skip in development for testing)
        const skipKeyValidation = process.env.NODE_ENV === 'development' && apiKey.includes('Test_Key');

        if (!skipKeyValidation) {
            console.log('🔑 Testing API key...');
            const testResult = await testGeminiKey(apiKey, 'gemini-2.5-flash');
            if (!testResult.success) {
                throw new Error(`Invalid API key: ${testResult.error}`);
            }
        } else {
            console.log('⚠️ [DEV] Skipping key validation for test key');
        }

        // 🔒 Get current key count for this company only
        console.log('📊 Getting current key count...');
        const keyCount = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM gemini_keys WHERE companyId = ${companyId}
        `;
        const count = Number(keyCount[0]?.count || 0);
        const priority = count + 1;

        console.log('Current key count:', count, 'New priority:', priority);

        // 🔒 Create the main key with companyId
        const keyId = generateId();
        const defaultDescription = `مفتاح رقم ${priority} - يدعم جميع النماذج`;
        const isFirstKey = count === 0;

        console.log('🆕 Creating key:', {
            keyId,
            name,
            priority,
            isFirstKey,
            companyId
        });

        await prisma.$executeRaw`
            INSERT INTO gemini_keys (id, name, apiKey, model, isActive, priority, description, companyId, createdAt, updatedAt, \`usage\`, currentUsage, maxRequestsPerDay)
            VALUES (${keyId}, ${name}, ${apiKey}, 'gemini-2.5-flash', ${isFirstKey}, ${priority}, ${description || defaultDescription}, ${companyId}, NOW(), NOW(), '{"used": 0, "limit": 1000000}', 0, 1500)
        `;

        console.log('✅ Main key inserted successfully');

        // Create all available models for this key
        const availableModels = [
            { model: 'gemini-2.5-flash', limit: 1000000, priority: 1 },
            { model: 'gemini-2.5-pro', limit: 500000, priority: 2 },
            { model: 'gemini-2.0-flash', limit: 750000, priority: 3 },
            { model: 'gemini-2.0-flash-exp', limit: 1000, priority: 4 },
            { model: 'gemini-1.5-flash', limit: 1500, priority: 5 },
            { model: 'gemini-1.5-pro', limit: 50, priority: 6 }
        ];

        const createdModels = [];
        for (const modelInfo of availableModels) {
            try {
                console.log(`📦 Creating model: ${modelInfo.model}`);
                await prisma.$executeRaw`
                    INSERT INTO \`gemini_key_models\`
                    (\`id\`, \`keyId\`, \`model\`, \`usage\`, \`isEnabled\`, \`priority\`, \`createdAt\`, \`updatedAt\`)
                    VALUES
                    (${generateId()}, ${keyId}, ${modelInfo.model}, ${JSON.stringify({
                        used: 0,
                        limit: modelInfo.limit,
                        resetDate: null
                    })}, true, ${modelInfo.priority}, NOW(), NOW())
                `;
                createdModels.push(modelInfo.model);
            } catch (error) {
                console.log(`⚠️ Warning: Could not create model ${modelInfo.model}:`, error.message);
            }
        }

        console.log('✅ All models created:', createdModels);

        const result = {
            success: true,
            data: {
                id: keyId,
                name,
                apiKey: apiKey.substring(0, 10) + '...' + apiKey.slice(-4),
                companyId,
                modelsCreated: createdModels.length,
                models: createdModels
            }
        };

        console.log('🎉 Success result:', result);

        // Clean up test data
        await prisma.$executeRaw`DELETE FROM \`gemini_key_models\` WHERE keyId = ${keyId}`;
        await prisma.$executeRaw`DELETE FROM gemini_keys WHERE id = ${keyId}`;
        console.log('🧹 Test data cleaned up');

        return result;
    } catch (error) {
        console.error('❌ Error in simulation:', error.message);
        console.error('❌ Stack:', error.stack);
        throw error;
    }
}

async function runTest() {
    try {
        // Get the actual user from database
        const users = await prisma.$queryRaw`
            SELECT * FROM users WHERE email = 'ali@ali.com' LIMIT 1
        `;
        
        if (users.length === 0) {
            throw new Error('User not found');
        }

        const user = {
            id: users[0].id,
            companyId: users[0].companyId,
            email: users[0].email,
            role: users[0].role
        };

        // Simulate the exact request body that would come from frontend
        const requestBody = {
            name: 'Test Gemini Key from Simulation',
            apiKey: 'fake_test_key_12345_Test_Key',
            description: 'This is a test key created from simulation',
            model: 'gemini-2.5-flash'
        };

        await simulateAddNewGeminKey(requestBody, user);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();