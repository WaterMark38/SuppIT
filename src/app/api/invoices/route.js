// Backend API.
// Returns invoices and their payment details.
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { json } from '@/lib/http';
export const GET=withAuth(async(_req,u)=>json(await prisma.invoice.findMany({where:{companyId:u.companyId},include:{customer:true,items:true,payments:true},orderBy:{issueDate:'desc'},take:200})));
