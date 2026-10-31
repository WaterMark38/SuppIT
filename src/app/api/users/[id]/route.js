import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { AppError, json, readBody } from '@/lib/http';

const updateSchema = z.object({
  username: z.string().trim().min(3).max(40)
    .regex(/^[a-zA-Z][a-zA-Z0-9._-]*$/)
}).strict();

export const PATCH = withAuth(async (req, actor, ctx) => {
  const {id} = await ctx.params;
  const d = await readBody(req, updateSchema);
  const target = await prisma.user.findFirst({where:{id,companyId:actor.companyId}});
  if (!target) throw new AppError('User not found',404);
  if (target.role === 'SuperAdmin' && target.id !== actor.id) {
    throw new AppError('The Super Admin account is protected',403);
  }
  if (actor.role === 'Admin' && target.role !== 'Staff' && target.id !== actor.id) {
    throw new AppError('Administrators may only edit Staff usernames',403);
  }
  const changed = await prisma.user.update({
    where:{id}, data:{username:d.username.trim().toLowerCase()},
    select:{id:true,fullName:true,username:true,email:true,role:true}
  });
  return json(changed);
},['Admin']);
