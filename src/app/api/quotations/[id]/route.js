// Backend API.
// Updates a specific quotation if its current status allows changes.
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { AppError,json,readBody } from '@/lib/http';
const schema=z.object({status:z.enum(['Sent','Accepted','Declined'])}).strict();
export const PATCH=withAuth(async(req,u,ctx)=>{
 const {id}=await ctx.params;const {status}=await readBody(req,schema);
 const q=await prisma.quotation.findFirst({where:{id,companyId:u.companyId}});
 if(!q)throw new AppError('Quotation not found',404);
 if(q.status==='Accepted'||q.status==='Declined')throw new AppError('This quotation is already finalised',409);
 return json(await prisma.quotation.update({where:{id},data:{status}}));
},['Admin','Staff']);
