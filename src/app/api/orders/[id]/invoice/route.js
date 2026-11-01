// Backend API.
// Generates an invoice using the saved order items and totals.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { AppError,json,readBody } from '@/lib/http';
const schema=z.object({issueDate:z.iso.date(),dueDate:z.iso.date()}).strict();
export const POST=withAuth(async(req,u,ctx)=>{
 const {id}=await ctx.params;
 const {issueDate,dueDate}=await readBody(req,schema);
 if(dueDate<issueDate)throw new AppError('Due date cannot precede issue date',400);
 const record=await prisma.$transaction(async(tx)=>{
  const order=await tx.salesOrder.findFirst({where:{id,companyId:u.companyId},include:{items:true,invoice:true}});
  if(!order)throw new AppError('Order not found',404);
  if(order.invoice)throw new AppError('Invoice already generated',409);
  return tx.invoice.create({data:{companyId:u.companyId,orderId:order.id,customerId:order.customerId,invoiceNumber:`INV-${issueDate.slice(0,4)}-${randomUUID().slice(0,8).toUpperCase()}`,issueDate:new Date(`${issueDate}T00:00:00.000Z`),dueDate:new Date(`${dueDate}T00:00:00.000Z`),totalAmount:order.totalAmount,items:{create:order.items.map(i=>({companyId:u.companyId,stockId:i.stockId,description:i.description,quantity:i.quantity,unitPrice:i.unitPrice,lineTotal:i.lineTotal}))}},include:{items:true}});
 },{isolationLevel:'Serializable'});
 return json(record,201);
},['Admin','Staff']);
