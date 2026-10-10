import { ArrowLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { moduleDetails, navigationItems } from '../data/navigation';

export default function ModulePreviewPage() {
  const { pathname } = useLocation();
  const [title, description, Icon] = moduleDetails[pathname] || moduleDetails['/digital-library'];

  return (
    <section className="module-page">
      <Link to="/dashboard" className="back-link"><ArrowLeft size={15} /> Back to dashboard</Link>
      <div className="module-heading">
        <span className="module-icon"><Icon size={22} /></span>
        <div><span className="section-eyebrow">YOUR LEARNING SPACE</span><h1>{title}</h1></div>
      </div>
      <p className="module-description">{description}</p>

      <div className="module-empty-state">
        <span className="empty-illustration"><Icon size={27} strokeWidth={1.5} /></span>
        <span className="empty-kicker">A FRESH PAGE</span>
        <h2>Your {title.toLowerCase()} space is ready.</h2>
        <p>This section is a frontend preview. There’s no connected content yet, but the space is here for what comes next.</p>
        <Link to="/dashboard" className="text-action">Find something else <ArrowUpRight size={15} /></Link>
      </div>

      <div className="module-related">
        <span>EXPLORE YOUR PORTAL</span>
        <div>{navigationItems.filter((item) => item.to !== pathname && item.to !== '/dashboard').slice(0, 4).map((item) => (
          <Link key={item.to} to={item.to}>{item.label}<ChevronRight size={14} /></Link>
        ))}</div>
      </div>
    </section>
  );
}
