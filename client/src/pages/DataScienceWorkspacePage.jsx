import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Download,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DataScienceDocumentCover from '../components/DataScienceDocumentCover';
import {
  createDataScienceModule,
  deleteDataScienceMaterial,
  deleteDataScienceModule,
  fetchDataScienceFile,
  getDataScienceModules,
  updateDataScienceMaterial,
  updateDataScienceModule,
  uploadDataScienceMaterial,
} from '../services/dataScience';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set(['ppt', 'pptx', 'pdf', 'doc', 'docx', 'txt', 'ipynb']);

function errorMessage(error) {
  return error.response?.data?.message || error.message || 'The request could not be completed.';
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function saveDownload(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function StudyMaterialCard({ module, material, onChanged }) {
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const readerPath = `/modules/data-science/${module.id}/read/${material.id}`;

  async function downloadOriginal() {
    setActionError('');
    setBusy(true);
    try {
      const file = await fetchDataScienceFile(module.id, material.id);
      saveDownload(file, material.originalFileName);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function renameMaterial() {
    const title = window.prompt('Material title', material.title);
    if (title === null || !title.trim() || title.trim() === material.title) return;
    setActionError('');
    setBusy(true);
    try {
      await updateDataScienceMaterial(material.id, title.trim());
      onChanged('Material renamed.');
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function removeMaterial() {
    if (!window.confirm(`Delete "${material.title}" and its uploaded file?`)) return;
    setActionError('');
    setBusy(true);
    try {
      await deleteDataScienceMaterial(material.id);
      onChanged('Material deleted.');
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="ds-study-card">
      <Link className="ds-document-cover-link" to={readerPath} aria-label={`Read ${material.title}`}>
        <DataScienceDocumentCover moduleId={module.id} material={material} />
      </Link>
      <div className="ds-study-card-info">
        <div className="ds-study-card-heading">
          <div><span className="section-eyebrow">{material.fileType} · {formatDate(material.uploadedAt)}</span><h3>{material.title}</h3></div>
          <div className="ds-study-card-tools">
            <button type="button" aria-label={`Rename ${material.title}`} title="Rename material" disabled={busy} onClick={renameMaterial}><Pencil size={14} /></button>
            <button type="button" aria-label={`Delete ${material.title}`} title="Delete material" disabled={busy} onClick={removeMaterial}><Trash2 size={14} /></button>
          </div>
        </div>
        <p className="ds-original-name">{material.originalFileName}</p>
        {material.previewError && <p className="academic-message is-error" role="status">{material.previewError}</p>}
        <div className="ds-study-card-actions">
          <Link className="academic-button" to={readerPath}><BookOpen size={14} /> {material.canRead ? 'Read Book' : 'Open Preview'}</Link>
          <button className="academic-button is-secondary" type="button" onClick={downloadOriginal} disabled={busy}><Download size={14} /> Download Original</button>
        </div>
        {actionError && <p className="academic-message is-error" role="alert">{actionError}</p>}
      </div>
    </article>
  );
}

function ModuleListPage() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadModules = useCallback(async (signal) => {
    setError('');
    try {
      setModules(await getDataScienceModules(signal));
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadModules(controller.signal);
    return () => controller.abort();
  }, [loadModules]);

  async function addModule() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const module = await createDataScienceModule();
      navigate(`/modules/data-science/${module.id}`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function renameModule(module) {
    const title = window.prompt(`Rename Module ${String(module.number).padStart(2, '0')}`, module.title);
    if (title === null || !title.trim() || title.trim() === module.title) return;
    setError('');
    try {
      await updateDataScienceModule(module.id, title.trim());
      setMessage('Module renamed.');
      await loadModules();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function removeModule(module) {
    if (!window.confirm(`Delete "${module.title}" and all of its uploaded materials?`)) return;
    setError('');
    try {
      await deleteDataScienceModule(module.id);
      setMessage('Module deleted.');
      await loadModules();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  return (
    <section className="ds-workspace-page">
      <Link to="/modules" className="back-link"><ArrowLeft size={15} /> Back to Modules</Link>
      <header className="ds-workspace-heading">
        <div><span className="ds-eyebrow">YOUR PERSONAL STUDY SPACE</span><h1>Data Science</h1><p>Choose a numbered module to organize your own files and study materials.</p></div>
        <button type="button" className="academic-button" onClick={addModule} disabled={busy}><Plus size={15} /> Add Module</button>
      </header>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {message && <p className="academic-message" role="status">{message}</p>}
      {loading ? <p className="academic-loading">Loading your modules...</p> : (
        <div className="ds-workspace-grid">
          {modules.map((module) => (
            <article key={module.id} className="ds-module-workspace-card">
              <Link to={`/modules/data-science/${module.id}`} className="ds-module-workspace-open">
                <span className="ds-workspace-module-number">MODULE {String(module.number).padStart(2, '0')}</span>
                <BookOpen size={25} />
                <h2>{module.title}</h2>
                <span>{module.materials.length} {module.materials.length === 1 ? 'material' : 'materials'}</span>
                <strong>Open module <ArrowUpRight size={14} /></strong>
              </Link>
              <div className="ds-module-workspace-actions">
                <button type="button" onClick={() => renameModule(module)} aria-label={`Rename ${module.title}`}><Pencil size={14} /> Rename</button>
                <button type="button" onClick={() => removeModule(module)} aria-label={`Delete ${module.title}`}><Trash2 size={14} /> Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ModuleDetailPage() {
  const { moduleId } = useParams();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');

  const loadModules = useCallback(async (signal) => {
    setLoadError('');
    try {
      setModules(await getDataScienceModules(signal));
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') setLoadError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadModules(controller.signal);
    return () => controller.abort();
  }, [loadModules]);

  const module = modules.find((item) => item.id === moduleId);
  const materials = module?.materials || [];

  function selectFile(event) {
    const chosenFile = event.target.files?.[0] || null;
    setFile(chosenFile);
    setTitle(chosenFile ? chosenFile.name.replace(/\.[^.]+$/, '') : '');
    setUploadError('');
    setMessage('');
    if (!chosenFile) return;
    const extension = chosenFile.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.has(extension)) {
      setUploadError('Choose a PPT, PPTX, PDF, DOC, DOCX, TXT, or IPYNB file.');
      setFile(null);
    } else if (chosenFile.size > MAX_FILE_SIZE) {
      setUploadError('Study materials must be 50 MB or smaller.');
      setFile(null);
    }
  }

  async function upload(event) {
    event.preventDefault();
    if (!module || !file) return;
    const form = event.currentTarget;
    if (title.trim().length < 2 || title.trim().length > 160) {
      setUploadError('Enter a material title between 2 and 160 characters.');
      return;
    }
    setBusy(true);
    setUploadError('');
    setMessage('');
    try {
      const uploaded = await uploadDataScienceMaterial(module.id, title.trim(), file);
      setFile(null);
      setTitle('');
      form.reset();
      setMessage(uploaded.previewError
        ? `File uploaded. ${uploaded.previewError}`
        : 'Study material uploaded successfully.');
      await loadModules();
    } catch (requestError) {
      setUploadError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="ds-workspace-page"><p className="academic-loading">Loading your module...</p></section>;
  if (loadError) return <section className="ds-workspace-page"><Link to="/modules/data-science" className="back-link"><ArrowLeft size={15} /> Back to Data Science</Link><p className="academic-message is-error" role="alert">{loadError}</p></section>;
  if (!module) return <section className="ds-workspace-page"><Link to="/modules/data-science" className="back-link"><ArrowLeft size={15} /> Back to Data Science</Link><p className="academic-message is-error" role="alert">This module was not found in your account.</p></section>;

  return (
    <section className="ds-workspace-page">
      <Link to="/modules/data-science" className="back-link"><ArrowLeft size={15} /> Back to Data Science modules</Link>
      <header className="ds-workspace-heading">
        <div><span className="ds-eyebrow">MODULE {String(module.number).padStart(2, '0')}</span><h1>{module.title}</h1><p>Add and arrange your own course files and notes in this module.</p></div>
        <button type="button" className="academic-button is-secondary" onClick={async () => {
          const titleValue = window.prompt('Module title', module.title);
          if (titleValue === null || !titleValue.trim() || titleValue.trim() === module.title) return;
          try {
            await updateDataScienceModule(module.id, titleValue.trim());
            setMessage('Module renamed.');
            await loadModules();
          } catch (requestError) {
            setUploadError(errorMessage(requestError));
          }
        }}><Pencil size={14} /> Rename Module</button>
      </header>

      <form className="ds-upload-panel" onSubmit={upload}>
        <div className="ds-upload-heading"><span className="ds-upload-icon"><Upload size={18} /></span><div><h2>Upload PPT / PDF / Study Material</h2><p>Files stay private to your signed-in student account. Maximum file size: 50 MB.</p></div></div>
        <div className="ds-upload-fields">
          <label><span>File title</span><input required minLength={2} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give this material a title" /></label>
          <label className="ds-upload-file"><span>Choose a file</span><input type="file" accept=".ppt,.pptx,.pdf,.doc,.docx,.txt,.ipynb" required onChange={selectFile} /><small>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'PPT, PPTX, PDF, DOC, DOCX, TXT, IPYNB'}</small></label>
          <button type="submit" className="academic-button" disabled={busy || !file}><Upload size={14} /> {busy ? 'Uploading...' : 'Upload Material'}</button>
        </div>
        {uploadError && <p className="academic-message is-error" role="alert">{uploadError}</p>}
        {message && <p className="academic-message" role="status">{message}</p>}
      </form>

      <section className="ds-study-materials">
        <div className="ds-study-heading"><div><span className="ds-eyebrow">YOUR FILES</span><h2>Study materials</h2></div><span>{materials.length} {materials.length === 1 ? 'file' : 'files'}</span></div>
        {materials.length ? (
          <div className="ds-study-grid">{materials.map((material) => (
            <StudyMaterialCard
              key={material.id}
              module={module}
              material={material}
              onChanged={async (notice) => { setMessage(notice); await loadModules(); }}
            />
          ))}</div>
        ) : (
          <div className="ds-materials-empty"><span><FileText size={23} /></span><h3>No study materials yet</h3><p>Upload your first PPT, PDF, or study file above. Nothing is added until you choose it.</p></div>
        )}
      </section>
    </section>
  );
}

export default function DataScienceWorkspacePage() {
  const { moduleId } = useParams();
  return moduleId ? <ModuleDetailPage /> : <ModuleListPage />;
}
