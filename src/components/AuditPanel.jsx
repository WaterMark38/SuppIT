"use client";
// Shows the saved user activity to Admin and Super Admin only.
import { useCallback, useEffect, useMemo, useState } from 'react';

const showDate = value => value ? new Date(value).toLocaleString('en-ZA') : '-';

export default function AuditPanel() {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
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

  const visible = useMemo(() => entries.filter(row => {
    if (action !== 'all' && row.action !== action) return false;
    const fields = row.details?.fields?.join(' ') || '';
    const text = [row.user?.fullName, row.user?.username, row.action,
      row.module, row.summary, row.entityId, fields].join(' ').toLowerCase();
    return text.includes(search.toLowerCase().trim());
  }), [entries, action, search]);

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
      <label>Action
        <select value={action} onChange={e => setAction(e.target.value)}>
          <option value="all">All actions</option>
          <option value="LOGIN">Login</option>
          <option value="VIEW">Page visited</option>
          <option value="CREATE">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="DELETE">Deleted</option>
          <option value="PAYMENT">Payment</option>
          <option value="CONVERT">Quote accepted</option>
          <option value="PASSWORD RESET">Password reset</option>
          <option value="LOGOUT">Logout</option>
        </select>
      </label>
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
    <p className="suppit-audit-note">Only administrators can view this history. Updated fields are recorded without storing passwords or other private values. Direct Neon SQL changes are not tracked.</p>
  </section>;
}
