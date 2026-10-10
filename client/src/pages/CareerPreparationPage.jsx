import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness, ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import api from '../services/api';

const statuses = [
  ['SAVED', 'Saved'],
  ['APPLIED', 'Applied'],
  ['ASSESSMENT', 'Assessment'],
  ['INTERVIEW', 'Interview'],
  ['OFFER', 'Offer'],
  ['REJECTED', 'Rejected'],
  ['WITHDRAWN', 'Withdrawn'],
];
const resourceTypes = [
  ['INTERVIEW_PREPARATION', 'Interview preparation'],
  ['APTITUDE_PRACTICE', 'Aptitude practice'],
  ['TECHNICAL_INTERVIEW', 'Technical interview'],
  ['OTHER', 'Other'],
];
const externalResources = [
  { title: 'Microsoft Careers — Interview tips', type: 'Interview preparation', url: 'https://careers.microsoft.com/v2/global/en/interviewtips' },
  { title: 'HackerRank — Interview Preparation Kit', type: 'Aptitude & coding practice', url: 'https://www.hackerrank.com/interview/interview-preparation-kit' },
  { title: 'LeetCode — Study Plans', type: 'Technical interview practice', url: 'https://leetcode.com/studyplan/' },
  { title: 'AWS — Interview preparation', type: 'Cloud career resource', url: 'https://aws.amazon.com/certification/certification-prep/' },
];
const emptyApplication = { companyName: '', role: '', appliedAt: '', status: 'SAVED', notes: '', jobUrl: '' };
const emptyResource = { title: '', type: 'INTERVIEW_PREPARATION', url: '', notes: '' };

function Modal({ title, children, onClose }) {
  return <div className="portfolio-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="portfolio-modal" role="dialog" aria-modal="true" aria-labelledby="career-modal-title"><header><div><span className="section-eyebrow">PRIVATE CAREER NOTES</span><h2 id="career-modal-title">{title}</h2></div><button type="button" aria-label="Close form" onClick={onClose}>×</button></header>{children}</section></div>;
}

export default function CareerPreparationPage() {
  const [applications, setApplications] = useState([]);
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modalType, setModalType] = useState('');
  const [editing, setEditing] = useState(null);
  const [applicationDraft, setApplicationDraft] = useState(emptyApplication);
  const [resourceDraft, setResourceDraft] = useState(emptyResource);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/portfolio/career', { signal });
      setApplications(data.data.career.applications);
      setResources(data.data.career.resources);
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') setError(requestError.response?.data?.message || 'Career records could not be loaded.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function openApplication(application = null) {
    setEditing(application);
    setApplicationDraft(application ? {
      companyName: application.companyName,
      role: application.role,
      appliedAt: application.appliedAt ? new Date(application.appliedAt).toISOString().slice(0, 10) : '',
      status: application.status,
      notes: application.notes || '',
      jobUrl: application.jobUrl || '',
    } : emptyApplication);
    setModalType('application');
  }

  function openResource(resource = null) {
    setEditing(resource);
    setResourceDraft(resource ? { title: resource.title, type: resource.type, url: resource.url || '', notes: resource.notes || '' } : emptyResource);
    setModalType('resource');
  }

  async function submitApplication(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...applicationDraft,
        appliedAt: applicationDraft.appliedAt ? new Date(`${applicationDraft.appliedAt}T00:00:00.000Z`).toISOString() : null,
        notes: applicationDraft.notes.trim() || null,
        jobUrl: applicationDraft.jobUrl.trim() || null,
      };
      if (editing) await api.patch(`/portfolio/career/applications/${editing.id}`, payload);
      else await api.post('/portfolio/career/applications', payload);
      setModalType('');
      setMessage(editing ? 'Application updated.' : 'Application saved.');
      await load();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Application could not be saved.'); }
    finally { setSaving(false); }
  }

  async function submitResource(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...resourceDraft, url: resourceDraft.url.trim() || null, notes: resourceDraft.notes.trim() || null };
      if (editing) await api.patch(`/portfolio/career/resources/${editing.id}`, payload);
      else await api.post('/portfolio/career/resources', payload);
      setModalType('');
      setMessage(editing ? 'Career resource updated.' : 'Career resource saved.');
      await load();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Career resource could not be saved.'); }
    finally { setSaving(false); }
  }

  async function quickStatus(application, status) {
    try {
      const { data } = await api.patch(`/portfolio/career/applications/${application.id}`, { status });
      setApplications((current) => current.map((item) => item.id === application.id ? data.data.application : item));
      setMessage('Application status updated.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Application status could not be updated.'); }
  }

  async function deleteRecord(kind, item) {
    if (!window.confirm(`Delete "${kind === 'application' ? `${item.role} at ${item.companyName}` : item.title}"?`)) return;
    try {
      await api.delete(kind === 'application' ? `/portfolio/career/applications/${item.id}` : `/portfolio/career/resources/${item.id}`);
      if (kind === 'application') setApplications((current) => current.filter((record) => record.id !== item.id));
      else setResources((current) => current.filter((record) => record.id !== item.id));
      setMessage('Career record deleted.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Career record could not be deleted.'); }
  }

  const visibleApplications = applications.filter((application) => (
    (!statusFilter || application.status === statusFilter)
    && `${application.companyName} ${application.role}`.toLowerCase().includes(search.toLowerCase())
  ));
  const visibleResources = resources.filter((resource) => (
    (!typeFilter || resource.type === typeFilter)
    && `${resource.title} ${resource.notes || ''}`.toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <section className="portfolio-page career-page">
      <header className="learning-page-heading"><span className="learning-title-icon"><BriefcaseBusiness size={21} /></span><div><span className="section-eyebrow">PLAN YOUR NEXT STEP</span><h1>Career Preparation</h1><p>Track internship applications and keep interview, aptitude, and technical preparation resources together.</p></div></header>
      <div className="learning-disclaimer"><BriefcaseBusiness size={17} /><p>Applications and notes are private to your account. External practice and interview resources open on their own sites; no third-party service is connected here.</p></div>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}{message && <p className="academic-message" role="status">{message}</p>}
      <div className="portfolio-filter-bar"><label className="learning-search"><Search size={16} /><input aria-label="Search career records" placeholder="Search companies and resources..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label="Filter applications by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All application statuses</option>{statuses.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><select aria-label="Filter career resources by type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">All preparation types</option>{resourceTypes.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div>

      <section className="learning-panel career-section">
        <div className="learning-panel-heading"><div><span className="section-eyebrow">INTERNSHIP TRACKER</span><h2>Applications <small>{applications.length}</small></h2></div><button className="learning-button" type="button" onClick={() => openApplication()}><Plus size={14} /> Add application</button></div>
        {loading ? <div className="academic-loading">Loading your career records...</div> : visibleApplications.length === 0 ? <p className="learning-muted">{applications.length ? 'No applications match the current filters.' : 'No internship applications saved yet.'}</p> : <div className="career-application-list">{visibleApplications.map((application) => <article key={application.id}>
          <div className="career-application-title"><span className="career-company-mark">{application.companyName.slice(0, 1).toUpperCase()}</span><div><h3>{application.role}</h3><p>{application.companyName}{application.appliedAt ? ` · ${new Date(application.appliedAt).toLocaleDateString()}` : ''}</p></div></div>
          <label className="career-status-control"><span>Status</span><select aria-label={`Status for ${application.role} at ${application.companyName}`} value={application.status} onChange={(event) => quickStatus(application, event.target.value)}>{statuses.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          {application.notes && <p className="career-application-notes">{application.notes}</p>}
          {application.jobUrl && <a className="learning-doc-link" href={application.jobUrl} target="_blank" rel="noreferrer">Job listing <ArrowUpRight size={13} /></a>}
          <div className="career-record-actions"><button type="button" className="learning-button is-secondary" onClick={() => openApplication(application)}>Edit</button><button type="button" aria-label={`Delete ${application.role} at ${application.companyName}`} onClick={() => deleteRecord('application', application)}><Trash2 size={14} /></button></div>
        </article>)}</div>}
      </section>

      <section className="learning-panel career-section">
        <div className="learning-panel-heading"><div><span className="section-eyebrow">YOUR PREPARATION LIBRARY</span><h2>Saved resources <small>{resources.length}</small></h2></div><button className="learning-button" type="button" onClick={() => openResource()}><Plus size={14} /> Add resource</button></div>
        {visibleResources.length === 0 ? <p className="learning-muted">{resources.length ? 'No resources match the current filters.' : 'Save interview, aptitude, and technical interview resources that you want to revisit.'}</p> : <div className="career-resource-list">{visibleResources.map((resource) => <article key={resource.id}><span className="career-resource-type">{resourceTypes.find(([key]) => key === resource.type)?.[1]}</span><h3>{resource.title}</h3>{resource.notes && <p>{resource.notes}</p>}{resource.url && <a href={resource.url} target="_blank" rel="noreferrer">Open resource <ExternalLink size={13} /></a>}<div className="career-record-actions"><button type="button" className="learning-button is-secondary" onClick={() => openResource(resource)}>Edit</button><button type="button" aria-label={`Delete ${resource.title}`} onClick={() => deleteRecord('resource', resource)}><Trash2 size={14} /></button></div></article>)}</div>}
      </section>

      <section className="learning-panel career-section">
        <div className="learning-panel-heading"><div><span className="section-eyebrow">EXTERNAL STUDY LINKS</span><h2>Interview & aptitude practice</h2></div></div>
        <div className="career-external-grid">{externalResources.map((resource) => <a href={resource.url} target="_blank" rel="noreferrer" key={resource.url}><span>{resource.type}</span><strong>{resource.title}</strong><ArrowUpRight size={15} /></a>)}</div>
        <p className="learning-muted">These external links are independent services. Save a link above to add your own notes; this portal does not track activity on those sites.</p>
      </section>

      {modalType === 'application' && <Modal title={editing ? 'Edit internship application' : 'Add internship application'} onClose={() => setModalType('')}><form onSubmit={submitApplication}>
        <div className="portfolio-form-grid"><label>Company name<input required minLength="2" maxLength="160" value={applicationDraft.companyName} onChange={(event) => setApplicationDraft((current) => ({ ...current, companyName: event.target.value }))} /></label><label>Role<input required minLength="2" maxLength="160" value={applicationDraft.role} onChange={(event) => setApplicationDraft((current) => ({ ...current, role: event.target.value }))} /></label><label>Application date<input type="date" value={applicationDraft.appliedAt} onChange={(event) => setApplicationDraft((current) => ({ ...current, appliedAt: event.target.value }))} /></label><label>Status<select value={applicationDraft.status} onChange={(event) => setApplicationDraft((current) => ({ ...current, status: event.target.value }))}>{statuses.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></div>
        <label>Job posting URL (optional)<input type="url" value={applicationDraft.jobUrl} onChange={(event) => setApplicationDraft((current) => ({ ...current, jobUrl: event.target.value }))} placeholder="https://" /></label><label>Private preparation notes<textarea rows="4" maxLength="3000" value={applicationDraft.notes} onChange={(event) => setApplicationDraft((current) => ({ ...current, notes: event.target.value }))} /></label><footer><button className="learning-button is-secondary" type="button" onClick={() => setModalType('')}>Cancel</button><button className="learning-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Save application'}</button></footer>
      </form></Modal>}
      {modalType === 'resource' && <Modal title={editing ? 'Edit preparation resource' : 'Add preparation resource'} onClose={() => setModalType('')}><form onSubmit={submitResource}>
        <label>Resource title<input required minLength="2" maxLength="160" value={resourceDraft.title} onChange={(event) => setResourceDraft((current) => ({ ...current, title: event.target.value }))} /></label><label>Preparation type<select value={resourceDraft.type} onChange={(event) => setResourceDraft((current) => ({ ...current, type: event.target.value }))}>{resourceTypes.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>Resource URL (optional)<input type="url" value={resourceDraft.url} onChange={(event) => setResourceDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://" /></label><label>Personal notes<textarea rows="4" maxLength="3000" value={resourceDraft.notes} onChange={(event) => setResourceDraft((current) => ({ ...current, notes: event.target.value }))} /></label><footer><button className="learning-button is-secondary" type="button" onClick={() => setModalType('')}>Cancel</button><button className="learning-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Save resource'}</button></footer>
      </form></Modal>}
    </section>
  );
}
