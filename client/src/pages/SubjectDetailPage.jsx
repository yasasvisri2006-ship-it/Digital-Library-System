import {
  ArrowLeft,
  BookOpen,
  Check,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

const resourceTypes = [
  ['SYLLABUS', 'Syllabus'],
  ['NOTES', 'Lecture notes'],
  ['ASSIGNMENT', 'Assignment'],
  ['REFERENCE', 'Reference link'],
  ['LINK', 'External link'],
  ['SLIDES', 'Slides'],
  ['DOCUMENT', 'Document'],
  ['VIDEO', 'Video'],
  ['OTHER', 'Other'],
];
const uploadTypes = resourceTypes.slice(0, 3).concat(resourceTypes.slice(5, 7));
const linkTypes = [['REFERENCE', 'Reference link'], ['LINK', 'External link']];

function messageFrom(error) {
  return error.response?.data?.message || 'The request could not be completed. Please try again.';
}

function ResourceForm({ subjectId, resource, initialType = 'NOTES', onClose, onSaved }) {
  const isLinkType = (value) => linkTypes.some(([type]) => type === value);
  const [mode, setMode] = useState(resource ? (resource.fileName ? 'file' : 'link') : (isLinkType(initialType) ? 'link' : 'file'));
  const [title, setTitle] = useState(resource?.title || '');
  const [description, setDescription] = useState(resource?.description || '');
  const [type, setType] = useState(resource?.type || initialType);
  const [url, setUrl] = useState(resource?.url || '');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const allowedTypes = resource?.fileName ? uploadTypes : (resource ? resourceTypes : (mode === 'file' ? uploadTypes : linkTypes));

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (resource) {
        await api.patch(`/subjects/resources/${resource.id}`, {
          title: title.trim(),
          description: description.trim() || null,
          type,
          url: isLinkType(type) ? url.trim() : null,
        });
      } else if (mode === 'file') {
        if (!file) throw new Error('Choose a PDF file to upload.');
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('type', type);
        formData.append('file', file);
        await api.post(`/subjects/${subjectId}/resources/file`, formData);
      } else {
        await api.post(`/subjects/${subjectId}/resources`, {
          title: title.trim(),
          description: description.trim() || null,
          type,
          url: url.trim() || null,
        });
      }
      onSaved();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save this resource.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="subject-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="subject-modal resource-modal" role="dialog" aria-modal="true" aria-labelledby="resource-form-title">
        <header>
          <div><span>PRIVATE TO YOUR ACCOUNT</span><h2 id="resource-form-title">{resource ? 'Edit study resource' : 'Add study resource'}</h2></div>
          <button type="button" aria-label="Close resource form" onClick={onClose} disabled={busy}><span aria-hidden="true">×</span></button>
        </header>
        {!resource && <div className="resource-mode-tabs" role="tablist" aria-label="Resource kind">
          <button type="button" className={mode === 'link' ? 'active' : ''} onClick={() => { setMode('link'); setType('REFERENCE'); }}>Add a link</button>
          <button type="button" className={mode === 'file' ? 'active' : ''} onClick={() => { setMode('file'); setType('NOTES'); }}>Upload a PDF</button>
        </div>}
        <form className="academic-form" onSubmit={submit}>
          <label><span>Title</span><input required minLength={2} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Resource title" /></label>
          <label><span>Resource type</span><select value={type} onChange={(event) => setType(event.target.value)}>{allowedTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {(!resource && mode === 'link') || isLinkType(type) ? (
            <label><span>Web address</span><input type="url" required={['REFERENCE', 'LINK'].includes(type)} maxLength={2048} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /></label>
          ) : null}
          {!resource && mode === 'file' && <label className="resource-file-field"><span>PDF file <em>Maximum 20 MB</em></span><input type="file" accept="application/pdf,.pdf" required onChange={(event) => setFile(event.target.files?.[0] || null)} /><small>The API verifies the PDF file signature and stores it outside the public web directory.</small></label>}
          <label><span>Description <em>Optional</em></span><textarea rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short note to help you find this resource" /></label>
          {error && <p className="academic-message is-error" role="alert">{error}</p>}
          <footer><button className="academic-button is-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="academic-button" type="submit" disabled={busy}>{busy ? 'Saving...' : resource ? 'Save changes' : mode === 'file' ? 'Upload PDF' : 'Save link'}</button></footer>
        </form>
      </section>
    </div>
  );
}

function ResourceCard({ resource, onEdit, onDelete, onReview, updating }) {
  const typeLabel = resourceTypes.find(([value]) => value === resource.type)?.[1] || resource.type;
  const downloadUrl = resource.fileName ? api.getUri({ url: `/subjects/resources/${resource.id}/download` }) : '';
  return (
    <article className={`resource-card${resource.isReviewed ? ' is-reviewed' : ''}`}>
      <div className="resource-card-icon">{resource.fileName ? <FileText size={18} /> : <ExternalLink size={18} />}</div>
      <div className="resource-card-main">
        <div className="resource-title-row"><span className="resource-type-label">{typeLabel}</span>{resource.isReviewed && <span className="reviewed-badge"><Check size={12} /> Reviewed</span>}</div>
        <h3>{resource.title}</h3>
        {resource.description && <p>{resource.description}</p>}
        {resource.fileName && <small>{resource.fileName} · {(resource.fileSize / 1024 / 1024).toFixed(1)} MB</small>}
        {!resource.fileName && resource.url && <a className="resource-external-link" href={resource.url} target="_blank" rel="noreferrer">{resource.url}<ExternalLink size={12} /></a>}
      </div>
      <div className="resource-actions">
        {resource.fileName && <a className="resource-action" href={downloadUrl} aria-label={`Download ${resource.title}`}><Download size={15} /></a>}
        <button className="resource-action" type="button" aria-label={`Edit ${resource.title}`} onClick={() => onEdit(resource)} disabled={updating}><Pencil size={14} /></button>
        <button className="resource-action" type="button" aria-label={`Delete ${resource.title}`} onClick={() => onDelete(resource)} disabled={updating}><Trash2 size={14} /></button>
        <button className={`resource-review-button${resource.isReviewed ? ' active' : ''}`} type="button" onClick={() => onReview(resource)} disabled={updating} aria-pressed={resource.isReviewed}>
          <Check size={13} /> {resource.isReviewed ? 'Reviewed' : 'Mark reviewed'}
        </button>
      </div>
    </article>
  );
}

export default function SubjectDetailPage() {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [newResourceType, setNewResourceType] = useState('NOTES');
  const [updatingResourceId, setUpdatingResourceId] = useState('');

  const loadSubject = useCallback(async (signal) => {
    setLoading(true);
    setPageError('');
    try {
      const { data } = await api.get(`/subjects/${subjectId}`, { signal });
      setSubject(data.data.subject);
    } catch (error) {
      if (error.name !== 'CanceledError') setPageError(messageFrom(error));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    const controller = new AbortController();
    loadSubject(controller.signal);
    return () => controller.abort();
  }, [loadSubject]);

  const visibleResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (subject?.resources || []).filter((resource) => (
      (!typeFilter || resource.type === typeFilter)
      && (!query || `${resource.title} ${resource.description || ''} ${resource.fileName || ''} ${resource.url || ''}`.toLowerCase().includes(query))
    ));
  }, [search, subject, typeFilter]);
  const syllabusResources = visibleResources.filter((resource) => resource.type === 'SYLLABUS');
  const otherResources = visibleResources.filter((resource) => resource.type !== 'SYLLABUS');

  async function refreshAfterSave() {
    setFormOpen(false);
    setEditingResource(null);
    setMessage('Resource saved.');
    await loadSubject();
  }

  async function changeReviewed(resource) {
    setUpdatingResourceId(resource.id);
    setPageError('');
    try {
      const { data } = await api.patch(`/subjects/resources/${resource.id}`, { isReviewed: !resource.isReviewed });
      setSubject((current) => {
        const resources = current.resources.map((item) => item.id === resource.id ? data.data.resource : item);
        const reviewedResourceCount = resources.filter((item) => item.isReviewed).length;
        return {
          ...current,
          resources,
          resourceCount: resources.length,
          reviewedResourceCount,
          progressPercent: resources.length ? Math.round((reviewedResourceCount / resources.length) * 100) : 0,
        };
      });
      setMessage(resource.isReviewed ? 'Resource marked as not reviewed.' : 'Resource marked reviewed.');
    } catch (error) {
      setPageError(messageFrom(error));
    } finally {
      setUpdatingResourceId('');
    }
  }

  async function deleteResource(resource) {
    if (!window.confirm(`Delete "${resource.title}"${resource.fileName ? ' and its private PDF file' : ''}?`)) return;
    setUpdatingResourceId(resource.id);
    setPageError('');
    try {
      await api.delete(`/subjects/resources/${resource.id}`);
      await loadSubject();
      setMessage('Resource deleted.');
    } catch (error) {
      setPageError(messageFrom(error));
    } finally {
      setUpdatingResourceId('');
    }
  }

  if (loading && !subject) return <div className="academic-loading">Loading subject...</div>;
  if (pageError && !subject) return <section className="subjects-page"><Link className="back-link" to="/my-subjects"><ArrowLeft size={15} /> Back to My Subjects</Link><p className="academic-message is-error" role="alert">{pageError}</p></section>;
  if (!subject) return null;

  const resourceCount = subject.resourceCount || subject.resources.length;
  const reviewedCount = subject.reviewedResourceCount || 0;
  const progress = subject.progressPercent || 0;

  return (
    <section className="subjects-page subject-detail-page">
      <Link className="back-link" to="/my-subjects"><ArrowLeft size={15} /> Back to My Subjects</Link>
      <header className="academic-page-heading subject-detail-heading">
        <span className="academic-title-icon"><BookOpen size={20} /></span>
        <div><span>{subject.code || 'PERSONAL SUBJECT'}{subject.semester ? ` · ${subject.semester}` : ''}</span><h1>{subject.name}</h1><p>{subject.description || 'Keep your verified course materials organized in one private place.'}</p></div>
        <div className="subject-detail-progress"><strong>{progress}%</strong><span>resources reviewed</span><small>{reviewedCount} / {resourceCount}</small></div>
      </header>

      <section className="syllabus-panel">
        <div className="syllabus-panel-icon"><FileText size={18} /></div>
        <div><h2>Syllabus</h2><p>Add or link your verified syllabus here. No official MBU syllabus is preloaded.</p></div>
        <button className="academic-button is-secondary" type="button" onClick={() => { setEditingResource(null); setNewResourceType('SYLLABUS'); setFormOpen(true); }}><Plus size={15} /> Add syllabus</button>
      </section>

      {pageError && <p className="academic-message is-error" role="alert">{pageError}</p>}
      {message && <p className="academic-message" role="status">{message}</p>}
      <div className="resources-heading">
        <div><span>YOUR SAVED MATERIALS</span><h2>Study resources <small>{subject.resources.length}</small></h2></div>
        <button className="academic-button" type="button" onClick={() => { setEditingResource(null); setNewResourceType('NOTES'); setFormOpen(true); }}><FilePlus2 size={16} /> Add resource</button>
      </div>
      <div className="resource-toolbar">
        <label className="subjects-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this subject's resources..." aria-label="Search study resources" /></label>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter resources by type">
          <option value="">All resource types</option>
          {resourceTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {subject.resources.length === 0 ? (
        <div className="subjects-empty resource-empty"><span><Upload size={23} /></span><h2>No study resources yet</h2><p>Add your own verified syllabus, notes, assignment PDFs, or references.</p><button className="academic-button" type="button" onClick={() => { setNewResourceType('NOTES'); setFormOpen(true); }}><Plus size={16} /> Add first resource</button></div>
      ) : visibleResources.length === 0 ? (
        <div className="subjects-empty resource-empty"><h2>No matching resources</h2><p>Try another search term or resource type.</p></div>
      ) : (
        <>
          {syllabusResources.length > 0 && <section className="resource-group"><div className="resource-group-heading"><h3>Syllabus resources</h3><span>{syllabusResources.length}</span></div><div className="resource-list">{syllabusResources.map((resource) => <ResourceCard key={resource.id} resource={resource} onEdit={setEditingResource} onDelete={deleteResource} onReview={changeReviewed} updating={updatingResourceId === resource.id} />)}</div></section>}
          <section className="resource-group">
            <div className="resource-group-heading"><h3>{typeFilter ? resourceTypes.find(([value]) => value === typeFilter)?.[1] || 'Filtered resources' : 'Notes, assignments & references'}</h3><span>{otherResources.length}</span></div>
            {otherResources.length ? <div className="resource-list">{otherResources.map((resource) => <ResourceCard key={resource.id} resource={resource} onEdit={setEditingResource} onDelete={deleteResource} onReview={changeReviewed} updating={updatingResourceId === resource.id} />)}</div> : <p className="resource-group-empty">No resources in this section.</p>}
          </section>
        </>
      )}
      {formOpen || editingResource ? <ResourceForm key={editingResource?.id || newResourceType} subjectId={subject.id} resource={editingResource} initialType={newResourceType} onClose={() => { setFormOpen(false); setEditingResource(null); }} onSaved={refreshAfterSave} /> : null}
    </section>
  );
}
