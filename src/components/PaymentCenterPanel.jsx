"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Reads or saves payments through the backend.
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

const money = amount => new Intl.NumberFormat("en-ZA", {
  style: "currency", currency: "ZAR"
}).format(Number(amount || 0));

// Keeps date filters independent from the user's browser locale.
const dateKey = value => value ? String(value).slice(0, 10) : "";
const readableDate = value => dateKey(value) ? new Date(`${dateKey(value)}T12:00:00`).toLocaleDateString("en-ZA") : "–";
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const subtractDays = (days) => {
  const now = new Date(`${localToday()}T12:00:00`);
  now.setDate(now.getDate() - days);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const newSupplierBill = () => ({
  supplierId: "", billNumber: "", description: "", amountDue: "",
  billDate: localToday(), dueDate: localToday()
});

// Displays customer receipts and supplier payments in one place.
export default function PaymentCenterPanel() {
  const [data, setData] = useState(null);
  const [side, setSide] = useState("customers");
  const [period, setPeriod] = useState("all");
  const [dateType, setDateType] = useState("date");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [partner, setPartner] = useState("all");
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [bill, setBill] = useState(newSupplierBill);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try { setData(await api("/ledger")); }
    catch (err) { setError(err.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = Array.isArray(data?.[side]) ? data[side] : [];
  const partnerNames = useMemo(() => [...new Set(rows.map(row => row.name).filter(Boolean))].sort(), [rows]);

  // Calculates which dates the cashier wants to see.
  const limits = useMemo(() => {
    if (period === "today") return [localToday(), localToday()];
    if (period === "seven") return [subtractDays(6), localToday()];
    if (period === "thirty") return [subtractDays(29), localToday()];
    if (period === "month") return [`${localToday().slice(0, 7)}-01`, localToday()];
    if (period === "custom") return [fromDate, toDate];
    return ["", ""];
  }, [period, fromDate, toDate]);

  const filtered = useMemo(() => rows.filter(row => {
    if (partner !== "all" && row.name !== partner) return false;
    if (status !== "all" && String(row.status || "").toLowerCase() !== status) return false;
    const selectedDate = dateType === "payment"
      ? (row.payments || []).map(item => dateKey(item.date)).filter(Boolean).sort().at(-1) || ""
      : dateKey(row[dateType]);
    if (limits[0] && (!selectedDate || selectedDate < limits[0])) return false;
    if (limits[1] && (!selectedDate || selectedDate > limits[1])) return false;
    return true;
  }), [rows, partner, status, dateType, limits]);

  const sums = useMemo(() => filtered.reduce((sum, row) => ({
    total: sum.total + Number(row.total || 0),
    paid: sum.paid + Number(row.paid || 0),
    outstanding: sum.outstanding + Number(row.outstanding || 0)
  }), { total: 0, paid: 0, outstanding: 0 }), [filtered]);

  // Saves a supplier invoice without changing existing customer invoices.
  async function saveBill(event) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await api("/ledger/supplier-bills", {
        method: "POST", body: JSON.stringify({ ...bill, amountDue: Number(bill.amountDue) })
      });
      setBill(newSupplierBill()); setShowForm(false);
      setNotice("Supplier invoice saved in Neon.");
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  // Sends a customer or supplier payment to the correct API.
  async function recordPayment(row) {
    const label = side === "customers" ? "received from" : "paid to";
    const raw = window.prompt(`Amount ${label} ${row.name} (${row.reference}). Outstanding: ${money(row.outstanding)}`, String(row.outstanding));
    if (raw === null) return;
    const amountPaid = Number(raw);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0 || amountPaid > Number(row.outstanding)) {
      setError("Enter an amount greater than zero and not above the outstanding balance.");
      return;
    }
    const methodValue = window.prompt("Payment method (EFT, Cash, Card, Other)", "EFT");
    if (methodValue === null) return;
    const paymentMethod = methodValue.trim();
    if (!["EFT", "Cash", "Card", "Other"].includes(paymentMethod)) {
      setError("Choose EFT, Cash, Card or Other."); return;
    }
    const path = side === "customers"
      ? `/invoices/${encodeURIComponent(row.id)}/payments`
      : `/ledger/supplier-bills/${encodeURIComponent(row.id)}/payments`;
    setBusy(true); setError(""); setNotice("");
    try {
      await api(path, { method: "POST", body: JSON.stringify({ amountPaid, paymentMethod }) });
      setNotice("Payment saved and outstanding balance updated.");
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function changeSide(value) {
    setSide(value); setPartner("all"); setStatus("all"); setShowForm(false);
    setNotice(""); setError("");
  }

  return (
    <section className="suppit-payments-panel" aria-label="Customer and supplier payment records">
      <div className="suppit-payments-head">
        <div>
          <h2>Payment Tracking</h2>
          <p>See customer receipts and supplier invoices, payments and balances.</p>
        </div>
        <button type="button" className="secondary-button" disabled={busy} onClick={load}>Refresh</button>
      </div>

      <div className="suppit-payments-switch" role="group" aria-label="Payment type">
        <button type="button" className={side === "customers" ? "primary-button" : "secondary-button"}
          onClick={() => changeSide("customers")}>Customer invoices</button>
        <button type="button" className={side === "suppliers" ? "primary-button" : "secondary-button"}
          onClick={() => changeSide("suppliers")}>Supplier invoices</button>
        {side === "suppliers" && <button type="button" className="secondary-button"
          onClick={() => setShowForm(value => !value)}>{showForm ? "Close form" : "Add supplier invoice"}</button>}
      </div>

      <div className="suppit-payments-filters">
        <label>Filter dates
          <select value={period} onChange={event => setPeriod(event.target.value)}>
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="seven">Last 7 days</option>
            <option value="thirty">Last 30 days</option>
            <option value="month">This month</option>
            <option value="custom">Choose date range</option>
          </select>
        </label>
        <label>Use date from
          <select value={dateType} onChange={event => setDateType(event.target.value)}>
            <option value="date">Invoice date</option>
            <option value="dueDate">Due date</option>
            <option value="payment">Latest payment date</option>
          </select>
        </label>
        <label>{side === "customers" ? "Customer" : "Supplier"}
          <select value={partner} onChange={event => setPartner(event.target.value)}>
            <option value="all">All {side}</option>
            {partnerNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>Payment status
          <select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially paid">Partially paid</option>
            <option value="paid">Paid</option>
          </select>
        </label>
        {period === "custom" && <>
          <label>From
            <input type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} />
          </label>
          <label>To
            <input type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} />
          </label>
        </>}
      </div>

      {side === "suppliers" && showForm && <form className="suppit-supplier-form" onSubmit={saveBill}>
        <h3>Add supplier invoice</h3>
        <label>Supplier
          <select required value={bill.supplierId} onChange={event => setBill({ ...bill, supplierId: event.target.value })}>
            <option value="">Choose a supplier</option>
            {(data?.suppliersList || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Supplier invoice number
          <input required maxLength={40} value={bill.billNumber}
            onChange={event => setBill({ ...bill, billNumber: event.target.value })} />
        </label>
        <label>Amount (ZAR)
          <input required type="number" min="0.01" step="0.01" value={bill.amountDue}
            onChange={event => setBill({ ...bill, amountDue: event.target.value })} />
        </label>
        <label>Invoice date
          <input required type="date" value={bill.billDate}
            onChange={event => setBill({ ...bill, billDate: event.target.value })} />
        </label>
        <label>Due date
          <input required type="date" min={bill.billDate} value={bill.dueDate}
            onChange={event => setBill({ ...bill, dueDate: event.target.value })} />
        </label>
        <label>Description
          <input maxLength={200} value={bill.description}
            onChange={event => setBill({ ...bill, description: event.target.value })} />
        </label>
        <button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving..." : "Save supplier invoice"}</button>
      </form>}

      {error && <p className="login-error" role="alert">{error}</p>}
      {notice && <p className="suppit-payments-success" role="status">{notice}</p>}
      <div className="suppit-payments-totals">
        <div><span>{side === "customers" ? "Customer invoices" : "Supplier invoices"}</span><strong>{money(sums.total)}</strong></div>
        <div><span>{side === "customers" ? "Payments received" : "Payments made"}</span><strong>{money(sums.paid)}</strong></div>
        <div><span>Outstanding</span><strong>{money(sums.outstanding)}</strong></div>
        <div><span>Records displayed</span><strong>{filtered.length} / {rows.length}</strong></div>
      </div>

      {!data && !error && <p>Loading payments from Neon...</p>}
      <div className="suppit-payments-table-scroll">
        <table className="suppit-payments-table">
          <thead><tr>
            <th>{side === "customers" ? "Customer" : "Supplier"}</th>
            <th>Invoice</th><th>Invoice date</th><th>Due date</th>
            <th>Total</th><th>Paid</th><th>Outstanding</th><th>Status</th><th>Payment history</th><th>Action</th>
          </tr></thead>
          <tbody>
            {filtered.map(row => <tr key={row.id}>
              <td><strong>{row.name}</strong></td><td>{row.reference}</td>
              <td>{readableDate(row.date)}</td><td>{readableDate(row.dueDate)}</td>
              <td>{money(row.total)}</td><td>{money(row.paid)}</td>
              <td><strong>{money(row.outstanding)}</strong></td><td>{row.status}</td>
              <td>{row.payments?.length ? row.payments.map((item, index) =>
                <div key={index}>{readableDate(item.date)} · {money(item.amount)} · {item.method}</div>
              ) : "No payments"}</td>
              <td>{Number(row.outstanding) > 0 && <button type="button" className="secondary-button"
                disabled={busy} onClick={() => recordPayment(row)}>Record payment</button>}</td>
            </tr>)}
            {!filtered.length && <tr><td colSpan={10}>No invoices match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="suppit-payments-note">Customer payments are received by the business. Supplier payments are money paid out. Recording a payment does not transfer money through a bank.</p>
    </section>
  );
}
