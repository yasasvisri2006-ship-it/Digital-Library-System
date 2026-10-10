import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, LibraryBig, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function BookDetailPage() {
  const { bookId } = useParams();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get(`/library/books/${bookId}`, { signal: controller.signal })
      .then(({ data }) => setBook(data.data.book))
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') setError(requestError.response?.data?.message || 'Book details could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [bookId]);

  if (loading) return <div className="academic-loading">Loading book details...</div>;
  if (!book) return <section className="library-page"><Link to="/digital-library" className="back-link"><ArrowLeft size={15} /> Back to books</Link><div className="portfolio-empty"><span><BookOpen size={23} /></span><h2>Book not found</h2><p>{error || 'This book is unavailable or has been removed from the catalog.'}</p></div></section>;

  return (
    <section className="library-page">
      <Link to="/digital-library" className="back-link"><ArrowLeft size={15} /> Back to books</Link>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      <article className="library-detail-card">
        <div className="library-detail-cover">{book.coverUrl ? <img src={book.coverUrl} alt={`${book.title} cover`} /> : <span><BookOpen size={48} /><small>MBU DIGITAL LIBRARY</small></span>}</div>
        <div className="library-detail-copy">
          <span className="section-eyebrow">{book.categories?.map((category) => category.name).join(' · ') || 'GENERAL COLLECTION'}</span>
          <h1>{book.title}</h1><p className="library-detail-author">by {book.author}</p>
          <div className="library-detail-availability"><span className={book.availableCopies ? 'available' : 'unavailable'}>{book.availableCopies ? `${book.availableCopies} available` : 'No copies currently available'}</span><small>{book.totalCopies} total copies</small></div>
          {book.description && <p className="library-detail-description">{book.description}</p>}
          <dl className="library-metadata">
            {[
              ['Book ID', book.id],
              ['ISBN', book.isbn],
              ['Department', book.department],
              ['Publisher', book.publisher],
              ['Published', book.publishedYear],
            ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <div className="library-detail-actions">
            {user?.role === 'admin' && <Link className="learning-button" to="/library/admin"><ShieldCheck size={15} /> Manage library</Link>}
            {user?.role === 'student' && <Link className="learning-button is-secondary" to="/library/my-borrowing"><LibraryBig size={15} /> My borrowing history</Link>}
          </div>
        </div>
      </article>
    </section>
  );
}
