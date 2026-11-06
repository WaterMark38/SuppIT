"use client";
// Shows money owed by customers and to suppliers.
import { useCallback, useEffect, useState } from 'react';

const zar = value => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(value || 0));
const date = value => value ? new Date(value).toLocaleDateString('en-ZA') : '-';
const today = () => new Date().toISOString().slice(0, 10);

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed: ${response.status}`);
  return body;
}

export default function VendorLedgerPanel() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('customers');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [bill, setBill] = useState({ supplierId: '', billNumber: '', description: '',
    amountDue: '', billDate: today(), dueDate: today() });

  const refresh = useCallback(async () => {
    try {
      setError(''); setData(await request('/ledger'));
    } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function addBill(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await request('/ledger/supplier-bills', { method: 'POST', body: JSON.stringify({
        ...bill, amountDue: Number(bill.amountDue)
      }) });
      setShowBillForm(false);
      setBill({ supplierId: '', billNumber: '', description: '', amountDue: '', billDate: today(), dueDate: today() });
      setMessage('Supplier bill saved in Neon.');
      await refresh(); setView('suppliers');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  // Records a supplier payment against an existing bill.
  async function paySupplier(row) {
    const raw = window.prompt(`Payment to ${row.name} (${row.reference}). Outstanding: ${zar(row.outstanding)}`, String(row.outstanding));
    if (raw === null) return;
    const amountPaid = Number(raw);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0 || amountPaid > row.outstanding) {
      setError('Enter an amount greater than zero and not above the outstanding balance.'); return;
    }
    const paymentMethod = window.prompt('Payment method: EFT / Cash / Card / Other', 'EFT');
    if (paymentMethod === null) return;
    const method = paymentMethod.trim();
    if (!['EFT', 'Cash', 'Card', 'Other'].includes(method)) {
      setError('Use EFT, Cash, Card or Other.'); return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      await request(`/ledger/supplier-bills/${encodeURIComponent(row.id)}/payments`, {
        method: 'POST', body: JSON.stringify({ amountPaid, paymentMethod: method })
      });
      setMessage('Supplier payment saved.'); await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  // Uses the current invoice payment endpoint for customers.
  async function payCustomer(row) {
    const raw = window.prompt(`Payment from ${row.name} (${row.reference}). Outstanding: ${zar(row.outstanding)}`, String(row.outstanding));
    if (raw === null) return;
    const amountPaid = Number(raw);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0 || amountPaid > row.outstanding) {
      setError('Enter an amount greater than zero and not above the outstanding balance.'); return;
    }
    const paymentMethod = window.prompt('Payment method: EFT / Cash / Card', 'EFT');
    if (paymentMethod === null) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await request(`/invoices/${encodeURIComponent(row.id)}/payments`, {
        method: 'POST', body: JSON.stringify({ amountPaid, paymentMethod: paymentMethod.trim() || 'EFT' })
      });
      setMessage('Customer payment saved.'); await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const rows = data?.[view] || [];
  return <section className="ledger-panel">
    <div className="ledger-head"><div>
      <h2>Customer & Supplier Ledger</h2>
      <p>Track incoming customer payments and outgoing supplier payments.</p>
    </div><button type="button" className="secondary-button" onClick={refresh}>Refresh</button></div>

    <div className="ledger-stats">
      <div><small>Customers owe us (debit)</small><strong>{zar(data?.totals?.receivable)}</strong></div>
      <div><small>We owe suppliers (credit)</small><strong>{zar(data?.totals?.payable)}</strong></div>
      <div><small>Received from customers</small><strong>{zar(data?.totals?.customerPaid)}</strong></div>
      <div><small>Paid to suppliers</small><strong>{zar(data?.totals?.supplierPaid)}</strong></div>
    </div>
    <div className="ledger-actions">
      <button type="button" className={view === 'customers' ? 'primary-button' : 'secondary-button'} onClick={() => setView('customers')}>Customer invoices</button>
      <button type="button" className={view === 'suppliers' ? 'primary-button' : 'secondary-button'} onClick={() => setView('suppliers')}>Supplier bills</button>
      {view === 'suppliers' && <button type="button" className="secondary-button" onClick={() => setShowBillForm(v => !v)}>
        {showBillForm ? 'Close form' : 'Add supplier bill'}
      </button>}
    </div>

    {showBillForm && view === 'suppliers' && <form className="ledger-form" onSubmit={addBill}>
      <h3>New supplier bill</h3>
      <label className="ledger-field">Supplier
        <select value={bill.supplierId} required onChange={e => setBill(v => ({ ...v, supplierId: e.target.value }))}>
          <option value="">Choose supplier</option>
          {(data?.suppliersList || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className="ledger-field">Bill number
        <input value={bill.billNumber} required maxLength={40} onChange={e => setBill(v => ({ ...v, billNumber: e.target.value }))} />
      </label>
      <label className="ledger-field">Description
        <input value={bill.description} maxLength={200} onChange={e => setBill(v => ({ ...v, description: e.target.value }))} />
      </label>
      <label className="ledger-field">Amount (ZAR)
        <input type="number" min="0.01" step="0.01" required value={bill.amountDue} onChange={e => setBill(v => ({ ...v, amountDue: e.target.value }))} />
      </label>
      <label className="ledger-field">Bill date
        <input type="date" value={bill.billDate} required onChange={e => setBill(v => ({ ...v, billDate: e.target.value }))} />
      </label>
      <label className="ledger-field">Due date
        <input type="date" value={bill.dueDate} required onChange={e => setBill(v => ({ ...v, dueDate: e.target.value }))} />
      </label>
      <button type="submit" className="primary-button" disabled={busy}>Save supplier bill</button>
    </form>}

    {error && <p className="login-error" role="alert">{error}</p>}
    {message && <p className="ledger-message" role="status">{message}</p>}
    {!data ? <p>Loading records from Neon...</p> : <div className="ledger-table-wrap">
      <table className="ledger-table"><thead><tr>
        <th>{view === 'customers' ? 'Customer' : 'Supplier'}</th><th>Reference</th><th>Date</th><th>Due</th>
        <th>Debit</th><th>Credit</th><th>Outstanding</th><th>Status</th><th>Payment history</th><th>Action</th>
      </tr></thead><tbody>
        {rows.map(row => <tr key={row.id}>
          <td>{row.name}</td><td>{row.reference}</td><td>{date(row.date)}</td><td>{date(row.dueDate)}</td>
          <td>{zar(view === 'customers' ? row.total : row.paid)}</td>
          <td>{zar(view === 'customers' ? row.paid : row.total)}</td>
          <td><strong>{zar(row.outstanding)}</strong></td>
          <td>{row.status}</td>
          <td>{row.payments?.length ? row.payments.map((p, index) => <div key={index}>{date(p.date)} — {zar(p.amount)} ({p.method})</div>) : 'No payments'}</td><td>
            {row.outstanding > 0 && <button type="button" className="secondary-button" disabled={busy}
              onClick={() => view === 'suppliers' ? paySupplier(row) : payCustomer(row)}>
              Record payment
            </button>}
          </td>
        </tr>)}
        {!rows.length && <tr><td colSpan={10}>No records yet. {view === 'suppliers' ? 'Add a supplier bill.' : 'Create an invoice from an order.'}</td></tr>}
      </tbody></table>
    </div>}
    <p className="ledger-note">Customer invoice = amount owed to us (debit). Supplier bill = amount we owe (credit). Payments reduce each balance.</p>
  </section>;
}
