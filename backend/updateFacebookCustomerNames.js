const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

// Function to get Facebook user info
async function getFacebookUserInfo(userId, pageAccessToken) {
  try {
    console.log(`🔍 Fetching Facebook user info for: ${userId}`);
    const response = await axios.get(`https://graph.facebook.com/v18.0/${userId}`, {
      params: {
        access_token: pageAccessToken,
        fields: 'first_name,last_name,profile_pic',
      },
      timeout: 5000
    });

    console.log(`✅ Facebook user info retrieved:`, {
      id: userId,
      name: `${response.data.first_name} ${response.data.last_name}`,
      first_name: response.data.first_name,
      last_name: response.data.last_name,
      profile_pic: response.data.profile_pic ? 'Available' : 'Not available'
    });

    return {
      firstName: response.data.first_name,
      lastName: response.data.last_name,
      profilePic: response.data.profile_pic
    };
  } catch (error) {
    console.error('❌ Error getting Facebook user info:', error.message);
    if (error.response) {
      console.error('❌ Facebook API Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    console.error('❌ Request details:', {
      userId: userId,
      url: `https://graph.facebook.com/v18.0/${userId}`,
      hasToken: !!pageAccessToken,
      tokenLength: pageAccessToken ? pageAccessToken.length : 0
    });
    return null;
  }
}

async function updateFacebookCustomerNames() {
  try {
    console.log('🔄 Starting to update Facebook customer names...');

    // البحث عن الصفحة الافتراضية للحصول على pageAccessToken
    const defaultPage = await prisma.facebookPage.findFirst({
      where: { status: 'connected' },
      orderBy: { connectedAt: 'desc' }
    });

    if (!defaultPage || !defaultPage.pageAccessToken) {
      console.log('❌ No connected Facebook page found');
      return;
    }

    // البحث عن العملاء الذين لديهم Facebook IDs
    const customersToUpdate = await prisma.customer.findMany({
      where: {
        facebookId: { not: null }
      },
      take: 100 // تحديث 100 عميل في المرة الواحدة لتجنب rate limiting
    });

    console.log(`📊 Found ${customersToUpdate.length} Facebook customers to update`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const customer of customersToUpdate) {
      try {
        // التحقق مما إذا كان الاسم افتراضي
        const isDefaultName = customer.firstName.includes('Facebook') || 
                             customer.firstName.includes('عميل') || 
                             customer.firstName.includes('زائر') || 
                             customer.firstName.includes('زبون') ||
                             customer.firstName === 'عميل' ||
                             customer.firstName === '' ||
                             customer.firstName === null;

        // إذا كان الاسم افتراضي أو غير متوفر، نحاول الحصول على اسم حقيقي من Facebook
        if (isDefaultName || !customer.firstName) {
          // جلب معلومات المستخدم الحقيقية من Facebook
          const userInfo = await getFacebookUserInfo(customer.facebookId, defaultPage.pageAccessToken);

          if (userInfo && userInfo.firstName && userInfo.lastName) {
            // التحقق من أن الاسم ليس افتراضياً
            const isFacebookDefaultName = ['Facebook', 'عميل', 'زائر', 'زبون'].includes(userInfo.firstName) ||
                                         ['User', 'كريم', 'مميز', 'عزيز', 'جديد'].includes(userInfo.lastName);

            if (!isFacebookDefaultName) {
              // تحديث اسم العميل بالاسم الحقيقي
              await prisma.customer.update({
                where: { id: customer.id },
                data: {
                  firstName: userInfo.firstName,
                  lastName: userInfo.lastName
                }
              });

              console.log(`✅ Updated customer ${customer.id}: ${customer.firstName || '[No First Name]'} ${customer.lastName || '[No Last Name]'} → ${userInfo.firstName} ${userInfo.lastName}`);
              updatedCount++;
            } else {
              console.log(`⚠️ Customer ${customer.id} has default name on Facebook too: ${userInfo.firstName} ${userInfo.lastName}`);
              
              // في هذه الحالة، نستخدم اسم الصفحة + آخر 4 أرقام من الـ ID
              const lastFourDigits = customer.facebookId.slice(-4);
              const pageName = defaultPage.pageName || 'صفحة فيسبوك';
              const newFirstName = `${pageName}`;
              const newLastName = `#${lastFourDigits}`;
              
              await prisma.customer.update({
                where: { id: customer.id },
                data: {
                  firstName: newFirstName,
                  lastName: newLastName
                }
              });
              
              console.log(`✅ Updated customer ${customer.id} to page name format: ${newFirstName} ${newLastName}`);
              updatedCount++;
            }
          } else {
            console.log(`⚠️ Could not get real name for customer ${customer.id} (${customer.facebookId}), using page name format`);
            
            // استخدام اسم الصفحة + آخر 4 أرقام من الـ ID
            const lastFourDigits = customer.facebookId.slice(-4);
            const pageName = defaultPage.pageName || 'صفحة فيسبوك';
            const newFirstName = `${pageName}`;
            const newLastName = `#${lastFourDigits}`;
            
            await prisma.customer.update({
              where: { id: customer.id },
              data: {
                firstName: newFirstName,
                lastName: newLastName
              }
            });
            
            console.log(`✅ Updated customer ${customer.id} to page name format: ${newFirstName} ${newLastName}`);
            updatedCount++;
          }
        } else {
          console.log(`ℹ️ Customer ${customer.id} already has a proper name: ${customer.firstName} ${customer.lastName}`);
        }

        // تأخير قصير لتجنب rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error updating customer ${customer.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`🎉 Update completed: ${updatedCount} updated, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Error updating Facebook customer names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateFacebookCustomerNames();