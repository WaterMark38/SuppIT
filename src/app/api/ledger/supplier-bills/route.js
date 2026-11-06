// Creates bills from suppliers.
import { z } from 'zod';
import { prisma, Prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { AppError, json, readBody } from '@/lib/http';

const schema = z.object({
  supplierId: z.string().uuid(),
  billNumber: z.string().trim().min(1).max(40),
  description: z.string().trim().max(200).optional(),
  billDate: z.iso.date(),
  dueDate: z.iso.date(),
  amountDue: z.number().finite().positive().max(999999999.99)
}).strict();

export const POST = withAuth(async (request, user) => {
  const data = await readBody(request, schema);
  if (data.dueDate < data.billDate) throw new AppError('Due date cannot come before bill date', 400);
  const supplier = await prisma.supplier.findFirst({
    where: { id: data.supplierId, companyId: user.companyId }, select: { id: true }
  });
  if (!supplier) throw new AppError('Supplier not found', 404);
  const amount = new Prisma.Decimal(String(data.amountDue)).toDecimalPlaces(2);
  if (amount.lte(0)) throw new AppError('Amount must be at least R0.01', 400);
  const bill = await prisma.supplierBill.create({ data: {
    companyId: user.companyId, supplierId: supplier.id,
    billNumber: data.billNumber, description: data.description || null,
    billDate: new Date(`${data.billDate}T00:00:00.000Z`),
    dueDate: new Date(`${data.dueDate}T00:00:00.000Z`), amountDue: amount
  } });
  return json({ bill }, 201);
}, ['Admin', 'Staff']);
