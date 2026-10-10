import { LockKeyhole } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function AccessRestrictedPage() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/library/admin');

  return (
    <section className="portfolio-empty access-restricted-page" role="status">
      <span><LockKeyhole size={22} /></span>
      <h1>{isAdminRoute ? 'Administrator access required' : 'Sign-in required'}</h1>
      <p>
        {isAdminRoute
          ? 'This administrator feature is protected and is not available in the public dashboard.'
          : 'This personal feature requires an authenticated student account. Private records remain protected.'}
      </p>
      <Link className="learning-button is-secondary" to="/dashboard">Return to dashboard</Link>
    </section>
  );
}
