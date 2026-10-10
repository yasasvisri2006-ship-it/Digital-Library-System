import { useEffect, useState } from 'react';
import { BookOpenCheck, CalendarDays, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function date(value) { return value ? new Date(value).toLocaleDateString() : '—'; }

export default function BorrowingHistoryPage() {
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageCount: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.get('/library/my/issues', { params: { page, pageSize: 12, status: status || undefined }, signal: controller.signal })
      .then(({ data }) => {
        setIssues(data.data.issues);
        setPagination(data.data.pagination);
      })
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') setError(requestError.response?.data?.message || 'Borrowing history could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, status]);

  return (
    <section className="library-page">
      <header className="learning-page-heading"><span className="learning-title-icon"><BookOpenCheck size={21} /></span><div><span className="section-eyebrow">YOUR LIBRARY ACTIVITY</span><h1>Borrowing History</h1><p>View your active issues, due dates, and returned books.</p></div><Link to="/digital-library" className="learning-button is-secondary">Browse books</Link></header>
      <div className="library-history-toolbar"><span>{pagination.total} {pagination.total === 1 ? 'record' : 'records'}</span><select aria-label="Filter borrowing history by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All records</option><option value="ACTIVE">Active</option><option value="RETURNED">Returned</option><option value="LOST">Lost</option><option value="CANCELLED">Cancelled</option></select></div>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {loading ? <div className="academic-loading">Loading your borrowing records...</div> : issues.length === 0 ? <div className="portfolio-empty"><span><BookOpenCheck size={23} /></span><h2>No borrowing records yet.</h2><p>Books issued by the library will appear here. Use the catalog to explore available titles.</p><Link className="learning-button" to="/digital-library">Explore books</Link></div>
        : <div className="library-issue-list">{issues.map((issue) => <article className="library-issue-card" key={issue.id}>
          <span className="library-issue-icon"><BookOpenCheck size={19} /></span>
          <div className="library-issue-main"><span className={`library-issue-status ${issue.status.toLowerCase()}`}>{issue.status.toLowerCase()}</span><h2><Link to={`/digital-library/books/${issue.bookId}`}>{issue.book.title}</Link></h2><p>by {issue.book.author}</p></div>
          <div className="library-issue-dates"><span><CalendarDays size={13} /> Issued {date(issue.issuedAt)}</span><span><Clock3 size={13} /> Due {date(issue.dueAt)}</span>{issue.returnRecord && <span>Returned {date(issue.returnRecord.returnedAt)}</span>}</div>
          {issue.overdueDays > 0 && <span className={`library-overdue ${issue.isOverdue ? 'is-active' : ''}`}>{issue.overdueDays} overdue day{issue.overdueDays === 1 ? '' : 's'}</span>}
        </article>)}</div>}
      {pagination.pageCount > 1 && <nav className="library-pagination"><button className="learning-button is-secondary" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pagination.pageCount}</span><button className="learning-button is-secondary" disabled={page >= pagination.pageCount || loading} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}
    </section>
  );
}
