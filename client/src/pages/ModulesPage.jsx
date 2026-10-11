import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { moduleItems } from '../data/navigation';
import { getEducationalMaterials } from '../services/educationalMaterials';
import { EducationalMaterialGrid } from '../components/EducationalMaterials';

export default function ModulesPage() {
  const [modules, setModules] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    getEducationalMaterials('modules', controller.signal)
      .then(setModules)
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') setError(requestError.response?.data?.message || 'Modules could not be loaded.');
      });
    return () => controller.abort();
  }, []);

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
      <section className="learning-page education-modules">
        <header className="learning-page-heading">
          <span className="learning-title-icon"><Layers3 size={20} /></span>
          <div><span className="section-eyebrow">54 STRUCTURED UNITS</span><h2>Subject modules and chapter notes</h2><p>Module outlines, worked examples, and self-check questions across the suggested study sequence.</p></div>
        </header>
        {error && <p className="academic-message is-error" role="alert">{error}</p>}
        <EducationalMaterialGrid materials={modules} />
      </section>
    </section>
  );
}
