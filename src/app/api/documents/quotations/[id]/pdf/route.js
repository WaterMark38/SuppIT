// Backend API.
// Creates a PDF from the saved quotation details.
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { AppError } from '@/lib/http';
import { makePdf } from '@/lib/pdf';
export const GET=withAuth(async(_req,u,ctx)=>{
 const {id}=await ctx.params;
 const q=await prisma.quotation.findFirst({where:{id,companyId:u.companyId},include:{customer:true,items:true}});
 if(!q)throw new AppError('Quotation not found',404);
 const c=await prisma.company.findUnique({where:{id:u.companyId}});
 const bytes=await makePdf({company:c.companyName,title:'QUOTATION',number:q.id,date:q.createdAt.toISOString().slice(0,10),customer:q.customer.name,items:q.items,total:q.totalAmount});
 return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="quotation-${id}.pdf"`,'Cache-Control':'private, no-store'}});
});
