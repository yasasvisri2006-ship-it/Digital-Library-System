import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Award, BookOpen, Check, Cloud, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import EducationalCatalogFeed from '../components/EducationalCatalogFeed';
import { useAuth } from '../context/AuthContext';

const awsResources = [
  { title: 'AWS Skill Builder', description: 'Official digital training and learning plans.', url: 'https://skillbuilder.aws/' },
  { title: 'What is AWS?', description: 'Official introduction to AWS cloud concepts.', url: 'https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html' },
  { title: 'AWS Well-Architected Framework', description: 'Guidance for evaluating cloud workloads.', url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html' },
];

function responseMessage(error) {
  return error.response?.data?.message || 'The request could not be completed. Please try again.';
}

export default function CloudLearningPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState({ notes: '', percentComplete: 0, isCompleted: false });
  const [labNotes, setLabNotes] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [labDraft, setLabDraft] = useState({ title: '', notes: '' });
  const [certificateDraft, setCertificateDraft] = useState({ title: '', issuer: '', issuedAt: '', credentialUrl: '' });
  const [editingLab, setEditingLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(signal) {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/learning/cloud', { signal });
      setProgress(data.data.learning.progress);
      setLabNotes(data.data.learning.labNotes);
      setCertificates(data.data.learning.certificates);
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') setError(responseMessage(requestError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [user]);

  async function saveProgress() {
    setSaving(true);
    setError('');
    try {
      const { notes, isCompleted, percentComplete } = progress;
      const { data } = await api.patch('/learning/cloud', { notes, isCompleted, percentComplete });
      setProgress(data.data.progress);
      setMessage('AWS learning progress saved.');
    } catch (requestError) {
      setError(responseMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function saveLab(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingLab) {
        const { data } = await api.patch(`/learning/cloud/labs/${editingLab.id}`, labDraft);
        setLabNotes((current) => current.map((note) => note.id === data.data.note.id ? data.data.note : note));
        setMessage('Lab note updated.');
      } else {
        const { data } = await api.post('/learning/cloud/labs', labDraft);
        setLabNotes((current) => [data.data.note, ...current]);
        setMessage('Lab note saved.');
      }
      setLabDraft({ title: '', notes: '' });
      setEditingLab(null);
    } catch (requestError) {
      setError(responseMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleLab(note) {
    setError('');
    try {
      const { data } = await api.patch(`/learning/cloud/labs/${note.id}`, { isComplete: !note.isComplete });
      setLabNotes((current) => current.map((item) => item.id === note.id ? data.data.note : item));
    } catch (requestError) {
      setError(responseMessage(requestError));
    }
  }

  async function deleteLab(note) {
    if (!window.confirm(`Delete the lab note "${note.title}"?`)) return;
    setError('');
    try {
      await api.delete(`/learning/cloud/labs/${note.id}`);
      setLabNotes((current) => current.filter((item) => item.id !== note.id));
      setMessage('Lab note deleted.');
    } catch (requestError) {
      setError(responseMessage(requestError));
    }
  }

  async function saveCertificate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...certificateDraft,
        issuer: certificateDraft.issuer.trim() || null,
        issuedAt: certificateDraft.issuedAt ? new Date(`${certificateDraft.issuedAt}T00:00:00.000Z`).toISOString() : null,
        credentialUrl: certificateDraft.credentialUrl.trim() || null,
      };
      const { data } = await api.post('/learning/cloud/certificates', payload);
      setCertificates((current) => [data.data.certificate, ...current]);
      setCertificateDraft({ title: '', issuer: '', issuedAt: '', credentialUrl: '' });
      setMessage('AWS certificate record saved.');
    } catch (requestError) {
      setError(responseMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCertificate(certificate) {
    if (!window.confirm(`Delete the certificate record "${certificate.title}"?`)) return;
    setError('');
    try {
      await api.delete(`/learning/cloud/certificates/${certificate.id}`);
      setCertificates((current) => current.filter((item) => item.id !== certificate.id));
      setMessage('Certificate record deleted.');
    } catch (requestError) {
      setError(responseMessage(requestError));
    }
  }

  return (
    <section className="learning-page cloud-learning-page">
      <Link to="/dashboard" className="back-link"><ArrowLeft size={15} /> Back to dashboard</Link>
      <header className="learning-page-heading">
        <span className="learning-title-icon"><Cloud size={21} /></span>
        <div><span className="section-eyebrow">CLOUD COMPUTING LEARNING SPACE</span><h1>Cloud & AWS</h1><p>Organize learning links, your AWS study progress, lab notes, and certificate records.</p></div>
      </header>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {message && <p className="academic-message" role="status">{message}</p>}
      <div className="learning-disclaimer"><Cloud size={17} /><p><strong>Learning tracker only.</strong> This portal does not connect to AWS, create cloud resources, run labs, or issue/verify certificates. Use the official AWS site and record your own learning evidence here.</p></div>
      <EducationalCatalogFeed section="cloud-aws" title="AWS learning notes and safe practice" description="Official AWS service documentation, security concepts, sandbox exercises, and certification preparation." />

      {user && (loading ? <div className="academic-loading">Loading your cloud learning records...</div> : <>
        <div className="cloud-learning-grid">
          <section className="learning-panel cloud-progress-card">
            <div className="learning-panel-heading"><div><span className="section-eyebrow">YOUR SAVED PROGRESS</span><h2>AWS course progress</h2></div><Cloud size={18} /></div>
            <label className="learning-label">Course progress <strong>{progress.percentComplete}%</strong><input type="range" min="0" max="100" step="5" value={progress.percentComplete} onChange={(event) => setProgress((current) => ({ ...current, percentComplete: Number(event.target.value), isCompleted: Number(event.target.value) === 100 }))} /></label>
            <label className="learning-check"><input type="checkbox" checked={progress.isCompleted} onChange={(event) => setProgress((current) => ({ ...current, isCompleted: event.target.checked, percentComplete: event.target.checked ? 100 : Math.min(current.percentComplete, 95) }))} /> Mark this learning track complete</label>
            <label className="learning-label">Personal course notes<textarea rows="5" maxLength="8000" value={progress.notes} onChange={(event) => setProgress((current) => ({ ...current, notes: event.target.value }))} placeholder="Track modules, questions, and next steps." /></label>
            <button className="learning-button" type="button" onClick={saveProgress} disabled={saving}>{saving ? 'Saving...' : 'Save course progress'}</button>
          </section>
          <section className="learning-panel">
            <div className="learning-panel-heading"><div><span className="section-eyebrow">OFFICIAL LEARNING LINKS</span><h2>Explore AWS</h2></div><BookOpen size={18} /></div>
            <div className="aws-resource-list">{awsResources.map((resource) => <a href={resource.url} target="_blank" rel="noreferrer" key={resource.url}><span><strong>{resource.title}</strong><small>{resource.description}</small></span><ArrowUpRight size={16} /></a>)}</div>
          </section>
        </div>

        <section className="learning-panel cloud-labs-panel">
          <div className="learning-panel-heading"><div><span className="section-eyebrow">YOUR PRIVATE NOTES</span><h2>Cloud lab notes <small>{labNotes.length}</small></h2></div></div>
          <form className="cloud-inline-form" onSubmit={saveLab}>
            <label>{editingLab ? 'Edit lab title' : 'Lab title'}<input required minLength="2" maxLength="160" value={labDraft.title} onChange={(event) => setLabDraft((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. IAM concepts review" /></label>
            <label>Lab notes<textarea required rows="3" maxLength="8000" value={labDraft.notes} onChange={(event) => setLabDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Write your own observations, steps, and takeaways." /></label>
            <div><button className="learning-button" type="submit" disabled={saving}><Plus size={15} />{saving ? 'Saving...' : editingLab ? 'Update lab note' : 'Save lab note'}</button>{editingLab && <button className="learning-button is-secondary" type="button" onClick={() => { setEditingLab(null); setLabDraft({ title: '', notes: '' }); }}>Cancel edit</button>}</div>
          </form>
          {labNotes.length ? <div className="cloud-lab-list">{labNotes.map((note) => <article key={note.id} className={note.isComplete ? 'is-completed' : ''}><div className="cloud-lab-head"><div><h3>{note.title}</h3><time dateTime={note.updatedAt}>Updated {new Date(note.updatedAt).toLocaleDateString()}</time></div><div className="cloud-record-actions"><button className="learning-button is-secondary" type="button" onClick={() => { setEditingLab(note); setLabDraft({ title: note.title, notes: note.notes }); window.scrollTo({ top: document.querySelector('.cloud-inline-form')?.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' }); }}>Edit</button><button type="button" aria-label={`Delete ${note.title}`} onClick={() => deleteLab(note)}><Trash2 size={15} /></button></div></div><p>{note.notes}</p><button className={`coding-complete-toggle${note.isComplete ? ' is-done' : ''}`} type="button" onClick={() => toggleLab(note)}>{note.isComplete ? <Check size={15} /> : <span className="empty-check" />} {note.isComplete ? 'Lab complete' : 'Mark lab complete'}</button></article>)}</div> : <p className="learning-muted">Your private lab notes will appear here after saving.</p>}
        </section>

        <section className="learning-panel cloud-certificate-panel">
          <div className="learning-panel-heading"><div><span className="section-eyebrow">YOUR ACHIEVEMENTS</span><h2>AWS certificate records <small>{certificates.length}</small></h2></div><Award size={18} /></div>
          <p className="learning-muted">Add certificates you have earned. These are personal records and are not independently verified by this portal.</p>
          <form className="cloud-certificate-form" onSubmit={saveCertificate}>
            <label>Certificate title<input required minLength="2" maxLength="160" value={certificateDraft.title} onChange={(event) => setCertificateDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            <label>Issuer (optional)<input maxLength="160" value={certificateDraft.issuer} onChange={(event) => setCertificateDraft((current) => ({ ...current, issuer: event.target.value }))} /></label>
            <label>Issue date<input type="date" value={certificateDraft.issuedAt} onChange={(event) => setCertificateDraft((current) => ({ ...current, issuedAt: event.target.value }))} /></label>
            <label>Credential link (optional)<input type="url" placeholder="https://" value={certificateDraft.credentialUrl} onChange={(event) => setCertificateDraft((current) => ({ ...current, credentialUrl: event.target.value }))} /></label>
            <button className="learning-button" type="submit" disabled={saving}><Plus size={15} /> Save certificate record</button>
          </form>
          {certificates.length ? <div className="cloud-certificate-list">{certificates.map((certificate) => <article key={certificate.id}><span className="certificate-record-icon"><Award size={17} /></span><div><h3>{certificate.title}</h3><p>{certificate.issuer || 'Issuer not set'}{certificate.issuedAt ? ` · ${new Date(certificate.issuedAt).toLocaleDateString()}` : ''}</p>{certificate.credentialUrl && <a href={certificate.credentialUrl} target="_blank" rel="noreferrer">View credential <ExternalLink size={13} /></a>}</div><button type="button" aria-label={`Delete ${certificate.title}`} onClick={() => deleteCertificate(certificate)}><Trash2 size={15} /></button></article>)}</div> : <p className="learning-muted">No AWS certificate records saved yet.</p>}
        </section>
      </>)}
    </section>
  );
}
