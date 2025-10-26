-- SQL script to reset ali@ali.com password
-- Run this in your database management tool or use Prisma Studio

-- First, generate the hash for 'admin123' using bcrypt with salt rounds 10
-- The hash for 'admin123' is: $2b$10$K2QqL9HzH4E.7QXfXUk3YelMaOqrUQ.WXLVGQT7FuRjHzrBsU2Cqm

UPDATE User 
SET 
    password = '$2b$10$K2QqL9HzH4E.7QXfXUk3YelMaOqrUQ.WXLVGQT7FuRjHzrBsU2Cqm',
    isActive = true,
    isEmailVerified = true,
    emailVerifiedAt = NOW()
WHERE email = 'ali@ali.com';

-- Check if update was successful
SELECT 
    id,
    email,
    isActive,
    isEmailVerified,
    companyId,
    role
FROM User 
WHERE email = 'ali@ali.com';