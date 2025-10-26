const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = getSharedPrismaClient();

const getAllCompanies = async (req, res) => {
    try {
        const companies = await prisma.company.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        facebookPages: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            success: true,
            message: 'تم جلب الشركات بنجاح',
            data: { companies }
        });

    } catch (error) {
        console.error('❌ Error fetching companies:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الشركات',
            error: error.message
        });
    }
};

const getCompanyDetails = async (req, res) => {
    try {
        const { companyId } = req.params;

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        isActive: true,
                        lastLoginAt: true,
                        createdAt: true
                    }
                },
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        products: true,
                        conversations: true
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        res.json({
            success: true,
            message: 'تم جلب بيانات الشركة بنجاح',
            data: { company }
        });

    } catch (error) {
        console.error('❌ Error fetching company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب بيانات الشركة',
            error: error.message
        });
    }
};

const createNewCompany = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            website,
            plan = 'BASIC',
            currency = 'EGP',
            adminFirstName,
            adminLastName,
            adminEmail,
            adminPassword
        } = req.body;

        // Validation
        if (!name || !email || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
            return res.status(400).json({
                success: false,
                message: 'جميع الحقول المطلوبة يجب ملؤها'
            });
        }

        // Check if company email already exists
        const existingCompany = await prisma.company.findUnique({
            where: { email }
        });

        if (existingCompany) {
            return res.status(400).json({
                success: false,
                message: 'شركة بهذا البريد الإلكتروني موجودة بالفعل'
            });
        }

        // Check if admin email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'مستخدم بهذا البريد الإلكتروني موجود بالفعل'
            });
        }

        // Create company
        const company = await prisma.company.create({
            data: {
                name,
                email,
                phone,
                website,
                plan,
                currency,
                isActive: true
            }
        });

        // Hash admin password
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Create admin user
        const adminUser = await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                firstName: adminFirstName,
                lastName: adminLastName,
                role: 'COMPANY_ADMIN',
                companyId: company.id,
                isActive: true,
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            }
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الشركة بنجاح',
            data: {
                company,
                adminUser: {
                    id: adminUser.id,
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName
                }
            }
        });

    } catch (error) {
        console.error('❌ Error creating company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إنشاء الشركة',
            error: error.message
        });
    }
};

const updateCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            name,
            email,
            phone,
            website,
            plan,
            currency,
            isActive
        } = req.body;   

        console.log(req.body);
        // Check if company exists
        const existingCompany = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Check if email is being changed and already exists
        if (email && email !== existingCompany.email) {
            const emailExists = await prisma.company.findUnique({
                where: { email }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'شركة بهذا البريد الإلكتروني موجودة بالفعل'
                });
            }
        }

        // Update company
        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(website !== undefined && { website }),
                ...(plan !== undefined && { plan }),
                ...(currency !== undefined && { currency }),
                ...(isActive !== undefined && { isActive })
            }
        });

        res.json({
            success: true,
            message: 'تم تحديث الشركة بنجاح',
            data: { company: updatedCompany }
        });

    } catch (error) {
        console.error('❌ Error updating company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الشركة',
            error: error.message
        });
    }
};

const deleteCompany = async (req, res) => {
    try {
        const { companyId } = req.params;

        // Check if company exists
        const existingCompany = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Check if company has any related data that might prevent deletion
        const companyData = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        facebookPages: true,
                        products: true,
                        conversations: true
                    }
                }
            }
        });

        console.log(`Company data for deletion:`, companyData);

        // Delete company (cascade will handle related records)
        await prisma.company.delete({
            where: { id: companyId }
        });

        res.json({
            success: true,
            message: 'تم حذف الشركة بنجاح'
        });

    } catch (error) {
        console.error('❌ Error deleting company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف الشركة',
            error: error.message
        });
    }
};

const getCompanyFacebookPages = async (req, res) => {
    try {
        const { companyId } = req.params;
        console.log(`Fetching Facebook pages for company ID: ${companyId}`);

        // Check if company exists
        const existingCompany = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            console.log(`Company not found for ID: ${companyId}`);
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        console.log(`Company found: ${existingCompany.name}`);

        // Get Facebook pages for this company
        const facebookPages = await prisma.facebookPage.findMany({
            where: { companyId: companyId },
            select: {
                id: true,
                pageId: true,
                pageName: true,
                status: true,
                connectedAt: true,
                disconnectedAt: true, // Added this field which exists in the model
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                connectedAt: 'desc'
            }
        });

        console.log(`Found ${facebookPages.length} Facebook pages for company ${companyId}`);
        res.json({
            success: true,
            message: 'تم جلب صفحات الفيسبوك بنجاح',
            data: facebookPages
        });

    } catch (error) {
        console.error('❌ Error fetching Facebook pages:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب صفحات الفيسبوك',
            error: error.message
        });
    }
};

const loginAsCompanyAdmin = async (req, res) => {
    try {
        const { companyId } = req.params;

        // Check if company exists
        const existingCompany = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Find the company admin user
        const adminUser = await prisma.user.findFirst({
            where: {
                companyId: companyId,
                role: 'COMPANY_ADMIN',
                isActive: true
            }
        });

        if (!adminUser) {
            return res.status(404).json({
                success: false,
                message: 'لم يتم العثور على مدير للشركة'
            });
        }

        // Generate JWT token for the admin user
        const token = jwt.sign(
            {
                userId: adminUser.id,
                email: adminUser.email,
                role: adminUser.role,
                companyId: adminUser.companyId
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'تم تسجيل الدخول كمدير الشركة بنجاح',
            data: {
                token,
                user: {
                    id: adminUser.id,
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    role: adminUser.role,
                    companyId: adminUser.companyId
                }
            }
        });

    } catch (error) {
        console.error('❌ Error logging in as company admin:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تسجيل الدخول كمدير الشركة',
            error: error.message
        });
    }
};

module.exports = {
    getAllCompanies,
    getCompanyDetails,
    createNewCompany,
    updateCompany,
    deleteCompany,
    getCompanyFacebookPages,
    loginAsCompanyAdmin
};