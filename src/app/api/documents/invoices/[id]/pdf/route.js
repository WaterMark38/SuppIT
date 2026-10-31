import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { AppError } from '@/lib/http';
import { makePdf } from '@/lib/pdf';
export const GET=withAuth(async(_req,u,ctx)=>{
 const {id}=await ctx.params;
 const inv=await prisma.invoice.findFirst({where:{id,companyId:u.companyId},include:{customer:true,items:true}});
 if(!inv)throw new AppError('Invoice not found',404);
 const c=await prisma.company.findUnique({where:{id:u.companyId}});
 const bytes=await makePdf({company:c.companyName,title:'TAX INVOICE',number:inv.invoiceNumber,date:inv.issueDate.toISOString().slice(0,10),customer:inv.customer.name,items:inv.items,total:inv.totalAmount});
 return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${inv.invoiceNumber}.pdf"`,'Cache-Control':'private, no-store'}});
});
