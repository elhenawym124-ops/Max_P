const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to generate unique IDs
function generateId() {
  return 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}

async function testAddGeminiKeyToMarketingCompany() {
    try {
        console.log('🚀 Testing Gemini key addition for Marketing Company');
        console.log('=' * 50);
        
        // Step 1: Find all companies first
        console.log('\n1. Finding all companies...');
        const allCompanies = await prisma.company.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
            }
        });
        
        console.log(`📊 Found ${allCompanies.length} companies:`);
        allCompanies.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.name} (${company.id})`);
        });
        
        // Step 2: Look for marketing company
        console.log('\n2. Looking for marketing company...');
        const marketingCompany = allCompanies.find(c => 
            c.name.includes('التسويق') || 
            c.name.toLowerCase().includes('marketing') ||
            c.name.includes('تسويق')
        );
        
        let targetCompanyId;
        if (marketingCompany) {
            console.log(`✅ Found marketing company: ${marketingCompany.name} (${marketingCompany.id})`);
            targetCompanyId = marketingCompany.id;
        } else {
            console.log('⚠️ Marketing company not found, creating one...');
            const newCompany = await prisma.company.create({
                data: {
                    id: generateId(),
                    name: 'شركة التسويق',
                    email: 'marketing@example.com',
                    phone: '+1234567890',
                    plan: 'PRO',
                    isActive: true,
                    currency: 'EGP'
                }
            });
            console.log(`✅ Created marketing company: ${newCompany.name} (${newCompany.id})`);
            targetCompanyId = newCompany.id;
        }
        
        // Step 3: Check current Gemini keys for this company
        console.log(`\n3. Checking current Gemini keys for company ${targetCompanyId}...`);
        const existingKeys = await prisma.gemini_keys.findMany({
            where: { companyId: targetCompanyId },
            select: {
                id: true,
                name: true,
                apiKey: true,
                priority: true,
                isActive: true
            }
        });
        
        console.log(`📋 Found ${existingKeys.length} existing keys:`);
        existingKeys.forEach((key, index) => {
            console.log(`   ${index + 1}. ${key.name} (${key.apiKey.substring(0, 10)}...) - Priority: ${key.priority}`);
        });
        
        // Step 4: Add the new Gemini key
        console.log('\n4. Adding new Gemini key...');
        const newKeyData = {
            name: 'Production API Key',
            apiKey: 'AIzaSyChIIlqr04fB2SjZ8-JtrUq_Bc0VUcN0wI',
            description: 'Production Gemini API key for marketing company'
        };
        
        const keyCount = existingKeys.length;
        const priority = keyCount + 1;
        const isFirstKey = keyCount === 0;
        
        console.log('🔑 Key details:', {
            name: newKeyData.name,
            apiKey: newKeyData.apiKey.substring(0, 10) + '...',
            companyId: targetCompanyId,
            priority: priority,
            isFirstKey: isFirstKey
        });
        
        // Create the main key
        const keyId = generateId();
        const defaultDescription = `مفتاح رقم ${priority} - يدعم جميع النماذج`;
        
        await prisma.$executeRaw`
            INSERT INTO gemini_keys (id, name, apiKey, model, isActive, priority, description, companyId, createdAt, updatedAt, \`usage\`, currentUsage, maxRequestsPerDay)
            VALUES (${keyId}, ${newKeyData.name}, ${newKeyData.apiKey}, 'gemini-2.5-flash', ${isFirstKey}, ${priority}, ${newKeyData.description || defaultDescription}, ${targetCompanyId}, NOW(), NOW(), '{"used": 0, "limit": 1000000}', 0, 1500)
        `;
        
        console.log('✅ Main key inserted successfully');
        
        // Step 5: Create all available models for this key
        console.log('\n5. Creating models for the key...');
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
                console.log(`✅ Model ${modelInfo.model} created`);
            } catch (error) {
                console.log(`⚠️ Warning: Could not create model ${modelInfo.model}:`, error.message);
            }
        }
        
        // Step 6: Verify the insertion
        console.log('\n6. Verifying the insertion...');
        const newKeys = await prisma.gemini_keys.findMany({
            where: { companyId: targetCompanyId },
            include: {
                models: true
            },
            orderBy: { priority: 'asc' }
        });
        
        console.log(`✅ Total keys for company: ${newKeys.length}`);
        newKeys.forEach((key, index) => {
            console.log(`   ${index + 1}. ${key.name} (${key.apiKey.substring(0, 10)}...) - ${key.models.length} models`);
        });
        
        console.log('\n🎉 SUCCESS! Gemini key added successfully');
        console.log('📊 Summary:');
        console.log(`   - Company: ${marketingCompany?.name || 'شركة التسويق'} (${targetCompanyId})`);
        console.log(`   - Key: ${newKeyData.name} (${keyId})`);
        console.log(`   - Models created: ${createdModels.length}`);
        console.log(`   - Total company keys: ${newKeys.length}`);
        
    } catch (error) {
        console.error('❌ Error during test:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        if (error.stack) {
            console.error('❌ Stack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testAddGeminiKeyToMarketingCompany();