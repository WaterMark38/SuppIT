import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { withAuth, clearSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AppError, json, readBody } from '@/lib/http';

const schema = z.object({
  password: z.string().min(12).max(72),
  currentPassword: z.string().optional()
}).strict();

export const PATCH = withAuth(async (req, actor, ctx) => {
  const {id} = await ctx.params;
  const d = await readBody(req,schema);
  const target = await prisma.user.findFirst({where:{id,companyId:actor.companyId}});
  if (!target) throw new AppError('User not found',404);

  const isSelf = target.id === actor.id;

  // Administrators may reset Staff only; the Super Admin may reset any
  // other Admin/Staff account. No one may reset the Super Admin from another account.
  if (!isSelf) {
    if (target.role === 'SuperAdmin') throw new AppError('The Super Admin account is protected',403);
    if (actor.role === 'Admin' && target.role !== 'Staff') {
      throw new AppError('Administrators may only reset Staff passwords',403);
    }
  } else {
    // All users who change their own passwords must prove they know the old one.
    if (!d.currentPassword || !await bcrypt.compare(d.currentPassword,target.passwordHash)) {
      throw new AppError('Current password is incorrect',403);
    }
  }

  await prisma.user.update({
    where:{id},
    data:{passwordHash:await bcrypt.hash(d.password,12),sessionVersion:{increment:1}}
  });
  if (isSelf) await clearSession();
  return json({success:true, signedOut:isSelf});
},['Admin']);
