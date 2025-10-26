#!/usr/bin/env node

/**
 * Test Categories API
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('./services/sharedDatabase');

const prisma = getSharedPrismaClient();

async function testCategoriesAPI() {
  console.log('🧪 Testing Categories API...\n');

  try {
    // First, get a real user from the database
    console.log('📋 Step 1: Getting user from database...');
    const user = await prisma.user.findUnique({
      where: { email: 'ali@ali.com' },
      include: { company: true }
    });

    if (!user) {
      console.error('❌ User not found. Make sure ali@ali.com exists in the database.');
      return;
    }

    console.log('✅ User found:', {
      email: user.email,
      companyId: user.companyId,
      company: user.company?.name
    });

    // Create a valid JWT token
    console.log('📋 Step 2: Creating valid JWT token...');
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log('✅ JWT token created:', token.substring(0, 20) + '...');

    // Test the categories API
    console.log('📋 Step 3: Testing categories API...');
    const url = 'http://localhost:3001/api/v1/products/categories';
    console.log('📤 Making request to:', url);

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Response Status:', response.status);
    console.log('📦 Response Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCategoriesAPI();