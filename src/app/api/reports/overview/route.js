import { prisma, Prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { json } from '@/lib/http';
export const GET=withAuth(async(_req,u)=>{
 const where={companyId:u.companyId};
 const [customers,suppliers,stockItems,quotations,orders,invoices,payments,allInvoices]=await Promise.all([
  prisma.customer.count({where}),prisma.supplier.count({where}),prisma.stockItem.count({where}),prisma.quotation.count({where}),prisma.salesOrder.count({where}),prisma.invoice.count({where}),prisma.payment.aggregate({where,_sum:{amountPaid:true}}),prisma.invoice.findMany({where,select:{totalAmount:true}})
 ]);
 const billed=allInvoices.reduce((sum,i)=>sum.add(i.totalAmount),new Prisma.Decimal(0));
 const received=payments._sum.amountPaid||new Prisma.Decimal(0);
 return json({customers,suppliers,stockItems,quotations,orders,invoices,billedTotal:billed.toString(),paidTotal:received.toString(),outstandingTotal:billed.sub(received).toString(),currency:'ZAR'});
});
