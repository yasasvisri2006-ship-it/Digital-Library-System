import { motion } from 'framer-motion';
import { ArrowUpRight, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { moduleItems } from '../data/navigation';

export default function ModulesPage() {
  return (
    <section className="ds-modules-page">
      <div className="ds-modules-intro">
        <span className="ds-eyebrow">YOUR DATA SCIENCE JOURNEY</span>
        <h1>Learning Modules</h1>
        <p>Explore the subjects that turn curiosity into capability.</p>
      </div>
      <div className="ds-module-grid">
        {moduleItems.map(({ title, subtitle, icon: Icon, tone, to }, index) => (
          <motion.div key={title} whileHover={{ y: -4 }} transition={{ duration: 0.17 }}>
            <Link to={to} className={`ds-module-card ${tone}`}>
              <span className="ds-module-number">MODULE 0{index + 1}</span>
              <span className="ds-module-icon"><Icon size={22} strokeWidth={1.8} /></span>
              <strong>{title}</strong>
              <span className="ds-module-subtitle">{subtitle}</span>
              <span className="ds-module-open">Explore <ArrowUpRight size={14} /></span>
            </Link>
          </motion.div>
        ))}
      </div>
      <div className="ds-module-note"><Layers3 size={17} /><span>Choose a module to explore its related learning space.</span></div>
    </section>
  );
}
