const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateId() {
  return 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}

async function testAddGeminiKeyForSpecificCompany() {
    try {
        console.log('🔍 Testing Gemini key creation for specific company...');
        
        const companyId = 'cmem8ayyr004cufakqkcsyn97'; // The exact company ID from the error
        const name = 'Test Gemini Key';
        const apiKey = 'test_api_key_fake';
        const description = 'Test description';
        
        console.log('Test parameters:', {
            companyId,
            name,
            apiKey,
            description
        });
        
        // First, let's check the current key count for this company
        const keyCount = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM gemini_keys WHERE companyId = ${companyId}
        `;
        const count = Number(keyCount[0]?.count || 0);
        const priority = count + 1;
        
        console.log('Current key count for company:', count);
        console.log('New key priority will be:', priority);
        
        // Create the main key with companyId
        const keyId = generateId();
        const defaultDescription = `مفتاح رقم ${priority} - يدعم جميع النماذج`;
        const isFirstKey = count === 0;
        
        console.log('Attempting to insert key with ID:', keyId);
        
        await prisma.$executeRaw`
            INSERT INTO gemini_keys (id, name, apiKey, model, isActive, priority, description, companyId, createdAt, updatedAt, \`usage\`, currentUsage, maxRequestsPerDay)
            VALUES (${keyId}, ${name}, ${apiKey}, 'gemini-2.5-flash', ${isFirstKey}, ${priority}, ${description || defaultDescription}, ${companyId}, NOW(), NOW(), '{"used": 0, "limit": 1000000}', 0, 1500)
        `;
        
        console.log('✅ Gemini key inserted successfully!');
        
        // Test creating a model for this key
        const modelId = generateId();
        const testModel = 'gemini-2.5-flash';
        
        console.log('Attempting to insert model with ID:', modelId);
        
        await prisma.$executeRaw`
            INSERT INTO \`gemini_key_models\`
            (\`id\`, \`keyId\`, \`model\`, \`usage\`, \`isEnabled\`, \`priority\`, \`createdAt\`, \`updatedAt\`)
            VALUES
            (${modelId}, ${keyId}, ${testModel}, ${JSON.stringify({
                used: 0,
                limit: 1000000,
                resetDate: null
            })}, true, 1, NOW(), NOW())
        `;
        
        console.log('✅ Model inserted successfully!');
        
        // Clean up test data
        await prisma.$executeRaw`DELETE FROM \`gemini_key_models\` WHERE keyId = ${keyId}`;
        await prisma.$executeRaw`DELETE FROM gemini_keys WHERE id = ${keyId}`;
        console.log('🧹 Test data cleaned up');
        
    } catch (error) {
        console.error('❌ Error during test:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Full error object:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testAddGeminiKeyForSpecificCompany();