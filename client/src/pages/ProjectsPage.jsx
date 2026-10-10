import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Code2, Eye, EyeOff, FileText, FolderKanban, ImagePlus, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';

const blankProject = { title: '', description: '', status: 'PLANNING', repositoryUrl: '', demoUrl: '', techStack: '', documentation: '', isPublic: false };
const projectStatuses = { PLANNING: 'Planning', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', ARCHIVED: 'Archived' };

function apiOrigin() {
  return (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
}

function ProjectForm({ project, onSave, onCancel, saving }) {
  const [values, setValues] = useState(project ? {
    ...project,
    description: project.description || '',
    repositoryUrl: project.repositoryUrl || '',
    demoUrl: project.demoUrl || '',
    documentation: project.documentation || '',
    techStack: (project.techStack || []).join(', '),
  } : blankProject);
  const [error, setError] = useState('');

  function set(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (values.title.trim().length < 2) { setError('Project name must be at least two characters.'); return; }
    try {
      await onSave({
        title: values.title.trim(),
        description: values.description.trim() || null,
        status: values.status,
        repositoryUrl: values.repositoryUrl.trim() || null,
        demoUrl: values.demoUrl.trim() || null,
        techStack: [...new Set(values.techStack.split(',').map((item) => item.trim()).filter(Boolean))],
        documentation: values.documentation.trim() || null,
        isPublic: values.isPublic,
      });
    } catch (saveError) { setError(saveError); }
  }

  return (
    <div className="portfolio-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="portfolio-modal" role="dialog" aria-modal="true" aria-labelledby="project-form-title">
        <header><div><span className="section-eyebrow">PROJECT PORTFOLIO</span><h2 id="project-form-title">{project ? 'Edit project' : 'Add a project'}</h2></div><button type="button" aria-label="Close project form" onClick={onCancel}>×</button></header>
        <form onSubmit={submit}>
          <label>Project name<input required minLength="2" maxLength="160" value={values.title} onChange={(event) => set('title', event.target.value)} /></label>
          <label>Description<textarea rows="3" maxLength="3000" value={values.description} onChange={(event) => set('description', event.target.value)} /></label>
          <div className="portfolio-form-grid">
            <label>Development status<select value={values.status} onChange={(event) => set('status', event.target.value)}>{Object.entries(projectStatuses).map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select></label>
            <label>Technologies (comma separated)<input value={values.techStack} onChange={(event) => set('techStack', event.target.value)} placeholder="Python, pandas, PostgreSQL" /></label>
            <label>GitHub repository URL<input type="url" value={values.repositoryUrl} onChange={(event) => set('repositoryUrl', event.target.value)} placeholder="https://" /></label>
            <label>Live deployment URL<input type="url" value={values.demoUrl} onChange={(event) => set('demoUrl', event.target.value)} placeholder="https://" /></label>
          </div>
          <label>Project documentation<textarea rows="5" maxLength="12000" value={values.documentation} onChange={(event) => set('documentation', event.target.value)} placeholder="Architecture, key features, setup steps, and what you learned." /></label>
          <label className="portfolio-checkbox"><input type="checkbox" checked={values.isPublic} onChange={(event) => set('isPublic', event.target.checked)} /> Include this project on my public portfolio</label>
          {error && <p className="academic-message is-error" role="alert">{error}</p>}
          <footer><button className="learning-button is-secondary" type="button" onClick={onCancel}>Cancel</button><button className="learning-button" type="submit" disabled={saving}>{saving ? 'Saving...' : project ? 'Save changes' : 'Save project'}</button></footer>
        </form>
      </section>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState('');

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/portfolio/projects', { signal });
      setProjects(data.data.projects);
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') setError(requestError.response?.data?.message || 'Projects could not be loaded.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function save(values) {
    setSaving(true);
    setError('');
    try {
      if (editing) await api.patch(`/portfolio/projects/${editing.id}`, values);
      else await api.post('/portfolio/projects', values);
      setMessage(editing ? 'Project updated.' : 'Project saved.');
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (requestError) { throw requestError.response?.data?.message || 'The project could not be saved.'; }
    finally { setSaving(false); }
  }

  async function deleteProject(project) {
    if (!window.confirm(`Delete "${project.title}" and its screenshots?`)) return;
    setError('');
    try {
      await api.delete(`/portfolio/projects/${project.id}`);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setMessage('Project and screenshots deleted.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Project could not be deleted.'); }
  }

  async function uploadScreenshot(project, file) {
    if (!file) return;
    setUploading(project.id);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/portfolio/projects/${project.id}/screenshots`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Project screenshot uploaded privately.');
      await load();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Screenshot upload failed.'); }
    finally { setUploading(''); }
  }

  async function deleteScreenshot(project, screenshot) {
    if (!window.confirm(`Delete screenshot "${screenshot.fileName}"?`)) return;
    try {
      await api.delete(`/portfolio/projects/${project.id}/screenshots/${screenshot.id}`);
      await load();
      setMessage('Screenshot deleted.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Screenshot could not be deleted.'); }
  }

  return (
    <section className="portfolio-page">
      <header className="learning-page-heading">
        <span className="learning-title-icon"><FolderKanban size={21} /></span>
        <div><span className="section-eyebrow">YOUR WORK, YOUR STORY</span><h1>My Projects</h1><p>Document what you built, the tools you used, and the progress you made.</p></div>
        <button className="learning-button learning-heading-action" type="button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> Add project</button>
      </header>
      <div className="learning-disclaimer"><EyeOff size={17} /><p>Projects are private by default. Choose which ones to include on your public portfolio; screenshots remain private unless that project is public and your portfolio is published.</p></div>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {message && <p className="academic-message" role="status">{message}</p>}
      {loading ? <div className="academic-loading">Loading your projects...</div> : projects.length === 0 ? (
        <div className="portfolio-empty"><span><FolderKanban size={25} /></span><h2>Your project portfolio starts here.</h2><p>Add real work you want to keep in your portfolio. Nothing is published unless you explicitly enable it.</p><button className="learning-button" type="button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={15} /> Add your first project</button></div>
      ) : <div className="project-card-grid">{projects.map((project) => (
        <article className="project-portfolio-card" key={project.id}>
          {project.screenshots.length > 0 ? <div className="project-screenshot-grid">{project.screenshots.map((screenshot) => <figure key={screenshot.id}><img src={`${apiOrigin()}/api${screenshot.url}`} crossOrigin="use-credentials" alt={`${project.title} screenshot`} /><button type="button" aria-label={`Delete screenshot ${screenshot.fileName}`} onClick={() => deleteScreenshot(project, screenshot)}><Trash2 size={13} /></button></figure>)}</div> : <div className="project-image-empty"><ImagePlus size={23} /><span>No screenshots added</span></div>}
          <div className="project-card-header"><span className={`project-status ${project.status.toLowerCase()}`}>{projectStatuses[project.status]}</span><span className={`visibility-badge${project.isPublic ? ' is-public' : ''}`}>{project.isPublic ? <><Eye size={12} /> Public</> : <><EyeOff size={12} /> Private</>}</span></div>
          <h2>{project.title}</h2>
          {project.description && <p className="project-description">{project.description}</p>}
          {project.techStack.length > 0 && <div className="project-tech-list">{project.techStack.map((tech) => <span key={tech}>{tech}</span>)}</div>}
          <div className="project-links">{project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer"><Code2 size={14} /> Repository <ArrowUpRight size={13} /></a>}{project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /> Live demo <ArrowUpRight size={13} /></a>}</div>
          {project.documentation && <details className="project-documentation"><summary><FileText size={14} /> Project documentation</summary><p>{project.documentation}</p></details>}
          <div className="project-card-actions">
            <label className="project-upload-button"><ImagePlus size={14} />{uploading === project.id ? 'Uploading...' : 'Add screenshot'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading === project.id} onChange={(event) => { uploadScreenshot(project, event.target.files?.[0]); event.target.value = ''; }} /></label>
            <button className="learning-button is-secondary" type="button" onClick={() => { setEditing(project); setFormOpen(true); }}>Edit</button>
            <button className="portfolio-icon-action" type="button" aria-label={`Delete ${project.title}`} onClick={() => deleteProject(project)}><Trash2 size={15} /></button>
          </div>
        </article>
      ))}</div>}
      {formOpen && <ProjectForm project={editing} onSave={save} onCancel={() => setFormOpen(false)} saving={saving} />}
    </section>
  );
}
