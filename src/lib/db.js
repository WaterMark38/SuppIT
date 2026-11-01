// Backend helpers.
import { PrismaClient, Prisma } from '@prisma/client';
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.suppitPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.suppitPrisma = prisma;
export { Prisma };
