const { getSharedPrismaClient, executeWithRetry } = require('./services/sharedDatabase');
const readline = require('readline');

async function addTestGeminiKey() {
  const prisma = getSharedPrismaClient();
  
  try {
    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Ask for API key
    const apiKey = await new Promise((resolve) => {
      rl.question('Enter your Gemini API key: ', (answer) => {
        resolve(answer);
        rl.close();
      });
    });

    if (!apiKey) {
      console.log('❌ No API key provided. Exiting.');
      return;
    }

    console.log('🔧 Adding test Gemini API key...');

    // Create AI key record
    const aiKey = await executeWithRetry(async () => {
      return await prisma.aIKey.create({
        data: {
          provider: 'google-gemini',
          key: apiKey,
          model: 'gemini-pro',
          isActive: true,
          usageCount: 0,
          maxUsage: 1000,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    });

    console.log(`✅ Successfully added Gemini API key with ID: ${aiKey.id}`);
    console.log(`📊 Key details:`);
    console.log(`   Provider: ${aiKey.provider}`);
    console.log(`   Model: ${aiKey.model}`);
    console.log(`   Active: ${aiKey.isActive}`);
    
  } catch (error) {
    console.error('❌ Error adding test Gemini key:', error);
  } finally {
    // Note: We don't disconnect the shared client as it's used by the main application
  }
}

addTestGeminiKey();