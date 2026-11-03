"use client";
// Frontend screens.
import { useEffect, useState } from "react";

// Calls the backend and returns its result.
async function call(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed: ${response.status}`);
  return body;
}

// Formats amounts in rand.
const zar = (value) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value || 0));

// Formats the dates for display.
const when = (value) => value ? new Date(value).toLocaleDateString("en-ZA") : "-";

// Shows reports, invoices, payments and reminders.
export default function OperationsPanel({ activeTab }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Loads data for the selected tab.
  async function load() {
    setError("");
    try {
      const path = activeTab === "reports"
        ? "/reports/overview"
        : activeTab === "reminders" ? "/reminders" : "/invoices";
      setData(await call(path));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    setData(null);
    setSelectedInvoice(null);
    load();
  }, [activeTab]);

  // Checks due dates and updates reminders in Neon.
  async function syncReminders() {
    setBusy(true);
    setError("");
    try {
      await call("/reminders/sync", { method: "POST" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Records the payment against an invoice.
  async function recordPayment(invoice) {
    if (!invoice?.id) return;
    const amount = window.prompt(`Payment amount for ${invoice.invoiceNumber || "Invoice"} (ZAR):`);
    if (amount === null) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a positive payment amount.");
      return;
    }
    const method = window.prompt("Payment method (EFT / Cash / Card):", "EFT");
    if (!method) return;
    setBusy(true);
    setError("");
    try {
      await call(`/invoices/${invoice.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amountPaid: value, paymentMethod: method }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Loads the invoice and its customer details for the preview.
  async function openInvoice(invoice) {
    if (!invoice?.id) return;
    setBusy(true);
    setError("");
    try {
      const invoices = await call("/invoices");
      const list = Array.isArray(invoices) ? invoices : Array.isArray(invoices?.data) ? invoices.data : [];
      const matchingInvoice = list.find((item) => item?.id === invoice.id);
      setSelectedInvoice(matchingInvoice || invoice);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const records = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  const reports = data && !Array.isArray(data) ? data : {};

  return (
    <section className="reminders-panel" style={{ padding: 24 }} aria-live="polite">
      {error && <p className="login-error">{error}</p>}
      {data === null && !error && <p>Loading from Neon...</p>}

      {activeTab === "reports" && data !== null && (
        <>
          <h2>Reporting and Business Overview</h2>
          <div className="stats-grid" style={{ marginTop: 24 }}>
            {[
              ["Customers", reports.customers ?? 0],
              ["Suppliers", reports.suppliers ?? 0],
              ["Stock Items", reports.stockItems ?? 0],
              ["Quotations", reports.quotations ?? 0],
              ["Orders", reports.orders ?? 0],
              ["Invoices", reports.invoices ?? 0],
              ["Total billed", zar(reports.billedTotal)],
              ["Outstanding", zar(reports.outstandingTotal)],
              ["Payments received", zar(reports.paidTotal)],
            ].map(([name, value]) => (
              <article className="stat-card" key={name}>
                <div><span>{name}</span><strong>{value}</strong></div>
              </article>
            ))}
          </div>
        </>
      )}

      {activeTab === "reminders" && data !== null && (
        <>
          <div className="panel-header" style={{ padding: "0 0 16px" }}>
            <div>
              <h2>Payment Reminders</h2>
              <p>Due soon and overdue invoices</p>
            </div>
            <button type="button" className="primary-button" onClick={syncReminders} disabled={busy}>
              {busy ? "Checking..." : "Check invoices"}
            </button>
          </div>
          <div className="reminder-list">
            {records.filter(Boolean).length > 0 ? (
              records.filter(Boolean).map((reminder, index) => {
                const invoice = reminder.invoice || {};
                // Gets the customer linked to the invoice.
                const customer = invoice.customer || reminder.customer || null;
                const customerName = customer?.name || "Customer not linked";
                const customerEmail = customer?.email || "";
                const customerPhone = customer?.phone || "";
                return (
                  <article key={reminder.id || index} className="reminder-card">
                    <div>•</div>
                    <div>
                      <h3>
                        {invoice.id ? (
                          <button
                            type="button" onClick={() => openInvoice(invoice)} disabled={busy}
                            style={{ background: "none", border: "none", padding: 0, color: "#2563eb", textDecoration: "underline", cursor: "pointer", font: "inherit", fontWeight: "bold" }}
                          >
                            {invoice.invoiceNumber || "View Invoice"}
                          </button>
                        ) : (invoice.invoiceNumber || "No invoice linked")}
                      </h3>
                      <p><strong>{customerName}</strong></p>
                      {/* Shows saved contact details for the customer. */}
                      <p>
                        <strong>Email: </strong>
                        {customerEmail ? <a href={`mailto:${customerEmail}`}>{customerEmail}</a> : "Not provided"}
                      </p>
                      <p>
                        <strong>Phone: </strong>
                        {customerPhone ? <a href={`tel:${customerPhone}`}>{customerPhone}</a> : "Not provided"}
                      </p>
                      <p>{reminder.status === "Overdue" ? "Payment overdue" : reminder.status === "DueSoon" ? "Payment due soon" : reminder.status || "Pending"}</p>
                      <p>Due {when(invoice.dueDate)}</p>
                    </div>
                    <div className="status-badge">{reminder.status || "Pending"}</div>
                  </article>
                );
              })
            ) : (
              <p>No reminders yet. Select Check invoices to classify unpaid invoices.</p>
            )}
          </div>
          <p className="page-heading__description">
            This check updates reminders in Neon. It does not automatically send email.
          </p>
        </>
      )}

      {["invoices", "payments"].includes(activeTab) && data !== null && (
        <>
          <h2>{activeTab === "payments" ? "Payment Tracking" : "Invoices"}</h2>
          <p className="page-heading__description">
            Invoices are created from accepted quotations and saved orders.
            Payments are recorded against existing invoices.
          </p>
          <div className="reminder-list" style={{ marginTop: 16 }}>
            {records.filter(Boolean).length > 0 ? (
              records.filter(Boolean).map((invoice, index) => {
                const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
                const paid = payments.reduce((sum, payment) => sum + Number(payment?.amountPaid || 0), 0);
                const total = Number(invoice.totalAmount || 0);
                const outstanding = Math.max(0, total - paid);
                const isPaid = outstanding <= 0 || invoice.paymentStatus === "Paid";
                return (
                  <article key={invoice.id || index} className="company-card" style={{ gridTemplateColumns: "1fr auto" }}>
                    <div>
                      <h3>
                        <button
                          type="button" onClick={() => openInvoice(invoice)}
                          style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", padding: 0, font: "inherit", fontWeight: "bold" }}
                        >
                          {invoice.invoiceNumber || "Invoice"}
                        </button>
                      </h3>
                      <p>{invoice.customer?.name || "Customer"}{" • "}{when(invoice.issueDate)}{" • Due "}{when(invoice.dueDate)}</p>
                      <p>
                        <strong>{zar(total)}</strong>{" total • "}{zar(paid)}{" paid • "}
                        <strong>{zar(outstanding)} outstanding</strong>
                      </p>
                      <span className="status-badge">
                        {isPaid ? "Paid" : paid > 0 ? "Partially Paid" : invoice.paymentStatus || "Unpaid"}
                      </span>
                    </div>
                    {activeTab === "payments" && !isPaid && (
                      <button className="primary-button" disabled={busy || !invoice.id} type="button" onClick={() => recordPayment(invoice)}>
                        Record payment
                      </button>
                    )}
                  </article>
                );
              })
            ) : (
              <p>No invoices yet. Accept a quotation, open Orders, then generate an invoice.</p>
            )}
          </div>
        </>
      )}

      {selectedInvoice && (
        <div
          role="dialog" aria-modal="true" aria-label="Invoice details"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            className="company-card"
            style={{ background: "#ffffff", color: "#172033", padding: 28, borderRadius: 12, width: "100%", maxWidth: 620, maxHeight: "85vh", overflowY: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <h2>{selectedInvoice.invoiceNumber || "Invoice Details"}</h2>
              <button type="button" onClick={() => setSelectedInvoice(null)} aria-label="Close invoice">Close</button>
            </div>
            <hr />
            <p><strong>Customer:</strong>{" "}{selectedInvoice.customer?.name || "Customer not linked"}</p>
            <p><strong>Issue Date:</strong>{" "}{when(selectedInvoice.issueDate)}</p>
            <p><strong>Due Date:</strong>{" "}{when(selectedInvoice.dueDate)}</p>
            <p><strong>Status:</strong>{" "}{selectedInvoice.paymentStatus || "Unpaid"}</p>
            <h3 style={{ marginTop: 20 }}>Invoice Items</h3>
            {(selectedInvoice.items || selectedInvoice.invoiceItems || []).map((item, index) => (
              <div key={item.id || index} style={{ borderBottom: "1px solid #e5e7eb", padding: "10px 0" }}>
                <p><strong>{item.description || "Item"}</strong></p>
                <p>Quantity: {item.quantity} | Unit Price: {zar(item.unitPrice)}</p>
                <p>Total: {zar(item.lineTotal)}</p>
              </div>
            ))}
            <h3 style={{ marginTop: 20 }}>Invoice Total: {zar(selectedInvoice.totalAmount)}</h3>
          </div>
        </div>
      )}
    </section>
  );
}
