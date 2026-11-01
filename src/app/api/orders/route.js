// Backend API.
// Returns saved sales orders and their linked information.
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { json } from '@/lib/http';
export const GET=withAuth(async(_req,u)=>json(await prisma.salesOrder.findMany({where:{companyId:u.companyId},include:{customer:true,quotation:true,items:true,invoice:{select:{id:true,invoiceNumber:true}}},orderBy:{createdAt:'desc'}})));
