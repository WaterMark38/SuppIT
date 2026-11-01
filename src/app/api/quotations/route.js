// Backend API.
// Saves quotations and their line items in Neon.
import { prisma, Prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { quoteSchema } from '@/lib/schemas';
import { AppError, json, readBody } from '@/lib/http';
export const GET = withAuth(async (_req,u) => json(await prisma.quotation.findMany({where:{companyId:u.companyId},include:{customer:true,items:true,order:{select:{id:true}}},orderBy:{createdAt:'desc'},take:200})));
export const POST = withAuth(async(req,u)=>{
 const data=await readBody(req,quoteSchema);
 const customer=await prisma.customer.findFirst({where:{id:data.customerId,companyId:u.companyId}});
 if(!customer) throw new AppError('Customer not found for this company',404);
 const lines=[];
 for(const item of data.items){
   let stock=null;
   if(item.stockId){stock=await prisma.stockItem.findFirst({where:{id:item.stockId,companyId:u.companyId}});if(!stock)throw new AppError('Stock item not found',404);}
   const description=item.description || stock?.name;
   if(!description)throw new AppError('A description is required',400);
   if(item.unitPrice === undefined && !stock)throw new AppError('Unit price is required for custom services',400);
   const price = item.unitPrice === undefined ? new Prisma.Decimal(stock.unitPrice) : new Prisma.Decimal(String(item.unitPrice));
   const unitPrice=price.toDecimalPlaces(2);
   lines.push({companyId:u.companyId,stockId:stock?.id||null,description,quantity:item.quantity,unitPrice,lineTotal:unitPrice.mul(item.quantity)});
 }
 const subtotal=lines.reduce((sum,line)=>sum.add(line.lineTotal),new Prisma.Decimal('0'));
 const vat=new Prisma.Decimal(String(data.taxRate??0));
 const totalAmount=subtotal.mul(new Prisma.Decimal(1).add(vat.div(100))).toDecimalPlaces(2);
 const quote=await prisma.quotation.create({data:{companyId:u.companyId,customerId:customer.id,title:data.title||null,notes:data.notes||null,dueDate:data.dueDate?new Date(`${data.dueDate}T00:00:00.000Z`):null,priority:data.priority||'Medium',taxRate:data.taxRate??0,totalAmount,items:{create:lines}},include:{items:true}});
 return json(quote,201);
},['Admin','Staff']);
