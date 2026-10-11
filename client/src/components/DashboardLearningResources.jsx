import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Braces, Cloud, FlaskConical, Layers3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getEducationalMaterials } from '../services/educationalMaterials';
import { EducationalMaterialCard } from './EducationalMaterials';

const shortcuts = [
  { title: 'Subjects and chapter notes', to: '/my-subjects', Icon: Layers3 },
  { title: 'Weekly learning plans', to: '/my-learning', Icon: BookOpen },
  { title: 'Lab experiments', to: '/lab-experiments', Icon: FlaskConical },
  { title: 'Coding practice', to: '/coding-practice', Icon: Braces },
  { title: 'Cloud and AWS', to: '/cloud-aws', Icon: Cloud },
];

export default function DashboardLearningResources() {
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getEducationalMaterials('study-materials', controller.signal),
      getEducationalMaterials('subjects', controller.signal),
    ])
      .then(([studyMaterials, subjectRecords]) => {
        setMaterials(studyMaterials);
        setSubjects(subjectRecords);
      })
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') setError('Learning catalog is not available yet. Apply the education migration and seed the catalog.');
      });
    return () => controller.abort();
  }, []);

  const recentMaterials = [...materials].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3);

  return (
    <section className="ds-panel dashboard-learning-panel" aria-labelledby="dashboard-learning-heading">
      <div className="ds-section-heading">
        <span className="ds-section-icon"><Sparkles size={17} /></span>
        <div><span className="ds-eyebrow">YOUR DATA SCIENCE LEARNING HUB</span><h2 id="dashboard-learning-heading">Study shortcuts and featured resources</h2></div>
        <Link to="/study-materials" className="ds-view-all">All materials <ArrowRight size={14} /></Link>
      </div>
      <div className="dashboard-study-shortcuts">
        {shortcuts.map(({ title, to, Icon }) => <Link to={to} key={to}><Icon size={16} /><span>{title}</span><ArrowRight size={13} /></Link>)}
      </div>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {recentMaterials.length > 0 && <>
        <div className="dashboard-resource-heading"><h3>Recently added learning materials</h3><span>{materials.length} downloadable resources</span></div>
        <div className="dashboard-featured-resources">
          {recentMaterials.map((material) => <EducationalMaterialCard key={material.slug} material={material} compact />)}
        </div>
      </>}
      {subjects.length > 0 && <div className="dashboard-subject-links">
        <div className="dashboard-resource-heading"><h3>Explore by subject</h3><Link to="/my-subjects">View all {subjects.length} <ArrowRight size={13} /></Link></div>
        <div>{subjects.slice(0, 8).map((subject) => <Link to="/my-subjects" key={subject.slug}>{subject.title}<ArrowRight size={12} /></Link>)}</div>
      </div>}
    </section>
  );
}
