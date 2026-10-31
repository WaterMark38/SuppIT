-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SuperAdmin';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
