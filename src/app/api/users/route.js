import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { AppError, json, readBody } from '@/lib/http';

// Every user logs in with a unique username. An email address is optional.
const usernameSchema = z.string().trim().min(3).max(40)
  .regex(/^[a-zA-Z][a-zA-Z0-9._-]*$/, 'Use letters, numbers, dots, hyphens or underscores');

const createSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  username: usernameSchema,
  email: z.union([z.email().max(150), z.literal('')]).optional().nullable(),
  password: z.string().min(12).max(72),
  role: z.enum(['Admin','Staff'])
}).strict();

export const GET = withAuth(async (_req, user) => json(
  await prisma.user.findMany({
    // A regular Admin cannot view Super Admin account details.
    where: {companyId:user.companyId,
      ...(user.role === 'Admin' ? {role: {not:'SuperAdmin'}} : {})},
    select: {id:true,fullName:true,username:true,email:true,role:true},
    orderBy: {fullName:'asc'}
  })
), ['Admin']);

export const POST = withAuth(async (req, actor) => {
  const d = await readBody(req, createSchema);
  if (actor.role === 'Admin' && d.role !== 'Staff') {
    throw new AppError('Administrators may only create Staff accounts',403);
  }
  const created = await prisma.user.create({
    data: {
      companyId:actor.companyId,
      fullName:d.fullName.trim(),
      username:d.username.trim().toLowerCase(),
      email:d.email ? d.email.trim().toLowerCase() : null,
      passwordHash:await bcrypt.hash(d.password,12),
      role:d.role
    },
    select: {id:true,fullName:true,username:true,email:true,role:true}
  });
  return json(created,201);
}, ['Admin']);
