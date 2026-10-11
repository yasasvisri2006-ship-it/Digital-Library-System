import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { EducationalMaterialGrid } from './EducationalMaterials';
import { getEducationalMaterials } from '../services/educationalMaterials';

export default function EducationalCatalogFeed({ section, title, description }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getEducationalMaterials(section, controller.signal)
      .then(setMaterials)
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') setError(requestError.response?.data?.message || 'Learning resources could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [section]);

  return (
    <section className="education-feed">
      <header className="learning-page-heading">
        <span className="learning-title-icon"><BookOpen size={19} /></span>
        <div><span className="section-eyebrow">CURATED LEARNING CONTENT</span><h2>{title}</h2><p>{description}</p></div>
      </header>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {loading ? <div className="academic-loading">Loading learning resources...</div> : materials.length
        ? <EducationalMaterialGrid materials={materials} />
        : <div className="learning-panel"><h3>No resources are available in this section yet.</h3><p>Try another learning section or check back after the catalog is populated.</p></div>}
    </section>
  );
}
