// Saves a record of successful user actions in Neon.
import { prisma } from './db';

const allowedTabs = new Set([
  'orders', 'quotes', 'suppliers', 'customers', 'stock', 'invoices',
  'payments', 'reminders', 'reports', 'audit', 'ledger'
]);

const names = {
  records: 'Business records', quotations: 'Quotations', quotes: 'Quotes',
  orders: 'Orders', invoices: 'Customer invoices', ledger: 'Supplier invoices',
  suppliers: 'Suppliers', customers: 'Customers', stock: 'Stock',
  reminders: 'Reminders', users: 'User management',
  auth: 'Sign in / out', reports: 'Reports'
};

// Record names are useful, but private fields and values stay out of the audit trail.
const hiddenField = /password|secret|token|cookie|hash|bank|email|phone|session|credential/i;
function submittedFields(body) {
  const record = body && typeof body === 'object' ? (body.record || body) : null;
  if (!record || typeof record !== 'object' || Array.isArray(record)) return [];
  return Object.keys(record).filter(key => !hiddenField.test(key)).slice(0, 24);
}

function recordLabel(body) {
  const record = body?.record || body || {};
  const text = record.billNumber || record.invoiceNumber || record.reference ||
    record.sku || '';
  return String(text).slice(0, 75).replace(/[\r\n]/g, ' ');
}

// An audit failure must never roll back a successfully saved transaction.
export async function safeAudit({ user, action, module, summary, entityId = null, details = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action,
        module,
        summary: String(summary).slice(0, 350),
        entityId: entityId ? String(entityId).slice(0, 100) : null,
        details
      }
    });
  } catch (error) {
    console.error('Audit log could not be saved:', error);
  }
}

export const isAuditTab = tab => allowedTabs.has(tab);

// Read the request before the main route consumes its JSON body.
export async function readAuditBody(request) {
  if (['GET', 'HEAD'].includes(request.method)) return null;
  const size = Number(request.headers.get('content-length') || 0);
  if (size > 65536) return null;
  try { return await request.clone().json(); }
  catch { return null; }
}

// Log only after an API action returns a successful response.
export async function logSavedChange(request, user, response, body) {
  if (!response?.ok || ['GET', 'HEAD'].includes(request.method)) return;
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/api/') || path.startsWith('/api/audit/')) return;

  const pieces = path.split('/').filter(Boolean);
  const category = pieces[1] || 'other';
  // A record request may refer to a customer, supplier, stock item or quote.
  const recordCategory = body?.record?.category;
  const module = category === 'records' && names[recordCategory]
    ? names[recordCategory] : names[category] || 'SuppIT';
  const method = request.method.toUpperCase();
  const action = path.endsWith('/payments') ? 'PAYMENT'
    : path.includes('/password') ? 'PASSWORD RESET'
    : path.includes('/logout') ? 'LOGOUT'
    : path.includes('/accept') || path.includes('/convert') ? 'CONVERT'
    : method === 'DELETE' ? 'DELETE'
    : method === 'POST' ? 'CREATE' : 'UPDATE';

  const fields = submittedFields(body);
  const label = recordLabel(body);
  const amount = Number(body?.amountPaid);
  const paymentText = Number.isFinite(amount) && amount > 0
    ? `Recorded R${amount.toFixed(2)} payment` : 'Recorded a payment';
  const summary = action === 'PAYMENT' ? paymentText
    : action === 'LOGOUT' ? 'Signed out'
    : action === 'PASSWORD RESET' ? 'Reset a user password'
    : action === 'CONVERT' ? 'Converted or accepted a quotation'
    : `${action === 'CREATE' ? 'Created' : action === 'DELETE' ? 'Deleted' : 'Updated'} ${module.toLowerCase()}${label ? `: ${label}` : ''}`;

  let id = pieces.length > 3 && pieces[2] !== 'supplier-bills' ? pieces[3]
    : pieces[2] === 'supplier-bills' ? pieces[3] : null;
  if (!id) {
    try {
      const result = await response.clone().json();
      id = result?.record?.id || result?.bill?.id || result?.payment?.id ||
        result?.order?.id || result?.id || null;
    } catch { /* Some successful endpoints do not return JSON. */ }
  }

  await safeAudit({ user, action, module, summary, entityId: id,
    details: { method, fields, record: label || null } });
}

// Compatibility with the earlier audit update.
export const isAllowedTab = isAuditTab;
export const auditBody = readAuditBody;
export const logRequest = logSavedChange;
export const addAudit = safeAudit;
