import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { withAuth, clearSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AppError, json, readBody } from '@/lib/http';

const schema = z.object({
  password: z.string().min(12).max(72),
  currentPassword: z.string().optional()
}).strict();

export const PATCH = withAuth(async (req, admin, ctx) => {
  const {id} = await ctx.params;
  const d = await readBody(req,schema);
  const target = await prisma.user.findFirst({where:{id,companyId:admin.companyId}});
  if (!target) throw new AppError('User not found',404);

  const isSelf = target.id === admin.id;
  if (target.role === 'Admin') {
    // Prevent one administrator from taking over another administrator's account.
    if (!isSelf) throw new AppError('Only the account owner can change this administrator password',403);
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
