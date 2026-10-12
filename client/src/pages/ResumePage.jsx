import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Download, Eye, EyeOff, FileText, Printer, Save, Share2, Upload } from 'lucide-react';
import api from '../services/api';

const initialResume = {
  displayName: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  linkedInUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  skills: [],
  education: [],
  internships: [],
  achievements: [],
  isPublic: false,
  publicSections: [],
  publicSlug: '',
};
const publicSectionLabels = {
  summary: 'Professional summary',
  contact: 'Email, phone, and location',
  education: 'Education',
  skills: 'Technical skills',
  internships: 'Internships',
  achievements: 'Achievements',
  social: 'LinkedIn, GitHub, and portfolio links',
};

function optional(value) { return value?.trim() || null; }

export default function ResumePage() {
  const [resume, setResume] = useState(initialResume);
  const [projects, setProjects] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/portfolio/resume', { signal: controller.signal })
      .then(({ data }) => {
        setResume({ ...initialResume, ...data.data.resume });
        setProjects(data.data.projects);
        setCertificates(data.data.certificates);
      })
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') setError(requestError.response?.data?.message || 'Resume could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const publicUrl = useMemo(() => resume.publicSlug ? `${window.location.origin}/portfolio/${resume.publicSlug}` : '', [resume.publicSlug]);

  function set(field, value) { setResume((current) => ({ ...current, [field]: value })); }

  function updateEntry(field, index, key, value) {
    setResume((current) => ({
      ...current,
      [field]: current[field].map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry),
    }));
  }

  function addEntry(field, entry) { setResume((current) => ({ ...current, [field]: [...current[field], entry] })); }
  function removeEntry(field, index) { setResume((current) => ({ ...current, [field]: current[field].filter((_, i) => i !== index) })); }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        displayName: optional(resume.displayName),
        email: optional(resume.email),
        phone: optional(resume.phone),
        location: optional(resume.location),
        summary: resume.summary,
        linkedInUrl: optional(resume.linkedInUrl),
        githubUrl: optional(resume.githubUrl),
        portfolioUrl: optional(resume.portfolioUrl),
        skills: resume.skills.map((skill) => skill.trim()).filter(Boolean),
        education: resume.education,
        internships: resume.internships,
        achievements: resume.achievements.map((achievement) => achievement.trim()).filter(Boolean),
        isPublic: resume.isPublic,
        publicSections: resume.publicSections,
      };
      const { data } = await api.put('/portfolio/resume', payload);
      setResume((current) => ({ ...current, ...data.data.resume }));
      setMessage('Resume and privacy settings saved.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Resume could not be saved.');
    } finally { setSaving(false); }
  }

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage('Public portfolio link copied.');
    } catch {
      setError('Unable to copy automatically. Select and copy the public link.');
    }
  }

  async function uploadResumeFile(file) {
    setError('');
    setMessage('');
    if (!file) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Choose a PDF resume file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Resume PDF files must be 20 MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const { data } = await api.post('/portfolio/resume/file', formData);
      setResume((current) => ({ ...current, ...data.data.resume }));
      setMessage('Resume uploaded privately.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Resume could not be uploaded.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function accessResumeFile(download) {
    setError('');
    const resumeWindow = download ? null : window.open('about:blank', '_blank');
    if (!download && !resumeWindow) {
      setError('Allow pop-ups to open your resume.');
      return;
    }
    if (resumeWindow) resumeWindow.opener = null;
    try {
      const { data } = await api.get('/portfolio/resume/file', { responseType: 'blob' });
      const fileUrl = URL.createObjectURL(data);
      if (download) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = resume.fileName || 'resume.pdf';
        link.click();
      } else {
        resumeWindow.location.href = fileUrl;
      }
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
    } catch (requestError) {
      resumeWindow?.close();
      setError(requestError.response?.data?.message || 'Resume file could not be opened.');
    }
  }

  if (loading) return <div className="academic-loading">Loading your resume...</div>;

  return (
    <section className="portfolio-page resume-page">
      <header className="learning-page-heading resume-editor-heading">
        <span className="learning-title-icon"><FileText size={21} /></span>
        <div><span className="section-eyebrow">CAREER DEVELOPMENT</span><h1>My Resume</h1><p>Edit your job-ready resume. Student profile information is not published unless you choose it.</p></div>
        <button className="learning-button is-secondary" type="button" onClick={() => window.print()}><Printer size={15} /> Export / Print PDF</button>
      </header>
      <div className="resume-tools-note"><strong>ATS-friendly PDF:</strong> Choose “Save as PDF” in your browser’s print dialog. The printable document uses a simple, selectable-text layout without dashboard navigation or decorative columns.</div>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {message && <p className="academic-message" role="status">{message}</p>}
      <section className="learning-panel resume-file-panel" aria-labelledby="resume-file-heading">
        <div className="learning-panel-heading">
          <div><span className="section-eyebrow">PRIVATE FILE</span><h2 id="resume-file-heading">Uploaded resume</h2></div>
          <label className="learning-button is-secondary" htmlFor="resume-file-input">
            <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload PDF'}
          </label>
          <input
            ref={fileInputRef}
            id="resume-file-input"
            type="file"
            accept="application/pdf,.pdf"
            disabled={uploading}
            onChange={(event) => uploadResumeFile(event.target.files?.[0])}
          />
        </div>
        {resume.fileName
          ? <div className="resume-file-details"><span><FileText size={15} />{resume.fileName}</span><div><button type="button" className="learning-button is-secondary" onClick={() => accessResumeFile(false)}>Open</button><button type="button" className="learning-button is-secondary" onClick={() => accessResumeFile(true)}><Download size={14} /> Download</button></div></div>
          : <p className="learning-muted">No resume file uploaded. Choose a PDF (up to 20 MB); it will be stored privately.</p>}
      </section>

      <div className="resume-editor-grid">
        <form className="resume-editor" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <section className="learning-panel">
            <div className="learning-panel-heading"><div><span className="section-eyebrow">YOUR CONTACT DETAILS</span><h2>Personal details</h2></div></div>
            <div className="resume-field-grid">
              <label>Resume display name<input maxLength="120" value={resume.displayName || ''} onChange={(event) => set('displayName', event.target.value)} /></label>
              <label>Email<input type="email" maxLength="254" value={resume.email || ''} onChange={(event) => set('email', event.target.value)} /></label>
              <label>Phone<input maxLength="40" value={resume.phone || ''} onChange={(event) => set('phone', event.target.value)} /></label>
              <label>Location<input maxLength="160" value={resume.location || ''} onChange={(event) => set('location', event.target.value)} placeholder="City, Country" /></label>
            </div>
            <label className="resume-editor-label">Professional summary<textarea rows="4" maxLength="3000" value={resume.summary} onChange={(event) => set('summary', event.target.value)} placeholder="A concise, evidence-based summary of your skills and direction." /></label>
          </section>

          <section className="learning-panel">
            <div className="learning-panel-heading"><div><span className="section-eyebrow">ACADEMIC BACKGROUND</span><h2>Education</h2></div><button className="learning-button is-secondary" type="button" onClick={() => addEntry('education', { institution: '', qualification: '', field: '', startYear: '', endYear: '', details: '' })}>+ Add</button></div>
            {resume.education.map((entry, index) => <div className="resume-entry-editor" key={`education-${index}`}>
              <button type="button" className="resume-remove-entry" aria-label={`Remove education ${index + 1}`} onClick={() => removeEntry('education', index)}>×</button>
              <label>Institution<input maxLength="180" value={entry.institution || ''} onChange={(event) => updateEntry('education', index, 'institution', event.target.value)} /></label>
              <div className="resume-field-grid"><label>Qualification<input maxLength="160" value={entry.qualification || ''} onChange={(event) => updateEntry('education', index, 'qualification', event.target.value)} /></label><label>Field of study<input maxLength="160" value={entry.field || ''} onChange={(event) => updateEntry('education', index, 'field', event.target.value)} /></label><label>Start year<input maxLength="20" value={entry.startYear || ''} onChange={(event) => updateEntry('education', index, 'startYear', event.target.value)} /></label><label>End year<input maxLength="20" value={entry.endYear || ''} onChange={(event) => updateEntry('education', index, 'endYear', event.target.value)} /></label></div>
              <label>Details<input maxLength="1000" value={entry.details || ''} onChange={(event) => updateEntry('education', index, 'details', event.target.value)} /></label>
            </div>)}
            {resume.education.length === 0 && <p className="learning-muted">Add your verified education details; none are prefilled as official records.</p>}
          </section>

          <section className="learning-panel">
            <div className="learning-panel-heading"><div><span className="section-eyebrow">SKILLS YOU CAN DISCUSS</span><h2>Technical skills</h2></div></div>
            <label className="resume-editor-label">Skills, comma separated<input value={resume.skills.join(', ')} onChange={(event) => set('skills', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="Python, SQL, pandas" /></label>
          </section>

          <section className="learning-panel">
            <div className="learning-panel-heading"><div><span className="section-eyebrow">EXPERIENCE</span><h2>Internships</h2></div><button className="learning-button is-secondary" type="button" onClick={() => addEntry('internships', { organization: '', role: '', startDate: '', endDate: '', description: '' })}>+ Add</button></div>
            {resume.internships.map((entry, index) => <div className="resume-entry-editor" key={`internship-${index}`}>
              <button type="button" className="resume-remove-entry" aria-label={`Remove internship ${index + 1}`} onClick={() => removeEntry('internships', index)}>×</button>
              <div className="resume-field-grid"><label>Organization<input maxLength="160" value={entry.organization || ''} onChange={(event) => updateEntry('internships', index, 'organization', event.target.value)} /></label><label>Role<input maxLength="160" value={entry.role || ''} onChange={(event) => updateEntry('internships', index, 'role', event.target.value)} /></label><label>Start date<input maxLength="30" value={entry.startDate || ''} onChange={(event) => updateEntry('internships', index, 'startDate', event.target.value)} /></label><label>End date<input maxLength="30" value={entry.endDate || ''} onChange={(event) => updateEntry('internships', index, 'endDate', event.target.value)} /></label></div>
              <label>Description<textarea rows="3" maxLength="1500" value={entry.description || ''} onChange={(event) => updateEntry('internships', index, 'description', event.target.value)} /></label>
            </div>)}
            {resume.internships.length === 0 && <p className="learning-muted">Add internship experience when applicable.</p>}
          </section>

          <section className="learning-panel">
            <div className="learning-panel-heading"><div><span className="section-eyebrow">RECOGNITION</span><h2>Achievements</h2></div><button className="learning-button is-secondary" type="button" onClick={() => set('achievements', [...resume.achievements, ''])}>+ Add</button></div>
            {resume.achievements.map((item, index) => <div className="resume-achievement-editor" key={`achievement-${index}`}><input maxLength="500" aria-label={`Achievement ${index + 1}`} value={item} onChange={(event) => set('achievements', resume.achievements.map((current, i) => i === index ? event.target.value : current))} /><button type="button" aria-label={`Remove achievement ${index + 1}`} onClick={() => removeEntry('achievements', index)}>×</button></div>)}
            {resume.achievements.length === 0 && <p className="learning-muted">Add achievements you can substantiate.</p>}
          </section>

          <section className="learning-panel">
            <div className="learning-panel-heading"><div><span className="section-eyebrow">SOCIAL PROFILES</span><h2>Profile links</h2></div></div>
            <div className="resume-field-grid">
              <label>LinkedIn<input type="url" value={resume.linkedInUrl || ''} onChange={(event) => set('linkedInUrl', event.target.value)} placeholder="https://" /></label>
              <label>GitHub<input type="url" value={resume.githubUrl || ''} onChange={(event) => set('githubUrl', event.target.value)} placeholder="https://" /></label>
              <label>Portfolio<input type="url" value={resume.portfolioUrl || ''} onChange={(event) => set('portfolioUrl', event.target.value)} placeholder="https://" /></label>
            </div>
          </section>

          <section className="learning-panel resume-visibility">
            <div className="learning-panel-heading"><div><span className="section-eyebrow">PUBLIC PORTFOLIO</span><h2>Privacy & sharing</h2></div>{resume.isPublic ? <Eye size={17} /> : <EyeOff size={17} />}</div>
            <label className="portfolio-checkbox"><input type="checkbox" checked={resume.isPublic} onChange={(event) => set('isPublic', event.target.checked)} /> Enable my public portfolio page</label>
            <p className="learning-muted">Only resume sections you select, projects you mark public, and certificates you mark public appear on your shareable page. Career applications and private files remain private.</p>
            <div className="resume-public-section-list">{Object.entries(publicSectionLabels).map(([key, label]) => <label className="portfolio-checkbox" key={key}><input type="checkbox" checked={resume.publicSections.includes(key)} onChange={(event) => set('publicSections', event.target.checked ? [...new Set([...resume.publicSections, key])] : resume.publicSections.filter((section) => section !== key))} /> Show {label}</label>)}</div>
            {resume.publicSlug && <div className="resume-share-link"><input aria-label="Public portfolio URL" readOnly value={publicUrl} /><button type="button" className="learning-button is-secondary" onClick={copyPublicLink}><Share2 size={14} /> Copy link</button></div>}
          </section>
          <button className="learning-button resume-save-button" type="submit" disabled={saving}><Save size={15} /> {saving ? 'Saving...' : 'Save resume & privacy choices'}</button>
        </form>

        <aside className="resume-preview-column">
          <article className="resume-paper">
            <h1>{resume.displayName || 'Your Name'}</h1>
            <div className="resume-paper-contact">{[resume.email, resume.phone, resume.location, resume.linkedInUrl, resume.githubUrl, resume.portfolioUrl].filter(Boolean).join(' | ') || 'Add your contact details and profile links'}</div>
            {resume.summary && <section><h2>Professional Summary</h2><p>{resume.summary}</p></section>}
            {resume.education.length > 0 && <section><h2>Education</h2>{resume.education.map((entry, index) => <div key={`preview-education-${index}`}><h3>{entry.qualification || 'Education'}{entry.field ? `, ${entry.field}` : ''}</h3><p>{entry.institution}{entry.startYear || entry.endYear ? ` | ${entry.startYear || ''} - ${entry.endYear || ''}` : ''}</p>{entry.details && <p>{entry.details}</p>}</div>)}</section>}
            {resume.skills.length > 0 && <section><h2>Technical Skills</h2><p>{resume.skills.join(' | ')}</p></section>}
            {projects.length > 0 && <section><h2>Projects</h2>{projects.map((project) => <div key={project.id}><h3>{project.title}</h3>{project.description && <p>{project.description}</p>}{project.techStack.length > 0 && <p><strong>Technologies:</strong> {project.techStack.join(', ')}</p>}{project.repositoryUrl && <p>{project.repositoryUrl}</p>}</div>)}</section>}
            {resume.internships.length > 0 && <section><h2>Experience</h2>{resume.internships.map((entry, index) => <div key={`preview-internship-${index}`}><h3>{entry.role || 'Intern'}{entry.organization ? ` | ${entry.organization}` : ''}</h3><p>{entry.startDate || ''}{entry.endDate ? ` - ${entry.endDate}` : ''}</p>{entry.description && <p>{entry.description}</p>}</div>)}</section>}
            {certificates.length > 0 && <section><h2>Certifications</h2>{certificates.map((certificate) => <p key={certificate.id}>{certificate.title}{certificate.issuer ? ` | ${certificate.issuer}` : ''}{certificate.issuedAt ? ` | ${new Date(certificate.issuedAt).toLocaleDateString()}` : ''}</p>)}</section>}
            {resume.achievements.filter(Boolean).length > 0 && <section><h2>Achievements</h2><ul>{resume.achievements.filter(Boolean).map((achievement, index) => <li key={`preview-achievement-${index}`}>{achievement}</li>)}</ul></section>}
          </article>
          <p className="learning-muted resume-preview-caption">Live resume preview · Based on your saved personal records</p>
          <button className="learning-button is-secondary resume-print-side-button" type="button" onClick={() => window.print()}><Printer size={15} /> Export / Print PDF <ArrowUpRight size={13} /></button>
        </aside>
      </div>
    </section>
  );
}
