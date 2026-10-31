import { prisma } from './db';
import { AppError, json, readBody } from './http';
import { withAuth } from './auth';
async function checkSupplier(companyId, supplierId) {
  if (supplierId && !await prisma.supplier.findFirst({where:{id:supplierId,companyId}})) throw new AppError('Supplier not found for this company',404);
}
export function collection(model, schema) {
  const GET = withAuth(async (_req, user) => json(await prisma[model].findMany({where:{companyId:user.companyId},orderBy:{id:'desc'},take:300})));
  const POST = withAuth(async (req, user) => {
    const data = await readBody(req, schema);
    if (model === 'stockItem') await checkSupplier(user.companyId,data.supplierId);
    const record = await prisma[model].create({data:{...data,companyId:user.companyId}});
    return json(record,201);
  },['Admin','Staff']);
  return { GET, POST };
}
export function item(model,schema) {
  const PATCH = withAuth(async (req,user,ctx) => {
    const {id} = await ctx.params;
    const existing = await prisma[model].findFirst({where:{id,companyId:user.companyId}});
    if (!existing) throw new AppError('Record not found',404);
    const data = await readBody(req,schema.partial().refine(d=>Object.keys(d).length>0,'At least one field required'));
    if (model === 'stockItem') await checkSupplier(user.companyId,data.supplierId);
    return json(await prisma[model].update({where:{id},data}));
  },['Admin','Staff']);
  const DELETE = withAuth(async (_req,user,ctx) => {
    const {id} = await ctx.params;
    const deleted = await prisma[model].deleteMany({where:{id,companyId:user.companyId}});
    if (!deleted.count) throw new AppError('Record not found',404);
    return json({success:true});
  },['Admin']);
  return {PATCH,DELETE};
}
