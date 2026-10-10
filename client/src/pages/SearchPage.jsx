import { ArrowUpRight, Search as SearchIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { navigationItems } from '../data/navigation';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() || '';
  const results = navigationItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="search-page">
      <span className="section-eyebrow">SEARCH YOUR PORTAL</span>
      <h1>Find your way</h1>
      {query && <p className="search-summary">Showing portal sections for <strong>“{query}”</strong></p>}
      {!query ? (
        <div className="search-empty-state"><SearchIcon size={23} /><h2>What are you looking for?</h2><p>Search for a section using the search box above.</p></div>
      ) : results.length ? (
        <div className="search-results">
          {results.map(({ label, to, icon: Icon }) => (
            <Link key={to} to={to} className="search-result">
              <span><Icon size={18} /></span><strong>{label}</strong><ArrowUpRight size={15} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="search-empty-state"><SearchIcon size={23} /><h2>No sections found</h2><p>Try a different word, or browse the links in your sidebar.</p></div>
      )}
    </section>
  );
}
