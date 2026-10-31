import { prisma, Prisma } from '@/lib/db';
import { AppError } from '@/lib/http';

const money = v => Number(v || 0);
const isValidDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const dateValue = d => isValidDate(d) ? new Date(`${d}T00:00:00.000Z`) : null;
const toDate = d => d ? new Date(d).toISOString().slice(0,10) : '';
const label = (prefix,id) => `${prefix}-${id.slice(0,8).toUpperCase()}`;
const line = x => ({ id:x.id,stockItemId:x.stockId,description:x.description,quantity:x.quantity,unitPrice:money(x.unitPrice) });

export function viewCustomer(x) { return {id:x.id,category:'customers',fullCompanyName:x.name,email:x.email,phone:x.phone,physicalAddress:x.address||'',bankingDetails:x.bankingDetails||'',notes:x.notes||''}; }
export function viewSupplier(x) { return {id:x.id,category:'suppliers',fullCompanyName:x.name,email:x.email||'',phone:x.phone||'',physicalAddress:x.address||'',bankingDetails:x.bankingDetails||'',notes:x.notes||''}; }
export function viewStock(x) { return {id:x.id,category:'stock',sku:x.sku||label('STK',x.id),itemName:x.name,description:x.description||'',quantity:x.quantity,unitCost:money(x.unitCost),sellPrice:money(x.unitPrice),supplier:x.supplier?.name||''}; }
export function viewQuote(x) {return {id:x.id,category:'quotes',reference:label('QUO',x.id),title:x.title||`Quotation ${label('QUO',x.id)}`,company:x.customer?.name||'',customerEmail:x.customer?.email||'',dueDate:toDate(x.dueDate),priority:x.priority||'Medium',notes:x.notes||'',taxRate:money(x.taxRate),status:x.status==='Draft'?'Pending':x.status,completed:x.status==='Accepted'||x.status==='Declined',items:x.items.map(line),convertedOrderReference:x.order?label('ORD',x.order.id):''};}
export function viewOrder(x) {return {id:x.id,category:'orders',reference:label('ORD',x.id),invoiceReference:x.invoice?.invoiceNumber||'',sourceQuoteReference:label('QUO',x.quotationId),title:x.quotation?.title||'Customer order',company:x.customer?.name||'',customerEmail:x.customer?.email||'',dueDate:toDate(x.invoice?.dueDate||x.quotation?.dueDate),priority:x.quotation?.priority||'Medium',notes:x.quotation?.notes||'',status:x.status,completed:x.status==='Fulfilled',taxRate:money(x.quotation?.taxRate??15),items:x.items.map(line)};}

export async function allUiRecords(companyId) {
 const where={companyId}; const [customers,suppliers,stock,quotations,orders]=await Promise.all([
 prisma.customer.findMany({where,take:400}),prisma.supplier.findMany({where,take:400}),prisma.stockItem.findMany({where,include:{supplier:true},take:400}),
 prisma.quotation.findMany({where,include:{customer:true,items:true,order:true},take:400}),prisma.salesOrder.findMany({where,include:{customer:true,quotation:true,items:true,invoice:true},take:400})
 ]);
 return [...customers.map(viewCustomer),...suppliers.map(viewSupplier),...stock.map(viewStock),...quotations.map(viewQuote),...orders.map(viewOrder)];
}
function required(text,field) {const value=String(text||'').trim();if(!value)throw new AppError(`${field} is required`,400);return value;}
function normalEmail(text) {const value=required(text,'Email').toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new AppError('Valid email required',400);return value;}
function percent(x) { const v=Number(x); if(!Number.isFinite(v)||v<0||v>100)throw new AppError('VAT rate must be 0–100');return new Prisma.Decimal(v.toFixed(2)); }
function positiveMoney(x,field) {const value=Number(x);if(!Number.isFinite(value)||value<0)throw new AppError(`Invalid ${field}`,400);return new Prisma.Decimal(value.toFixed(2));}
function nonnegativeInt(x,field) {const n=Number(x);if(!Number.isSafeInteger(n)||n<0)throw new AppError(`Invalid ${field}`,400);return n;}
function contactData(r) {return {name:required(r.fullCompanyName,'Company name'),email:r.category==='customers'?normalEmail(r.email):r.email?normalEmail(r.email):null,phone:r.category==='customers'?required(r.phone,'Phone'):String(r.phone||''),address:String(r.physicalAddress||''),bankingDetails:String(r.bankingDetails||''),notes:String(r.notes||'')};}
export async function createUiRecord(companyId,r) {
 if(!r||typeof r!=='object')throw new AppError('Valid record required');
 if(r.category==='customers')return prisma.customer.create({data:{companyId,...contactData(r)}});
 if(r.category==='suppliers')return prisma.supplier.create({data:{companyId,...contactData(r)}});
 if(r.category==='stock'){const supplier=r.supplier?await prisma.supplier.findFirst({where:{companyId,name:r.supplier}}):null; if(r.supplier&&!supplier)throw new AppError('Select an existing supplier',400);return prisma.stockItem.create({data:{companyId,name:required(r.itemName,'Item name'),sku:String(r.sku||'')||null,description:r.description||'',quantity:nonnegativeInt(r.quantity,'quantity'),unitPrice:positiveMoney(r.sellPrice,'selling price'),unitCost:positiveMoney(r.unitCost,'unit cost'),supplierId:supplier?.id||null}});}
 if(r.category==='quotes'){const customer=await prisma.customer.findFirst({where:{companyId,name:String(r.company||'').trim()}});if(!customer)throw new AppError('Select an existing customer first',400); const items=await makeLines(companyId,r.items);let subtotal=items.reduce((a,x)=>a.add(x.lineTotal),new Prisma.Decimal(0));const vat=percent(r.taxRate??15);let total=subtotal.mul(new Prisma.Decimal(1).add(vat.div(100))).toDecimalPlaces(2);return prisma.quotation.create({data:{companyId,customerId:customer.id,status:'Draft',title:required(r.title,'Title'),notes:String(r.notes||''),dueDate:dateValue(r.dueDate),priority:r.priority||'Medium',taxRate:vat,totalAmount:total,items:{create:items}}});}
 throw new AppError('Orders can only be created from accepted quotations',409);
}
export async function makeLines(companyId,raw) {if(!Array.isArray(raw)||raw.length<1)throw new AppError('At least one quotation line required',400);const lines=[];for(const r of raw){const quantity=nonnegativeInt(r.quantity,'quantity');if(!quantity)throw new AppError('Quantity must be positive');const unitPrice=positiveMoney(r.unitPrice,'unit price');let stockId=null;if(r.stockItemId){const stock=await prisma.stockItem.findFirst({where:{id:r.stockItemId,companyId}});if(!stock)throw new AppError('Stock item not found for company',404);stockId=stock.id;}lines.push({companyId,stockId,description:required(r.description,'Description'),quantity,unitPrice,lineTotal:unitPrice.mul(quantity)});}return lines;}
export async function updateUiRecord(companyId,id,r) {
 if(!r||typeof r!=='object')throw new AppError('Valid record required');
 const category=r.category;
 if(category==='customers'||category==='suppliers'){const model=category==='customers'?'customer':'supplier';const old=await prisma[model].findFirst({where:{id,companyId}});if(!old)throw new AppError('Record not found',404);return prisma[model].update({where:{id},data:contactData(r)});}
 if(category==='stock'){const old=await prisma.stockItem.findFirst({where:{id,companyId}});if(!old)throw new AppError('Record not found',404);const supplier=r.supplier?await prisma.supplier.findFirst({where:{companyId,name:r.supplier}}):null;if(r.supplier&&!supplier)throw new AppError('Select an existing supplier',400);return prisma.stockItem.update({where:{id},data:{name:required(r.itemName,'Item name'),sku:r.sku||null,description:r.description||'',quantity:nonnegativeInt(r.quantity,'quantity'),unitPrice:positiveMoney(r.sellPrice,'price'),unitCost:positiveMoney(r.unitCost,'cost'),supplierId:supplier?.id||null}});}
 if(category==='quotes'){const old=await prisma.quotation.findFirst({where:{id,companyId}});if(!old)throw new AppError('Quotation not found',404);if(old.status!=='Draft')throw new AppError('Only draft quotations may be edited',409);const customer=await prisma.customer.findFirst({where:{companyId,name:String(r.company||'').trim()}});if(!customer)throw new AppError('Select an existing customer',400);const items=await makeLines(companyId,r.items);const subtotal=items.reduce((a,x)=>a.add(x.lineTotal),new Prisma.Decimal(0));const vat=percent(r.taxRate??15);const totalAmount=subtotal.mul(new Prisma.Decimal(1).add(vat.div(100))).toDecimalPlaces(2);return prisma.$transaction(async tx=>{await tx.quotationItem.deleteMany({where:{companyId,quotationId:id}});return tx.quotation.update({where:{id},data:{customerId:customer.id,title:required(r.title,'Title'),notes:r.notes||'',dueDate:dateValue(r.dueDate),priority:r.priority||'Medium',taxRate:vat,totalAmount,items:{create:items}}});},{isolationLevel:'Serializable'});}
 throw new AppError('Orders cannot be edited directly; they are linked to accepted quotations',409);
}
export async function deleteUiRecord(companyId,id) {
 for(const model of ['customer','supplier','stockItem','quotation']){const old=await prisma[model].findFirst({where:{companyId,id}});if(!old)continue;if(model==='quotation'&&old.status!=='Draft')throw new AppError('Finalised quotations cannot be deleted',409);await prisma[model].delete({where:{id}});return;}
 throw new AppError('Record not found or linked to a completed transaction',404);
}
