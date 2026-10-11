import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { learningTools } from '../data/learningTools';
import api from '../services/api';
import EducationalCatalogFeed from '../components/EducationalCatalogFeed';
import { useAuth } from '../context/AuthContext';

export default function ToolsPage() {
  const { user } = useAuth();
  const [progressByKey, setProgressByKey] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    api.get('/learning/tools', { signal: controller.signal })
      .then(({ data }) => setProgressByKey(Object.fromEntries(data.data.progress.map((progress) => [progress.toolKey, progress]))))
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') setError(requestError.response?.data?.message || 'Learning progress could not be loaded.');
      });
    return () => controller.abort();
  }, [user]);

  return (
    <section className="learning-page">
      <header className="learning-page-heading">
        <span className="learning-title-icon"><Wrench size={21} /></span>
        <div><span className="section-eyebrow">YOUR DATA SCIENCE TOOLKIT</span><h1>Data Science Tools</h1><p>Explore official documentation, setup guidance, practice exercises, and your own saved notes.</p></div>
      </header>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      <div className="tool-card-grid">{learningTools.map((tool) => {
        const progress = progressByKey[tool.key];
        return (
          <Link className="tool-overview-card" to={`/tools/${tool.key}`} key={tool.key}>
            <span className="tool-card-icon"><Wrench size={19} /></span>
            <span className="section-eyebrow">{tool.category}</span>
            <h2>{tool.title}</h2>
            <p>{tool.purpose}</p>
            <div className="tool-card-progress">{progress?.isCompleted ? <><CheckCircle2 size={15} /><span>Completed</span></> : <><span>{progress?.percentComplete || 0}% explored</span><span className="tool-progress-track"><i style={{ width: `${progress?.percentComplete || 0}%` }} /></span></>}</div>
            <span className="tool-card-action">Open tool guide <ArrowUpRight size={15} /></span>
          </Link>
        );
      })}</div>
      <div className="learning-disclaimer"><Wrench size={17} /><p>These guides link to official documentation. This portal does not install, run, or connect to the listed tools.</p></div>
      <EducationalCatalogFeed section="tools" title="Practical tool examples" description="Small reproducible examples and the official documentation for each tool." />
    </section>
  );
}
