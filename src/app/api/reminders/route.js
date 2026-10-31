import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { json } from '@/lib/http';
export const GET=withAuth(async(_req,u)=>json(await prisma.reminder.findMany({where:{companyId:u.companyId},include:{invoice:{select:{invoiceNumber:true,dueDate:true,paymentStatus:true}}},orderBy:{scheduledDate:'asc'}})));
