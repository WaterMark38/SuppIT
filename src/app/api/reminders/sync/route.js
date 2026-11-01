// Backend API.
// Checks outstanding invoices and updates due-soon or overdue reminders in Neon.
import { withAuth } from '@/lib/auth';
import { prisma, Prisma } from '@/lib/db';
import { json } from '@/lib/http';
// Checks due dates; does not send emails.
export const POST=withAuth(async(_req,u)=>{
 const today=new Date();today.setUTCHours(0,0,0,0);
 const invoices=await prisma.invoice.findMany({where:{companyId:u.companyId,paymentStatus:{not:'Paid'}},include:{payments:true}});
 let updated=0;
 for(const invoice of invoices){
   const totalPaid=invoice.payments.reduce((sum,p)=>sum.add(p.amountPaid),new Prisma.Decimal(0));
   if(totalPaid.gte(invoice.totalAmount))continue;
   const diff=Math.floor((invoice.dueDate.getTime()-today.getTime())/86400000);
   const status=diff<0?'Overdue':diff<=7?'DueSoon':null;
   if(!status)continue;
   await prisma.reminder.upsert({where:{invoiceId:invoice.id},create:{companyId:u.companyId,invoiceId:invoice.id,status,scheduledDate:today,description:`Invoice ${invoice.invoiceNumber} is ${status==='Overdue'?'overdue':'due soon'}`},update:{scheduledDate:today,status,description:`Invoice ${invoice.invoiceNumber} is ${status==='Overdue'?'overdue':'due soon'}`}});
   updated++;
 }
 return json({remindersChecked:invoices.length,createdOrUpdated:updated,thresholdDays:7});
},['Admin','Staff']);
