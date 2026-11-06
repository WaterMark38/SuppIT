// Records payments made to a supplier.
import { z } from 'zod';
import { prisma, Prisma } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { json, readBody, AppError } from '@/lib/http';

const schema = z.object({
  amountPaid: z.number().finite().positive().max(999999999.99),
  paymentMethod: z.enum(['EFT', 'Cash', 'Card', 'Other'])
}).strict();

export const POST = withAuth(async (request, user, context) => {
  const { id } = await context.params;
  const data = await readBody(request, schema);
  const amount = new Prisma.Decimal(String(data.amountPaid)).toDecimalPlaces(2);
  if (amount.lte(0)) throw new AppError('Amount must be at least R0.01', 400);

  const payment = await prisma.$transaction(async tx => {
    const bill = await tx.supplierBill.findFirst({
      where: { id, companyId: user.companyId }, include: { payments: true }
    });
    if (!bill) throw new AppError('Supplier bill not found', 404);
    const paid = bill.payments.reduce((sum, p) => sum.add(p.amountPaid), new Prisma.Decimal(0));
    if (amount.gt(bill.amountDue.sub(paid))) {
      throw new AppError('Payment exceeds outstanding amount', 409);
    }
    return tx.supplierPayment.create({ data: {
      companyId: user.companyId, billId: bill.id,
      amountPaid: amount, paymentMethod: data.paymentMethod
    } });
  }, { isolationLevel: 'Serializable' });

  return json({ payment }, 201);
}, ['Admin', 'Staff']);
