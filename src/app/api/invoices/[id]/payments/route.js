// Backend API.
// Records a payment and updates the invoice balance and status.
import { z } from 'zod';
import { prisma, Prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { AppError,json,readBody } from '@/lib/http';
const schema=z.object({amountPaid:z.number().finite().positive(),paymentMethod:z.string().trim().min(1).max(30)}).strict();
export const POST=withAuth(async(req,u,ctx)=>{
 const {id}=await ctx.params;const d=await readBody(req,schema);
 const amount=new Prisma.Decimal(String(d.amountPaid)).toDecimalPlaces(2);
 if(amount.lte(0))throw new AppError('Payment must be at least R0.01');
 const result=await prisma.$transaction(async tx=>{
   const invoice=await tx.invoice.findFirst({where:{id,companyId:u.companyId},include:{payments:true}});
   if(!invoice)throw new AppError('Invoice not found',404);
   const alreadyPaid=invoice.payments.reduce((sum,p)=>sum.add(p.amountPaid),new Prisma.Decimal(0));
   const remaining=invoice.totalAmount.sub(alreadyPaid);
   if(amount.gt(remaining))throw new AppError('Payment exceeds outstanding balance',409);
   const payment=await tx.payment.create({data:{companyId:u.companyId,invoiceId:id,amountPaid:amount,paymentMethod:d.paymentMethod}});
   const newStatus=amount.eq(remaining)?'Paid':'PartiallyPaid';
   await tx.invoice.update({where:{id},data:{paymentStatus:newStatus}});
   if(newStatus==='Paid')await tx.reminder.updateMany({where:{companyId:u.companyId,invoiceId:id,status:{in:['Overdue','DueSoon']}},data:{status:'Resolved'}});
   return {payment,paymentStatus:newStatus,outstanding:remaining.sub(amount).toString()};
 },{isolationLevel:'Serializable'});
 return json(result,201);
},['Admin','Staff']);
