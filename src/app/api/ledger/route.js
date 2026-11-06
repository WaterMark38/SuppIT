// Shows customer money owed and supplier money payable.
import { withAuth } from '@/lib/auth';
import { prisma, Prisma } from '@/lib/db';
import { json } from '@/lib/http';

const number = value => Number(value?.toString() || 0);

export const GET = withAuth(async (_request, user) => {
  const [invoices, bills, suppliers] = await Promise.all([
    prisma.invoice.findMany({ where: { companyId: user.companyId },
      include: { customer: { select: { name: true } }, payments: true },
      orderBy: { issueDate: 'desc' }, take: 500 }),
    prisma.supplierBill.findMany({ where: { companyId: user.companyId },
      include: { supplier: { select: { name: true } }, payments: true },
      orderBy: { billDate: 'desc' }, take: 500 }),
    prisma.supplier.findMany({ where: { companyId: user.companyId },
      select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 500 })
  ]);

  const customerRows = invoices.map(invoice => {
    const paid = invoice.payments.reduce((sum, item) => sum.add(item.amountPaid), new Prisma.Decimal(0));
    const outstanding = Prisma.Decimal.max(0, invoice.totalAmount.sub(paid));
    return {
      id: invoice.id, reference: invoice.invoiceNumber,
      name: invoice.customer.name, date: invoice.issueDate, dueDate: invoice.dueDate,
      total: number(invoice.totalAmount), paid: number(paid),
      outstanding: number(outstanding),
      status: outstanding.lte(0) ? 'Paid' : paid.gt(0) ? 'Partially paid' : 'Unpaid',
      payments: invoice.payments.map(p => ({ date: p.paymentDate, amount: number(p.amountPaid), method: p.paymentMethod }))
    };
  });
  const supplierRows = bills.map(bill => {
    const paid = bill.payments.reduce((sum, item) => sum.add(item.amountPaid), new Prisma.Decimal(0));
    const outstanding = Prisma.Decimal.max(0, bill.amountDue.sub(paid));
    return {
      id: bill.id, reference: bill.billNumber,
      name: bill.supplier.name, supplierId: bill.supplierId,
      description: bill.description, date: bill.billDate, dueDate: bill.dueDate,
      total: number(bill.amountDue), paid: number(paid),
      outstanding: number(outstanding),
      status: outstanding.lte(0) ? 'Paid' : paid.gt(0) ? 'Partially paid' : 'Unpaid',
      payments: bill.payments.map(p => ({ date: p.paymentDate, amount: number(p.amountPaid), method: p.paymentMethod }))
    };
  });
  const sum = (rows, field) => rows.reduce((value, row) => value + row[field], 0);
  return json({ customers: customerRows, suppliers: supplierRows, suppliersList: suppliers,
    totals: {
      receivable: Math.round(sum(customerRows, 'outstanding') * 100) / 100,
      payable: Math.round(sum(supplierRows, 'outstanding') * 100) / 100,
      customerPaid: Math.round(sum(customerRows, 'paid') * 100) / 100,
      supplierPaid: Math.round(sum(supplierRows, 'paid') * 100) / 100
    } });
});
