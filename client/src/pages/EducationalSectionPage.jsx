import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { moduleDetails } from '../data/navigation';
import { EducationalMaterialGrid } from '../components/EducationalMaterials';
import { getEducationalMaterials } from '../services/educationalMaterials';

const sectionByPath = {
  '/my-learning': 'my-learning',
  '/lab-experiments': 'lab-experiments',
  '/study-materials': 'study-materials',
  '/references': 'references',
  '/assignments': 'assignments',
  '/quizzes-tests': 'quizzes-tests',
  '/datasets': 'datasets',
  '/images': 'modules',
  '/settings': 'my-learning',
};

export default function EducationalSectionPage() {
  const { pathname } = useLocation();
  const [title, description, Icon] = moduleDetails[pathname] || ['Learning resources', 'Study, practise, and review.', BookOpen];
  const section = sectionByPath[pathname] || 'study-materials';
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getEducationalMaterials(section, controller.signal)
      .then(setMaterials)
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') {
          setError(requestError.response?.data?.message || 'Educational resources could not be loaded.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [section]);

  return (
    <section className="learning-page">
      <Link to="/dashboard" className="back-link"><ArrowLeft size={15} /> Back to dashboard</Link>
      <header className="learning-page-heading">
        <span className="learning-title-icon"><Icon size={21} /></span>
        <div><span className="section-eyebrow">MBU DIGITAL LIBRARY · LEARNING RESOURCES</span><h1>{title}</h1><p>{description}</p></div>
      </header>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {loading ? <div className="academic-loading">Loading educational resources...</div> : materials.length
        ? <EducationalMaterialGrid materials={materials} />
        : <div className="learning-panel"><h2>No catalog material is available yet</h2><p>The educational content catalog has not been loaded into the configured database. Ask the project maintainer to run the documented education preparation commands.</p></div>}
    </section>
  );
}
