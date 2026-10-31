"use client";
import { useEffect,useState } from 'react';

async function call(path,options={}){const response=await fetch(`/api${path}`,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||`Request failed: ${response.status}`);return body;}
const zar=x=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(Number(x||0));
const when=x=>x?new Date(x).toLocaleDateString('en-ZA'):'-';
export default function OperationsPanel({activeTab}) {
  const [data,setData]=useState(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function load(){setError('');try{const path=activeTab==='reports'?'/reports/overview':activeTab==='reminders'?'/reminders':'/invoices';setData(await call(path));}catch(e){setError(e.message);}}
  useEffect(()=>{setData(null);load();},[activeTab]);
  async function syncReminders(){setBusy(true);try{await call('/reminders/sync',{method:'POST'});await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function recordPayment(invoice){
    const amount=window.prompt(`Payment amount for ${invoice.invoiceNumber} (ZAR):`);if(amount===null)return;
    const value=Number(amount);if(!Number.isFinite(value)||value<=0){setError('Enter a positive payment amount.');return;}
    const method=window.prompt('Payment method (EFT / Cash / Card):','EFT');if(!method)return;
    setBusy(true);try{await call(`/invoices/${invoice.id}/payments`,{method:'POST',body:JSON.stringify({amountPaid:value,paymentMethod:method})});await load();}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section className="reminders-panel" style={{padding:24}} aria-live="polite">
    {error&&<p className="login-error">{error}</p>}
    {!data&&<p>Loading from Neon...</p>}
    {activeTab==='reports'&&data&&<><h2>Reporting and Business Overview</h2><div className="stats-grid" style={{marginTop:24}}>{[['Customers',data.customers],['Suppliers',data.suppliers],['Stock Items',data.stockItems],['Quotations',data.quotations],['Orders',data.orders],['Invoices',data.invoices],['Total billed',zar(data.billedTotal)],['Outstanding',zar(data.outstandingTotal)],['Payments received',zar(data.paidTotal)]].map(([name,value])=><article className="stat-card" key={name}><div><span>{name}</span><strong>{value}</strong></div></article>)}</div></>}
    {activeTab==='reminders'&&data&&<><div className="panel-header" style={{padding:'0 0 16px'}}><div><h2>Payment reminders</h2><p>Due soon and overdue invoices</p></div><button type="button" className="primary-button" onClick={syncReminders} disabled={busy}>Check invoices</button></div><div className="reminder-list">{data.length?data.map(r=><article key={r.id} className="reminder-card"><div>•</div><div><h3>{r.invoice.invoiceNumber}</h3><p>{r.description||r.status}</p><p>Due {when(r.invoice.dueDate)}</p></div><div className="status-badge">{r.status}</div></article>):<p>No reminders yet. Select Check invoices to classify any unpaid invoices.</p>}</div><p className="page-heading__description">This check updates reminders in Neon. It does not automatically send email.</p></>}
    {['invoices','payments'].includes(activeTab)&&data&&<><h2>{activeTab==='payments'?'Payment Tracking':'Invoices'}</h2><p className="page-heading__description">Create invoices from an accepted quotation's order. Payments are recorded against saved invoices.</p><div className="reminder-list" style={{marginTop:16}}>{data.length?data.map(inv=>{const paid=(inv.payments||[]).reduce((sum,p)=>sum+Number(p.amountPaid),0);return <article key={inv.id} className="company-card" style={{gridTemplateColumns:'1fr auto'}}><div><h3>{inv.invoiceNumber}</h3><p>{inv.customer?.name||''} • {when(inv.issueDate)} • Due {when(inv.dueDate)}</p><p><strong>{zar(inv.totalAmount)}</strong> total • {zar(paid)} paid • <strong>{zar(Number(inv.totalAmount)-paid)} outstanding</strong></p><span className="status-badge">{inv.paymentStatus}</span></div>{activeTab==='payments'&&inv.paymentStatus!=='Paid'&&<button className="primary-button" disabled={busy} type="button" onClick={()=>recordPayment(inv)}>Record payment</button>}</article>;}):<p>No invoices yet. Accept a quotation, open Orders, then generate an invoice.</p>}</div></>}
  </section>;
}
