import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ExternalLink, Wrench } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toolByKey } from '../data/learningTools';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function responseMessage(error) {
  return error.response?.data?.message || 'The request could not be completed. Please try again.';
}

export default function ToolDetailPage() {
  const { user } = useAuth();
  const { toolKey } = useParams();
  const tool = toolByKey[toolKey];
  const [progress, setProgress] = useState({ notes: '', isCompleted: false, percentComplete: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!tool) return undefined;
    if (!user) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    api.get(`/learning/tools/${tool.key}`, { signal: controller.signal })
      .then(({ data }) => setProgress(data.data.progress))
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') setError(responseMessage(requestError));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tool, user]);

  if (!tool) return <section className="learning-page"><Link className="back-link" to="/tools"><ArrowLeft size={15} /> Back to tools</Link><h1>Tool not found</h1><p>Choose a tool from the Data Science Tools page.</p></section>;

  async function save() {
    setSaving(true);
    setError('');
    try {
      const { notes, isCompleted, percentComplete } = progress;
      const { data } = await api.put(`/learning/tools/${tool.key}`, { notes, isCompleted, percentComplete });
      setProgress(data.data.progress);
      setMessage('Your tool notes and progress were saved.');
    } catch (requestError) {
      setError(responseMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="learning-page tool-detail-page">
      <Link to="/tools" className="back-link"><ArrowLeft size={15} /> Back to Data Science Tools</Link>
      <header className="learning-page-heading tool-detail-heading">
        <span className="learning-title-icon"><Wrench size={21} /></span>
        <div><span className="section-eyebrow">{tool.category}</span><h1>{tool.title}</h1><p>{tool.purpose}</p></div>
        {user && <span className={`tool-status-pill${progress.isCompleted ? ' is-done' : ''}`}>{progress.isCompleted ? <><Check size={14} /> Completed</> : `${progress.percentComplete || 0}% explored`}</span>}
      </header>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {message && <p className="academic-message" role="status">{message}</p>}
      {loading ? <div className="academic-loading">Loading your saved progress...</div> : (
        <div className="tool-detail-grid">
          <div className="tool-detail-main">
            <article className="learning-panel tool-purpose-panel"><span className="section-eyebrow">PURPOSE</span><h2>What it helps you do</h2><p>{tool.purpose}</p></article>
            <article className="learning-panel"><div className="learning-panel-heading"><div><span className="section-eyebrow">GETTING STARTED</span><h2>Installation guidance</h2></div><Wrench size={17} /></div><p className="tool-install-copy">{tool.install}</p><a className="learning-doc-link" href={tool.installUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Official setup instructions <ArrowUpRight size={14} /></a></article>
            <article className="learning-panel"><div className="learning-panel-heading"><div><span className="section-eyebrow">LEARN FROM THE SOURCE</span><h2>Official documentation</h2></div><BookOpen size={17} /></div><a className="learning-doc-link" href={tool.docs.url} target="_blank" rel="noreferrer">{tool.docs.label}<ArrowUpRight size={15} /></a></article>
            <article className="learning-panel"><div className="learning-panel-heading"><div><span className="section-eyebrow">TRY IT YOURSELF</span><h2>Practice exercises</h2></div><Check size={17} /></div><ol className="tool-exercise-list">{tool.exercises.map((exercise) => <li key={exercise}>{exercise}</li>)}</ol><p className="learning-muted">Exercises are prompts only; no code is executed in this portal.</p></article>
          </div>
          {user && <aside className="learning-panel tool-progress-panel">
            <div className="learning-panel-heading"><div><span className="section-eyebrow">YOUR PRIVATE RECORD</span><h2>Progress & notes</h2></div><BookOpen size={17} /></div>
            <label className="learning-label">Learning progress <strong>{progress.percentComplete}%</strong><input type="range" min="0" max="100" step="5" value={progress.percentComplete} onChange={(event) => setProgress((current) => ({ ...current, percentComplete: Number(event.target.value), isCompleted: Number(event.target.value) === 100 }))} /></label>
            <label className="learning-check"><input type="checkbox" checked={progress.isCompleted} onChange={(event) => setProgress((current) => ({ ...current, isCompleted: event.target.checked, percentComplete: event.target.checked ? 100 : Math.min(current.percentComplete, 95) }))} /> Mark this tool as completed</label>
            <label className="learning-label">Personal notes<textarea rows="8" maxLength="8000" value={progress.notes} onChange={(event) => setProgress((current) => ({ ...current, notes: event.target.value }))} placeholder="Keep your own notes, commands, or questions here." /></label>
            <button className="learning-button" type="button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save progress & notes'}</button>
          </aside>}
        </div>
      )}
    </section>
  );
}
