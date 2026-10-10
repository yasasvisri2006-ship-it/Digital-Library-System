import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, LibraryBig, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PAGE_SIZE = 12;
const messageFor = (error) => error.response?.data?.message || 'The library request could not be completed.';

export default function DigitalLibraryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, pageCount: 0 });
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const [bookResponse, categoryResponse, departmentResponse] = await Promise.all([
        api.get('/library/books', { params: { search: search.trim() || undefined, department: department || undefined, categoryId: categoryId || undefined, page, pageSize: PAGE_SIZE }, signal }),
        api.get('/library/categories', { signal }),
        api.get('/library/departments', { signal }),
      ]);
      setBooks(bookResponse.data.data.books);
      setPageInfo(bookResponse.data.data.pagination);
      setCategories(categoryResponse.data.data.categories);
      setDepartments(departmentResponse.data.data.departments);
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') setError(messageFor(requestError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [search, department, categoryId, page]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function resetPage(change) {
    setPage(1);
    change();
  }

  return (
    <section className="library-page">
      <header className="learning-page-heading">
        <span className="learning-title-icon"><LibraryBig size={21} /></span>
        <div><span className="section-eyebrow">MBU DIGITAL LIBRARY</span><h1>Explore Books</h1><p>Search the catalog by title, author, ISBN, or book ID.</p></div>
        {isAdmin
          ? <Link className="learning-button library-heading-action" to="/library/admin"><ShieldCheck size={15} /> Manage library</Link>
          : <Link className="learning-button is-secondary library-heading-action" to="/library/my-borrowing">My borrowing history</Link>}
      </header>

      <div className="library-search-filters">
        <label className="learning-search"><Search size={16} /><input aria-label="Search books" placeholder="Title, author, ISBN, or book ID..." value={search} onChange={(event) => resetPage(() => setSearch(event.target.value))} /></label>
        <select aria-label="Filter books by department" value={department} onChange={(event) => resetPage(() => setDepartment(event.target.value))}><option value="">All departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Filter books by category" value={categoryId} onChange={(event) => resetPage(() => setCategoryId(event.target.value))}><option value="">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>
      </div>

      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      <div className="library-results-summary"><span>{loading ? 'Loading catalog...' : `${pageInfo.total} ${pageInfo.total === 1 ? 'book' : 'books'} found`}</span><span>Page {pageInfo.page} of {Math.max(1, pageInfo.pageCount)}</span></div>
      {loading ? <div className="academic-loading">Loading the book catalog...</div>
        : books.length === 0 ? <div className="portfolio-empty"><span><BookOpen size={23} /></span><h2>No books match your search.</h2><p>Try a different title, author, identifier, department, or category. Books are added by library administrators.</p></div>
          : <div className="library-book-grid">{books.map((book) => <article className="library-book-card" key={book.id}>
            <Link className="library-book-cover" to={`/digital-library/books/${book.id}`} aria-label={`View ${book.title}`}>
              {book.coverUrl ? <img src={book.coverUrl} alt={`${book.title} cover`} loading="lazy" /> : <span><BookOpen size={31} /><small>MBU DIGITAL LIBRARY</small></span>}
              <b className={book.availableCopies > 0 ? 'available' : 'unavailable'}>{book.availableCopies > 0 ? `${book.availableCopies} available` : 'Currently unavailable'}</b>
            </Link>
            <div className="library-book-card-body">
              <span className="section-eyebrow">{book.categories?.map((category) => category.name).join(' · ') || 'GENERAL COLLECTION'}</span>
              <h2><Link to={`/digital-library/books/${book.id}`}>{book.title}</Link></h2>
              <p>by {book.author}</p>
              {book.department && <small>{book.department}</small>}
              <Link className="library-book-detail-link" to={`/digital-library/books/${book.id}`}>Book details <ArrowRight size={14} /></Link>
            </div>
          </article>)}</div>}

      {pageInfo.pageCount > 1 && <nav className="library-pagination" aria-label="Book pages">
        <button className="learning-button is-secondary" type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ArrowLeft size={14} /> Previous</button>
        <span>Page {page} of {pageInfo.pageCount}</span>
        <button className="learning-button is-secondary" type="button" disabled={page >= pageInfo.pageCount || loading} onClick={() => setPage((current) => current + 1)}>Next <ArrowRight size={14} /></button>
      </nav>}
    </section>
  );
}
