const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                companyId: true,
                isActive: true
            }
        });
        
        console.log('Available users:');
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} - ${user.firstName} ${user.lastName} (${user.role}) - Company: ${user.companyId || 'No Company'} - Active: ${user.isActive}`);
        });
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkUsers();