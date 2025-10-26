/**
 * Production Deployment Configuration Script
 * Run this script to configure the application for production deployment
 */

const fs = require('fs');
const path = require('path');

function updateProductionConfig() {
  console.log('🚀 Configuring application for production deployment...');
  
  const envPath = path.join(__dirname, '.env');
  
  try {
    // Read current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update environment variables for production
    envContent = envContent.replace(/NODE_ENV=development/g, 'NODE_ENV=production');
    envContent = envContent.replace(/CORS_ORIGIN=http:\/\/localhost:3000/g, 'CORS_ORIGIN=https://www.mokhtarelhenawy.online');
    envContent = envContent.replace(/BACKEND_URL=http:\/\/localhost:3001/g, 'BACKEND_URL=https://www.mokhtarelhenawy.online');
    
    // Write updated content back
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Production configuration applied successfully!');
    console.log('');
    console.log('📋 Production Settings:');
    console.log('   • NODE_ENV: production');
    console.log('   • CORS_ORIGIN: https://www.mokhtarelhenawy.online');
    console.log('   • BACKEND_URL: https://www.mokhtarelhenawy.online');
    console.log('   • Webhook URL: https://www.mokhtarelhenawy.online/webhook');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Deploy the application to your server');
    console.log('   2. Ensure your domain points to the server');
    console.log('   3. Configure Facebook Developer Console webhook URL to:');
    console.log('      https://www.mokhtarelhenawy.online/webhook');
    console.log('   4. Test the webhook with a real Facebook message');
    console.log('');
    console.log('🔄 To revert to development, run: node revert-to-development.js');
    
  } catch (error) {
    console.error('❌ Error updating production configuration:', error.message);
  }
}

function revertToDevelopment() {
  console.log('🔄 Reverting to development configuration...');
  
  const envPath = path.join(__dirname, '.env');
  
  try {
    // Read current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Revert environment variables to development
    envContent = envContent.replace(/NODE_ENV=production/g, 'NODE_ENV=development');
    envContent = envContent.replace(/CORS_ORIGIN=https:\/\/mokhtarelhenawy\.online/g, 'CORS_ORIGIN=http://localhost:3000');
    envContent = envContent.replace(/BACKEND_URL=https:\/\/mokhtarelhenawy\.online/g, 'BACKEND_URL=http://localhost:3001');
    
    // Write updated content back
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Development configuration restored!');
    console.log('');
    console.log('📋 Development Settings:');
    console.log('   • NODE_ENV: development');
    console.log('   • CORS_ORIGIN: http://localhost:3000');
    console.log('   • BACKEND_URL: http://localhost:3001');
    console.log('   • Webhook URL: http://localhost:3001/webhook');
    
  } catch (error) {
    console.error('❌ Error reverting to development configuration:', error.message);
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'revert' || command === 'development' || command === 'dev') {
  revertToDevelopment();
} else {
  updateProductionConfig();
}