const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to generate unique IDs
function generateId() {
  return 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}

async function quickAddGeminiKey() {
    try {
        console.log('🚀 Quick Add Gemini Key Test');
        
        // Target company ID for شركة التسويق
        const targetCompanyId = 'cmem8ayyr004cufakqkcsyn97';
        
        // New Gemini key details
        const newKeyData = {
            name: 'Production API Key',
            apiKey: 'AIzaSyChIIlqr04fB2SjZ8-JtrUq_Bc0VUcN0wI',
            description: 'Production Gemini API key for marketing company'
        };
        
        console.log('📊 Checking existing keys...');
        const existingKeysCount = await prisma.gemini_keys.count({
            where: { companyId: targetCompanyId }
        });
        
        const priority = existingKeysCount + 1;
        const isFirstKey = existingKeysCount === 0;
        
        console.log(`📋 Current keys: ${existingKeysCount}, New priority: ${priority}`);
        
        // Create the main key
        const keyId = generateId();
        const defaultDescription = `مفتاح رقم ${priority} - يدعم جميع النماذج`;
        
        console.log('🔑 Creating key:', {
            keyId,
            name: newKeyData.name,
            companyId: targetCompanyId,
            priority,
            isFirstKey
        });
        
        await prisma.gemini_keys.create({
            data: {
                id: keyId,
                name: newKeyData.name,
                apiKey: newKeyData.apiKey,
                model: 'gemini-2.5-flash',
                isActive: isFirstKey,
                priority: priority,
                description: newKeyData.description || defaultDescription,
                companyId: targetCompanyId,
                usage: JSON.stringify({ used: 0, limit: 1000000 }),
                currentUsage: 0,
                maxRequestsPerDay: 1500
            }
        });
        
        console.log('✅ Main key created successfully');
        
        // Create models
        const availableModels = [
            { model: 'gemini-2.5-flash', limit: 1000000, priority: 1 },
            { model: 'gemini-2.5-pro', limit: 500000, priority: 2 },
            { model: 'gemini-2.0-flash', limit: 750000, priority: 3 },
            { model: 'gemini-2.0-flash-exp', limit: 1000, priority: 4 },
            { model: 'gemini-1.5-flash', limit: 1500, priority: 5 },
            { model: 'gemini-1.5-pro', limit: 50, priority: 6 }
        ];
        
        console.log('📦 Creating models...');
        for (const modelInfo of availableModels) {
            try {
                await prisma.gemini_key_models.create({
                    data: {
                        id: generateId(),
                        keyId: keyId,
                        model: modelInfo.model,
                        usage: JSON.stringify({
                            used: 0,
                            limit: modelInfo.limit,
                            resetDate: null
                        }),
                        isEnabled: true,
                        priority: modelInfo.priority
                    }
                });
                console.log(`✅ Created model: ${modelInfo.model}`);
            } catch (error) {
                console.log(`⚠️ Warning: Could not create model ${modelInfo.model}:`, error.message);
            }
        }
        
        // Verify
        const finalCount = await prisma.gemini_keys.count({
            where: { companyId: targetCompanyId }
        });
        
        console.log('🎉 SUCCESS!');
        console.log(`📊 Total keys for company: ${finalCount}`);
        console.log(`🔑 New key ID: ${keyId}`);
        console.log('✅ Gemini key added successfully to شركة التسويق');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) {
            console.error('❌ Error code:', error.code);
        }
    } finally {
        await prisma.$disconnect();
    }
}

quickAddGeminiKey();