import { motion } from 'framer-motion';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { moduleItems } from '../data/navigation';

export default function ModulesPage() {
  return (
    <section className="ds-modules-page">
      <div className="ds-modules-intro">
        <span className="ds-eyebrow">YOUR DATA SCIENCE JOURNEY</span>
        <h1>Learning Modules</h1>
        <p>Keep your own Data Science study materials together in one workspace.</p>
      </div>
      <div className="ds-module-grid">
        {moduleItems.map(({ title, subtitle, icon: Icon, tone, to }) => (
          <motion.div key={title} whileHover={{ y: -4 }} transition={{ duration: 0.17 }}>
            <Link to={to} className={`ds-module-card ${tone}`}>
              <span className="ds-module-icon"><Icon size={24} strokeWidth={1.8} /></span>
              <strong>{title}</strong>
              <span className="ds-module-subtitle">{subtitle}</span>
              <span className="ds-module-open">Open workspace <ArrowUpRight size={14} /></span>
            </Link>
          </motion.div>
        ))}
      </div>
      <div className="ds-module-note"><BookOpen size={17} /><span>Create numbered modules and upload your own study materials.</span></div>
    </section>
  );
}
