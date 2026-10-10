import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Award, Eye, EyeOff, FileUp, Plus, Search, Trash2, Upload } from 'lucide-react';
import api from '../services/api';

const blank = { title: '', issuer: '', issuedAt: '', credentialUrl: '', category: 'GENERAL', isPublic: false };

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(blank);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const params = { search: search.trim() || undefined, category: category || undefined };
      const { data } = await api.get('/portfolio/certificates', { params, signal });
      setCertificates(data.data.certificates);
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') setError(requestError.response?.data?.message || 'Certificates could not be loaded.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [search, category]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function openForm(certificate = null) {
    setEditing(certificate);
    setValues(certificate ? {
      title: certificate.title,
      issuer: certificate.issuer || '',
      issuedAt: certificate.issuedAt ? new Date(certificate.issuedAt).toISOString().slice(0, 10) : '',
      credentialUrl: certificate.credentialUrl || '',
      category: certificate.category,
      isPublic: certificate.isPublic,
    } : blank);
    setFormOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...values,
        issuer: values.issuer.trim() || null,
        issuedAt: values.issuedAt ? new Date(`${values.issuedAt}T00:00:00.000Z`).toISOString() : null,
        credentialUrl: values.credentialUrl.trim() || null,
      };
      if (editing) {
        await api.patch(`/portfolio/certificates/${editing.id}`, payload);
        setMessage('Certificate updated.');
      } else {
        await api.post('/portfolio/certificates', payload);
        setMessage('Certificate saved.');
      }
      setFormOpen(false);
      await load();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Certificate could not be saved.'); }
    finally { setSaving(false); }
  }

  async function uploadFile(certificate, file) {
    if (!file) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Choose a PDF certificate file.');
      return;
    }
    setUploading(certificate.id);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/portfolio/certificates/${certificate.id}/file`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Certificate file uploaded privately.');
      await load();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Certificate upload failed.'); }
    finally { setUploading(''); }
  }

  async function deleteCertificate(certificate) {
    if (!window.confirm(`Delete "${certificate.title}" and its uploaded certificate file?`)) return;
    try {
      await api.delete(`/portfolio/certificates/${certificate.id}`);
      setCertificates((current) => current.filter((item) => item.id !== certificate.id));
      setMessage('Certificate deleted.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Certificate could not be deleted.'); }
  }

  return (
    <section className="portfolio-page">
      <header className="learning-page-heading">
        <span className="learning-title-icon"><Award size={21} /></span>
        <div><span className="section-eyebrow">YOUR CREDENTIALS</span><h1>My Certificates</h1><p>Keep your credentials organized and decide which records to feature publicly.</p></div>
        <button className="learning-button learning-heading-action" type="button" onClick={() => openForm()}><Plus size={16} /> Add certificate</button>
      </header>
      <div className="learning-disclaimer"><EyeOff size={17} /><p>Certificate records and PDF files are private by default. Only certificates you explicitly mark public appear on your enabled public portfolio.</p></div>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {message && <p className="academic-message" role="status">{message}</p>}
      <div className="portfolio-filter-bar">
        <label className="learning-search"><Search size={16} /><input aria-label="Search certificates" placeholder="Search by title or issuer..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <select aria-label="Filter certificates by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option><option value="GENERAL">General</option><option value="AWS_CLOUD">AWS Cloud</option></select>
      </div>
      {loading ? <div className="academic-loading">Loading your certificates...</div> : certificates.length === 0 ? (
        <div className="portfolio-empty"><span><Award size={25} /></span><h2>{search || category ? 'No matching certificates' : 'No certificates saved yet'}</h2><p>{search || category ? 'Try another search or category.' : 'Add certificates you have earned. Credentials are personal records and are not independently verified.'}</p>{!search && !category && <button className="learning-button" type="button" onClick={() => openForm()}><Plus size={15} /> Add certificate</button>}</div>
      ) : <div className="certificate-card-grid">{certificates.map((certificate) => (
        <article className="portfolio-certificate-card" key={certificate.id}>
          <div className="certificate-card-top"><span className="certificate-record-icon"><Award size={19} /></span><span className={`visibility-badge${certificate.isPublic ? ' is-public' : ''}`}>{certificate.isPublic ? <><Eye size={12} /> Public</> : <><EyeOff size={12} /> Private</>}</span></div>
          <span className="section-eyebrow">{certificate.category === 'AWS_CLOUD' ? 'AWS CLOUD' : 'CERTIFICATE'}</span>
          <h2>{certificate.title}</h2>
          <p>{certificate.issuer || 'Issuing organization not set'}</p>
          {certificate.issuedAt && <time dateTime={certificate.issuedAt}>Issued {new Date(certificate.issuedAt).toLocaleDateString()}</time>}
          {certificate.credentialUrl && <a href={certificate.credentialUrl} target="_blank" rel="noreferrer">Open credential <ArrowUpRight size={14} /></a>}
          {certificate.fileName && <a href={`${api.defaults.baseURL}/portfolio/certificates/${certificate.id}/file`} target="_blank" rel="noreferrer"><FileUp size={14} /> {certificate.fileName}</a>}
          <div className="certificate-card-actions">
            <label className="project-upload-button"><Upload size={14} />{uploading === certificate.id ? 'Uploading...' : certificate.fileName ? 'Replace PDF' : 'Upload PDF'}<input type="file" accept="application/pdf,.pdf" disabled={uploading === certificate.id} onChange={(event) => { uploadFile(certificate, event.target.files?.[0]); event.target.value = ''; }} /></label>
            <button className="learning-button is-secondary" type="button" onClick={() => openForm(certificate)}>Edit</button>
            <button className="portfolio-icon-action" type="button" aria-label={`Delete ${certificate.title}`} onClick={() => deleteCertificate(certificate)}><Trash2 size={15} /></button>
          </div>
        </article>
      ))}</div>}
      {formOpen && <div className="portfolio-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section className="portfolio-modal" role="dialog" aria-modal="true" aria-labelledby="certificate-form-title">
        <header><div><span className="section-eyebrow">CERTIFICATE RECORD</span><h2 id="certificate-form-title">{editing ? 'Edit certificate' : 'Add certificate'}</h2></div><button type="button" aria-label="Close certificate form" onClick={() => setFormOpen(false)}>×</button></header>
        <form onSubmit={submit}>
          <label>Certificate title<input required minLength="2" maxLength="160" value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} /></label>
          <label>Issuing organization<input maxLength="160" value={values.issuer} onChange={(event) => setValues((current) => ({ ...current, issuer: event.target.value }))} /></label>
          <div className="portfolio-form-grid"><label>Issue date<input type="date" value={values.issuedAt} onChange={(event) => setValues((current) => ({ ...current, issuedAt: event.target.value }))} /></label><label>Category<select value={values.category} onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}><option value="GENERAL">General</option><option value="AWS_CLOUD">AWS Cloud</option></select></label></div>
          <label>Credential URL (optional)<input type="url" value={values.credentialUrl} onChange={(event) => setValues((current) => ({ ...current, credentialUrl: event.target.value }))} placeholder="https://" /></label>
          <label className="portfolio-checkbox"><input type="checkbox" checked={values.isPublic} onChange={(event) => setValues((current) => ({ ...current, isPublic: event.target.checked }))} /> Include this certificate on my public portfolio</label>
          <footer><button className="learning-button is-secondary" type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="learning-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Save certificate'}</button></footer>
        </form>
      </section></div>}
    </section>
  );
}
