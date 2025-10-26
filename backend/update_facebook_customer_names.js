/**
 * Script to update existing Facebook customers with generic names to fetch their real Facebook names
 */

const { PrismaClient } = require('@prisma/client');
const { fetchFacebookUserProfile } = require('./utils/allFunctions');

const prisma = new PrismaClient();

async function updateFacebookCustomerNames() {
  try {
    console.log('🔄 Starting to update Facebook customer names...');

    // Find a connected Facebook page to get pageAccessToken
    const defaultPage = await prisma.facebookPage.findFirst({
      where: { status: 'connected' },
      orderBy: { connectedAt: 'desc' },
      select: {
        pageId: true,
        pageName: true,
        pageAccessToken: true
      }
    });

    if (!defaultPage || !defaultPage.pageAccessToken) {
      console.error('❌ No connected Facebook page found');
      return;
    }

    console.log(`✅ Using Facebook page: ${defaultPage.pageName} (${defaultPage.pageId})`);

    // Find customers with generic names who have Facebook IDs
    const customersToUpdate = await prisma.customer.findMany({
      where: {
        AND: [
          { facebookId: { not: null } },
          {
            OR: [
              { firstName: 'Facebook' },
              { lastName: 'User' },
              { firstName: { contains: 'Facebook' } },
              { firstName: 'عميل' },
              { firstName: 'زائر' },
              { firstName: 'زبون' },
              { lastName: 'كريم' },
              { lastName: 'مميز' },
              { lastName: 'عزيز' },
              { lastName: 'جديد' },
              // Also check for customers with only last 4 digits as last name
              { firstName: 'عميل فيسبوك' },
              { firstName: 'مستخدم' }
            ]
          }
        ]
      },
      take: 100 // Process 100 customers at a time to avoid rate limiting
    });

    console.log(`📊 Found ${customersToUpdate.length} customers to update`);

    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const customer of customersToUpdate) {
      try {
        console.log(`\n🔄 Processing customer ${customer.id}: ${customer.firstName} ${customer.lastName} (${customer.facebookId})`);
        
        // Skip if customer already has a non-generic name
        const isGenericName = customer.firstName === 'Facebook' || 
                             customer.lastName === 'User' || 
                             customer.firstName.includes('Facebook') || 
                             customer.firstName === 'عميل' || 
                             customer.firstName === 'زائر' || 
                             customer.firstName === 'زبون' || 
                             customer.lastName === 'كريم' || 
                             customer.lastName === 'مميز' || 
                             customer.lastName === 'عزيز' || 
                             customer.lastName === 'جديد' || 
                             customer.firstName === 'عميل فيسبوك' ||
                             customer.firstName === 'مستخدم';
        
        if (!isGenericName) {
          console.log(`ℹ️ Customer ${customer.id} already has a non-generic name: ${customer.firstName} ${customer.lastName}`);
          skippedCount++;
          continue;
        }
        
        // Fetch real Facebook profile
        const facebookProfile = await fetchFacebookUserProfile(customer.facebookId, defaultPage.pageAccessToken);
        
        if (facebookProfile && (facebookProfile.first_name || facebookProfile.name)) {
          // Use first_name and last_name if available
          let firstName = customer.firstName;
          let lastName = customer.lastName;
          
          if (facebookProfile.first_name) {
            firstName = facebookProfile.first_name;
            lastName = facebookProfile.last_name || '';
          } 
          // Fallback to parsing the 'name' field
          else if (facebookProfile.name) {
            const nameParts = facebookProfile.name.split(' ');
            firstName = nameParts[0] || facebookProfile.name;
            lastName = nameParts.slice(1).join(' ') || '';
          }
          
          // Check if the name is actually different before updating
          if (firstName !== customer.firstName || lastName !== customer.lastName) {
            // Update customer with real name
            await prisma.customer.update({
              where: { id: customer.id },
              data: {
                firstName: firstName,
                lastName: lastName,
                metadata: JSON.stringify({
                  ...customer.metadata ? JSON.parse(customer.metadata) : {},
                  facebookProfile: facebookProfile,
                  nameUpdated: true,
                  nameUpdatedAt: new Date().toISOString(),
                  profilePicture: facebookProfile.profile_pic
                })
              }
            });

            console.log(`✅ Updated customer ${customer.id}: ${customer.firstName} ${customer.lastName} → ${firstName} ${lastName}`);
            updatedCount++;
          } else {
            console.log(`ℹ️ Customer ${customer.id} name is already correct: ${firstName} ${lastName}`);
            skippedCount++;
          }
        } else {
          console.log(`⚠️ Could not get real name for customer ${customer.id} (${customer.facebookId})`);
          
          // If we can't get the real name, at least update the metadata to show we tried
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              metadata: JSON.stringify({
                ...customer.metadata ? JSON.parse(customer.metadata) : {},
                profileFetchAttempted: true,
                profileFetchFailedAt: new Date().toISOString(),
                profileFetchError: 'Profile not accessible or user has privacy restrictions'
              })
            }
          });
          
          skippedCount++;
        }

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`❌ Error updating customer ${customer.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Update completed: ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Error updating customer names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  updateFacebookCustomerNames().catch(console.error);
}

module.exports = { updateFacebookCustomerNames };