"use client";
// Shows the saved user activity to Admin and Super Admin only.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadCsv, downloadPdf } from '../lib/reportExport';

const showDate = value => value ? new Date(value).toLocaleString('en-ZA') : '-';
const dayKey = value => {
  if (!value) return '';
  const day = new Date(value);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
};
const today = () => dayKey(new Date());
const daysAgo = count => {
  const value = new Date();
  value.setDate(value.getDate() - count);
  return dayKey(value);
};
const fieldsText = row => Array.isArray(row.details?.fields) ? row.details.fields.join(', ') : '';
const userName = row => row.user?.username || row.user?.fullName || 'Deleted account';


export default function AuditPanel() {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [userId, setUserId] = useState('all');
  const [moduleName, setModuleName] = useState('all');
  const [period, setPeriod] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Loads the company history from the protected API.
  const load = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/audit?page=${nextPage}`, { credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load audit history');
      setEntries(current => nextPage === 1 ? result.entries : [...current, ...result.entries]);
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Builds filter choices from the audit rows already loaded.
  const users = useMemo(() => [...new Map(entries.map(row => [row.userId || 'unknown',
    { id: row.userId || 'unknown', name: userName(row) }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name)), [entries]);
  const areas = useMemo(() => [...new Set(entries.map(row => row.module).filter(Boolean))].sort(), [entries]);
  const actions = useMemo(() => [...new Set(entries.map(row => row.action).filter(Boolean))].sort(), [entries]);
  const limits = useMemo(() => {
    if (period === 'today') return [today(), today()];
    if (period === 'seven') return [daysAgo(6), today()];
    if (period === 'thirty') return [daysAgo(29), today()];
    if (period === 'month') return [`${today().slice(0, 7)}-01`, today()];
    if (period === 'custom') return [fromDate, toDate];
    return ['', ''];
  }, [period, fromDate, toDate]);

  // Uses the same filtered rows for the table and exports.
  const visible = useMemo(() => entries.filter(row => {
    if (userId !== 'all' && (row.userId || 'unknown') !== userId) return false;
    if (moduleName !== 'all' && row.module !== moduleName) return false;
    const date = dayKey(row.createdAt);
    if (limits[0] && (!date || date < limits[0])) return false;
    if (limits[1] && (!date || date > limits[1])) return false;
    if (action !== 'all' && row.action !== action) return false;
    const fields = fieldsText(row);
    const text = [row.user?.fullName, row.user?.username, row.action,
      row.module, row.summary, row.entityId, fields].join(' ').toLowerCase();
    return text.includes(search.toLowerCase().trim());
  }), [entries, action, search, userId, moduleName, limits]);

  const reportHeaders = ['Date / time', 'Username', 'Full name', 'Action', 'Area', 'What happened', 'Record ID', 'Submitted fields'];
  const reportRows = visible.map(row => [showDate(row.createdAt), row.user?.username || '',
    row.user?.fullName || '', row.action || '', row.module || '', row.summary || '',
    row.entityId || '', fieldsText(row)]);
  const reportDate = today();
  const reportFilters = `User: ${users.find(item => item.id === userId)?.name || 'All'}; Action: ${action}; Area: ${moduleName}; Date: ${period === 'custom' ? `${fromDate || 'any'} to ${toDate || 'any'}` : period}; Search: ${search || 'none'}`;

  function exportReport(type) {
    if (loading || error || !visible.length) return;
    try {
      const name = `SuppIT-Audit-${reportDate}`;
      if (type === 'csv') downloadCsv(reportHeaders, reportRows, `${name}.csv`);
      else downloadPdf({ title: 'SuppIT Audit Trail', subtitle: 'Admin-only loaded audit history',
        headers: reportHeaders, rows: reportRows, filters: reportFilters, filename: `${name}.pdf` });
    } catch (e) { setError(`Export failed: ${e.message}`); }
  }

  return <section className="suppit-audit-panel" aria-label="Audit Trail">
    <div className="suppit-audit-heading">
      <div><h2>Audit Trail</h2>
        <p>Review who signed in, visited a page or saved changes in SuppIT.</p></div>
      <button className="secondary-button" type="button" onClick={() => load()} disabled={loading}>Refresh</button>
    </div>
    <div className="suppit-audit-filters">
      <label>Search users or changes
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, module, record or field" />
      </label>
      <label>User
        <select value={userId} onChange={e => setUserId(e.target.value)}>
          <option value="all">All users</option>
          {users.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label>Action
        <select value={action} onChange={e => setAction(e.target.value)}>
          <option value="all">All actions</option>
          {actions.map(item => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
        </select>
      </label>
      <label>Area
        <select value={moduleName} onChange={e => setModuleName(e.target.value)}>
          <option value="all">All areas</option>
          {areas.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>Date range
        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="all">All loaded dates</option>
          <option value="today">Today</option>
          <option value="seven">Last 7 days</option>
          <option value="thirty">Last 30 days</option>
          <option value="month">This month</option>
          <option value="custom">Custom range</option>
        </select>
      </label>
      {period === 'custom' && <>
        <label>From <input type="date" value={fromDate} max={toDate || undefined} onChange={e => setFromDate(e.target.value)} /></label>
        <label>To <input type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} /></label>
      </>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '14px 0' }}>
      <button className="secondary-button" type="button" onClick={() => exportReport('csv')} disabled={loading || !!error || !visible.length}>Export filtered CSV</button>
      <button className="secondary-button" type="button" onClick={() => exportReport('pdf')} disabled={loading || !!error || !visible.length}>Export filtered PDF</button>
      <span className="suppit-audit-note">{visible.length} of {entries.length} loaded entries shown</span>
    </div>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="suppit-audit-table-scroll"><table className="suppit-audit-table">
      <thead><tr><th>Date / time</th><th>User</th><th>Action</th><th>Area</th><th>What happened</th><th>Submitted fields</th></tr></thead>
      <tbody>
        {visible.map(row => <tr key={row.id}>
          <td>{showDate(row.createdAt)}</td>
          <td><strong>{row.user?.fullName || row.user?.username || 'Deleted account'}</strong>
            {row.user?.username && <small>{row.user.username}</small>}</td>
          <td><span className="suppit-audit-action">{row.action}</span></td>
          <td>{row.module}</td>
          <td>{row.summary}{row.entityId && <small>Record: {row.entityId}</small>}</td>
          <td>{row.details?.fields?.length ? row.details.fields.join(', ') : '—'}</td>
        </tr>)}
        {!visible.length && <tr><td colSpan={6}>No matching audit entries.</td></tr>}
      </tbody>
    </table></div>
    {loading && <p className="suppit-audit-note">Loading audit records...</p>}
    {!loading && hasMore && <button className="secondary-button" type="button" onClick={() => load(page + 1)}>Load older entries</button>}
    <p className="suppit-audit-note">Exports include only the entries loaded here. Select Load older entries to include more history before exporting.</p>
    <p className="suppit-audit-note">Only administrators can view this history. Updated fields are recorded without storing passwords or other private values. Direct Neon SQL changes are not tracked.</p>
  </section>;
}
