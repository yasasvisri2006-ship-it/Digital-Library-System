import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { quickAccessItems } from '../data/navigation';

export default function QuickAccessPage() {
  return (
    <section className="ds-quick-access-page">
      <Link to="/dashboard" className="back-link"><ArrowLeft size={15} /> Back to dashboard</Link>
      <div className="ds-quick-access-intro">
        <span className="ds-eyebrow">YOUR FAVORITE DESTINATIONS</span>
        <h1>Quick Access</h1>
        <p>Choose a space to continue your academic work.</p>
      </div>
      <div className="ds-quick-access-page-grid">
        {quickAccessItems.map(({ title, to, icon: Icon, tone }, index) => (
          <Link key={to + title} to={to} className={`ds-quick-access-page-item ${tone}`}>
            <span className="ds-card-number">0{index + 1}</span>
            <span className="ds-quick-icon"><Icon size={22} strokeWidth={1.8} /></span>
            <strong>{title}</strong>
            <ArrowUpRight className="ds-quick-arrow" size={15} />
          </Link>
        ))}
      </div>
    </section>
  );
}
