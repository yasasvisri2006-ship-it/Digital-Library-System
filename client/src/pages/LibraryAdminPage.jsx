import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookPlus, BookUp2, ChartNoAxesColumn, ClipboardList, FolderCog, Pencil, Plus, RotateCcw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import api from '../services/api';

const blankBook = { title: '', author: '', isbn: '', department: '', publisher: '', publishedYear: '', description: '', coverUrl: '', totalCopies: 1, categoryIds: [] };
const today = new Date().toISOString().slice(0, 10);
const dueDefault = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
const apiMessage = (error) => error.response?.data?.message || 'The library request could not be completed.';
const shortDate = (value) => value ? new Date(value).toLocaleDateString() : '—';

function Panel({ icon: Icon, eyebrow, title, action, children }) {
  return <section className="learning-panel library-admin-panel"><div className="learning-panel-heading"><div><span className="section-eyebrow">{eyebrow}</span><h2><Icon size={17} /> {title}</h2></div>{action}</div>{children}</section>;
}

export default function LibraryAdminPage() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [students, setStudents] = useState([]);
  const [issues, setIssues] = useState([]);
  const [report, setReport] = useState(null);
  const [bookDraft, setBookDraft] = useState(blankBook);
  const [editingBook, setEditingBook] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [issueDraft, setIssueDraft] = useState({ userId: '', bookId: '', issuedAt: today, dueAt: dueDefault });
  const [returningIssue, setReturningIssue] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [issueFilter, setIssueFilter] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const [bookResponse, categoryResponse, studentResponse, issueResponse, reportResponse] = await Promise.all([
        api.get('/library/books', { params: { includeInactive: 'true', pageSize: 50 }, signal }),
        api.get('/library/categories', { signal }),
        api.get('/library/admin/students', { params: { search: studentSearch || undefined, pageSize: 50 }, signal }),
        api.get('/library/admin/issues', { params: { status: issueFilter || undefined, pageSize: 50 }, signal }),
        api.get('/library/admin/reports', { signal }),
      ]);
      setBooks(bookResponse.data.data.books);
      setCategories(categoryResponse.data.data.categories);
      setStudents(studentResponse.data.data.students);
      setIssues(issueResponse.data.data.issues);
      setReport(reportResponse.data.data.report);
      setIssueDraft((current) => ({
        ...current,
        userId: students.length && students.some((student) => student.id === current.userId) ? current.userId : studentResponse.data.data.students[0]?.id || '',
        bookId: books.length && books.some((book) => book.id === current.bookId && book.isActive && book.availableCopies > 0) ? current.bookId : bookResponse.data.data.books.find((book) => book.isActive && book.availableCopies > 0)?.id || '',
      }));
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') setError(apiMessage(requestError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [studentSearch, issueFilter]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filteredBooks = useMemo(() => books.filter((book) => `${book.title} ${book.author} ${book.isbn || ''}`.toLowerCase().includes(bookSearch.toLowerCase())), [books, bookSearch]);

  async function refresh(messageText) {
    setMessage(messageText);
    await load();
  }

  function editBook(book) {
    setEditingBook(book);
    setBookDraft({ ...blankBook, ...book, isbn: book.isbn || '', department: book.department || '', publisher: book.publisher || '', publishedYear: book.publishedYear || '', description: book.description || '', coverUrl: book.coverUrl || '', categoryIds: book.categories.map((category) => category.id) });
  }

  async function saveBook(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...bookDraft, totalCopies: Number(bookDraft.totalCopies), publishedYear: bookDraft.publishedYear ? Number(bookDraft.publishedYear) : null };
      if (editingBook) await api.patch(`/library/admin/books/${editingBook.id}`, payload);
      else await api.post('/library/admin/books', payload);
      setBookDraft(blankBook);
      setEditingBook(null);
      await refresh(editingBook ? 'Book details updated.' : 'Book added to the catalog.');
    } catch (requestError) { setError(apiMessage(requestError)); }
    finally { setSaving(false); }
  }

  async function toggleBook(book) {
    setError('');
    try {
      await api.patch(`/library/admin/books/${book.id}/active`, { isActive: !book.isActive });
      await refresh(book.isActive ? 'Book deactivated; existing issues can still be returned.' : 'Book activated.');
    } catch (requestError) { setError(apiMessage(requestError)); }
  }

  async function removeBook(book) {
    if (!window.confirm(`Delete "${book.title}"? Books with borrowing history must be deactivated instead.`)) return;
    setError('');
    try {
      await api.delete(`/library/admin/books/${book.id}`);
      await refresh('Book deleted.');
    } catch (requestError) { setError(apiMessage(requestError)); }
  }

  async function saveCategory(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { name: categoryDraft.name, description: categoryDraft.description || null };
      if (editingCategory) await api.patch(`/library/admin/categories/${editingCategory.id}`, payload);
      else await api.post('/library/admin/categories', payload);
      setCategoryDraft({ name: '', description: '' });
      setEditingCategory(null);
      await refresh(editingCategory ? 'Category updated.' : 'Category created.');
    } catch (requestError) { setError(apiMessage(requestError)); }
    finally { setSaving(false); }
  }

  function editCategory(category) {
    setEditingCategory(category);
    setCategoryDraft({ name: category.name, description: category.description || '' });
  }

  async function removeCategory(category) {
    if (!window.confirm(`Delete category "${category.name}"? Books will remain in the catalog without this category.`)) return;
    setError('');
    try {
      await api.delete(`/library/admin/categories/${category.id}`);
      await refresh('Category deleted.');
    } catch (requestError) { setError(apiMessage(requestError)); }
  }

  async function issueBook(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/library/admin/issues', {
        ...issueDraft,
        issuedAt: new Date(`${issueDraft.issuedAt}T00:00:00.000Z`).toISOString(),
        dueAt: new Date(`${issueDraft.dueAt}T23:59:59.000Z`).toISOString(),
      });
      await refresh('Book issued and inventory updated.');
    } catch (requestError) { setError(apiMessage(requestError)); }
    finally { setSaving(false); }
  }

  async function returnBook(issue) {
    setReturningIssue(issue.id);
    setError('');
    try {
      await api.post(`/library/admin/issues/${issue.id}/return`, {});
      await refresh('Return recorded and available-copy count restored.');
    } catch (requestError) { setError(apiMessage(requestError)); }
    finally { setReturningIssue(''); }
  }

  return (
    <section className="library-page library-admin-page">
      <header className="learning-page-heading"><span className="learning-title-icon"><ShieldCheck size={21} /></span><div><span className="section-eyebrow">ADMINISTRATOR WORKSPACE</span><h1>Library Management</h1><p>Manage catalog records, borrowing, returns, and inventory reports.</p></div></header>
      <div className="learning-disclaimer"><ShieldCheck size={17} /><p>Only administrator accounts can access these management actions. Inventory changes are handled transactionally and the database is the source of truth.</p></div>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}{message && <p className="academic-message" role="status">{message}</p>}

      <Panel icon={ChartNoAxesColumn} eyebrow="LIVE DATABASE TOTALS" title="Library report">
        {loading && !report ? <div className="academic-loading">Loading report...</div> : report && <div className="library-report-grid">
          {[['Catalog titles', report.bookCount], ['Active titles', report.activeBookCount], ['Total copies', report.totalCopies], ['Available copies', report.availableCopies], ['Active issues', report.activeIssues], ['Overdue issues', report.overdueIssues], ['Student accounts', report.studentCount], ['Categories', report.categoryCount]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
        </div>}
        {report?.recentIssues?.length > 0 && <div className="library-recent-issues"><h3>Recent activity</h3>{report.recentIssues.map((issue) => <p key={issue.id}>{issue.user.name} · {issue.book.title} · {issue.status.toLowerCase()} · {shortDate(issue.issuedAt)}</p>)}</div>}
      </Panel>

      <div className="library-admin-grid">
        <Panel icon={BookPlus} eyebrow="CATALOG MANAGEMENT" title={editingBook ? 'Edit book' : 'Add a book'}>
          <form className="library-admin-form" onSubmit={saveBook}>
            <label>Title<input required maxLength="240" value={bookDraft.title} onChange={(event) => setBookDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            <div className="library-admin-form-grid"><label>Author<input required maxLength="180" value={bookDraft.author} onChange={(event) => setBookDraft((current) => ({ ...current, author: event.target.value }))} /></label><label>ISBN<input maxLength="32" value={bookDraft.isbn} onChange={(event) => setBookDraft((current) => ({ ...current, isbn: event.target.value }))} /></label><label>Department<input maxLength="120" value={bookDraft.department} onChange={(event) => setBookDraft((current) => ({ ...current, department: event.target.value }))} /></label><label>Publisher<input maxLength="180" value={bookDraft.publisher} onChange={(event) => setBookDraft((current) => ({ ...current, publisher: event.target.value }))} /></label><label>Published year<input type="number" min="1000" max="2200" value={bookDraft.publishedYear} onChange={(event) => setBookDraft((current) => ({ ...current, publishedYear: event.target.value }))} /></label><label>Total copies<input required type="number" min="0" max="100000" value={bookDraft.totalCopies} onChange={(event) => setBookDraft((current) => ({ ...current, totalCopies: event.target.value }))} /></label></div>
            <label>Cover image URL<input type="url" value={bookDraft.coverUrl} onChange={(event) => setBookDraft((current) => ({ ...current, coverUrl: event.target.value }))} placeholder="https://" /></label>
            <label>Description<textarea rows="3" maxLength="4000" value={bookDraft.description} onChange={(event) => setBookDraft((current) => ({ ...current, description: event.target.value }))} /></label>
            <fieldset className="library-category-picker"><legend>Categories</legend>{categories.length ? categories.map((category) => <label className="portfolio-checkbox" key={category.id}><input type="checkbox" checked={bookDraft.categoryIds.includes(category.id)} onChange={(event) => setBookDraft((current) => ({ ...current, categoryIds: event.target.checked ? [...current.categoryIds, category.id] : current.categoryIds.filter((id) => id !== category.id) }))} />{category.name}</label>) : <small>Create categories below, then assign them here.</small>}</fieldset>
            <div className="library-admin-form-actions"><button className="learning-button" type="submit" disabled={saving}><BookPlus size={14} />{saving ? 'Saving...' : editingBook ? 'Save changes' : 'Add book'}</button>{editingBook && <button className="learning-button is-secondary" type="button" onClick={() => { setEditingBook(null); setBookDraft(blankBook); }}>Cancel edit</button>}</div>
          </form>
        </Panel>

        <Panel icon={BookUp2} eyebrow="CHECKOUT DESK" title="Issue a book">
          <form className="library-admin-form" onSubmit={issueBook}>
            <label>Student account<select required value={issueDraft.userId} onChange={(event) => setIssueDraft((current) => ({ ...current, userId: event.target.value }))}><option value="">Select a student</option>{students.map((student) => <option value={student.id} key={student.id}>{student.name}{student.studentProfile?.studentId ? ` · ${student.studentProfile.studentId}` : ''}</option>)}</select></label>
            <label>Available book<select required value={issueDraft.bookId} onChange={(event) => setIssueDraft((current) => ({ ...current, bookId: event.target.value }))}><option value="">Select a book</option>{books.filter((book) => book.isActive && book.availableCopies > 0).map((book) => <option value={book.id} key={book.id}>{book.title} · {book.availableCopies} available</option>)}</select></label>
            <div className="library-admin-form-grid"><label>Issue date<input required type="date" value={issueDraft.issuedAt} onChange={(event) => setIssueDraft((current) => ({ ...current, issuedAt: event.target.value }))} /></label><label>Due date<input required type="date" min={issueDraft.issuedAt} value={issueDraft.dueAt} onChange={(event) => setIssueDraft((current) => ({ ...current, dueAt: event.target.value }))} /></label></div>
            <button className="learning-button" type="submit" disabled={saving || !students.length || !books.some((book) => book.id === issueDraft.bookId && book.availableCopies > 0)}><BookUp2 size={14} />{saving ? 'Processing...' : 'Issue book'}</button>
            {!students.length && <p className="learning-muted">No student accounts match the current search. Clear the student filter to select a borrower.</p>}
          </form>
          <label className="library-student-search"><Search size={15} /><input aria-label="Search students" placeholder="Search student accounts..." value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} /></label>
        </Panel>
      </div>

      <Panel icon={FolderCog} eyebrow="CATEGORY MANAGEMENT" title="Categories" action={<span className="library-count-pill">{categories.length}</span>}>
        <form className="library-category-form" onSubmit={saveCategory}><label>Category name<input required maxLength="100" value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))} /></label><label>Description<input maxLength="1000" value={categoryDraft.description} onChange={(event) => setCategoryDraft((current) => ({ ...current, description: event.target.value }))} /></label><button className="learning-button" disabled={saving}>{editingCategory ? <Pencil size={14} /> : <Plus size={14} />}{saving ? 'Saving...' : editingCategory ? 'Save category' : 'Add category'}</button>{editingCategory && <button className="learning-button is-secondary" type="button" onClick={() => { setEditingCategory(null); setCategoryDraft({ name: '', description: '' }); }}>Cancel edit</button>}</form>
        {categories.length === 0 ? <p className="learning-muted">No categories created yet.</p> : <div className="library-category-list">{categories.map((category) => <article key={category.id}><div><strong>{category.name}</strong><span>{category._count.books} books</span>{category.description && <small>{category.description}</small>}</div><div className="library-record-actions"><button className="portfolio-icon-action" type="button" aria-label={`Edit ${category.name}`} onClick={() => editCategory(category)}><Pencil size={14} /></button><button className="portfolio-icon-action" type="button" aria-label={`Delete ${category.name}`} onClick={() => removeCategory(category)}><Trash2 size={14} /></button></div></article>)}</div>}
      </Panel>

      <Panel icon={ClipboardList} eyebrow="ISSUE REGISTER" title="Issues and returns" action={<select aria-label="Filter issues by status" value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}><option value="ACTIVE">Active issues</option><option value="RETURNED">Returned</option><option value="">All issues</option></select>}>
        {loading ? <div className="academic-loading">Loading issue register...</div> : issues.length === 0 ? <p className="learning-muted">No issues match this filter.</p> : <div className="library-admin-issues">{issues.map((issue) => <article key={issue.id}>
          <div><span className={`library-issue-status ${issue.status.toLowerCase()}`}>{issue.status.toLowerCase()}</span>{issue.isOverdue && <span className="library-overdue is-active"><AlertTriangle size={12} /> {issue.overdueDays} overdue days</span>}<h3>{issue.book.title}</h3><p>{issue.user.name}{issue.user.studentProfile?.studentId ? ` · ${issue.user.studentProfile.studentId}` : ''}</p><small>Issued {shortDate(issue.issuedAt)} · Due {shortDate(issue.dueAt)}{issue.returnRecord ? ` · Returned ${shortDate(issue.returnRecord.returnedAt)}` : ''}</small></div>
          {issue.status === 'ACTIVE' && <button className="learning-button is-secondary" type="button" disabled={returningIssue === issue.id} onClick={() => returnBook(issue)}><RotateCcw size={14} />{returningIssue === issue.id ? 'Returning...' : 'Record return'}</button>}
        </article>)}</div>}
      </Panel>

      <Panel icon={Search} eyebrow="CATALOG INVENTORY" title="Books" action={<span className="library-count-pill">{books.length}</span>}>
        <label className="library-student-search"><Search size={15} /><input aria-label="Search catalog inventory" placeholder="Filter catalog inventory..." value={bookSearch} onChange={(event) => setBookSearch(event.target.value)} /></label>
        {filteredBooks.length === 0 ? <p className="learning-muted">No catalog records found.</p> : <div className="library-admin-book-list">{filteredBooks.map((book) => <article key={book.id}>
          <div><span className={`library-issue-status ${book.isActive ? 'active' : 'inactive'}`}>{book.isActive ? 'active' : 'inactive'}</span><h3>{book.title}</h3><p>{book.author} · {book.availableCopies}/{book.totalCopies} available</p><small>{book.department || 'Department not set'} · {book.categories.map((category) => category.name).join(', ') || 'Uncategorized'}</small></div>
          <div className="library-record-actions"><button className="learning-button is-secondary" type="button" onClick={() => editBook(book)}>Edit</button><button className="learning-button is-secondary" type="button" onClick={() => toggleBook(book)}>{book.isActive ? 'Deactivate' : 'Activate'}</button><button className="portfolio-icon-action" type="button" aria-label={`Delete ${book.title}`} onClick={() => removeBook(book)}><Trash2 size={14} /></button></div>
        </article>)}</div>}
      </Panel>
    </section>
  );
}
