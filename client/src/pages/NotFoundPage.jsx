import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="not-found-page">
      <span className="not-found-icon"><Compass size={26} /></span>
      <span className="section-eyebrow">A LITTLE DETOUR</span>
      <h1>We can’t find that page.</h1>
      <p>The link may have moved, or the address might be a little off.</p>
      <Link to="/dashboard" className="button-primary"><ArrowLeft size={16} /> Return to your dashboard</Link>
      <span className="not-found-code">404 · PAGE NOT FOUND</span>
    </section>
  );
}
