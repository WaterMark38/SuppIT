// Backend API.
// Converts an accepted quotation into a linked sales order.
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { AppError,json } from '@/lib/http';
export const POST=withAuth(async(_req,u,ctx)=>{
 const {id}=await ctx.params;
 const order=await prisma.$transaction(async tx=>{
   const q=await tx.quotation.findFirst({where:{id,companyId:u.companyId},include:{items:true,order:true}});
   if(!q)throw new AppError('Quotation not found',404);
   if(q.status!=='Accepted')throw new AppError('Quotation must be accepted before conversion',409);
   if(q.order)throw new AppError('An order already exists for this quotation',409);
   return tx.salesOrder.create({data:{companyId:u.companyId,quotationId:q.id,customerId:q.customerId,totalAmount:q.totalAmount,
      items:{create:q.items.map(i=>({companyId:u.companyId,stockId:i.stockId,description:i.description,quantity:i.quantity,unitPrice:i.unitPrice,lineTotal:i.lineTotal}))}},include:{items:true}});
 },{isolationLevel:'Serializable'});
 return json(order,201);
},['Admin','Staff']);
