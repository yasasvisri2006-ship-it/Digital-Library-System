import { ArrowLeft, ArrowUpRight, BookOpen, Download, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { dataScienceModules } from '../data/dataScienceModules';

function ModuleListPage() {
  return (
    <section className="ds-workspace-page">
      <Link to="/modules" className="back-link"><ArrowLeft size={15} /> Back to Modules</Link>
      <header className="ds-workspace-heading">
        <div>
          <span className="ds-eyebrow">PUBLIC STUDY LIBRARY</span>
          <h1>Data Science</h1>
          <p>Open a module to view and download its presentations.</p>
        </div>
      </header>
      <div className="ds-workspace-grid">
        {dataScienceModules.map((module) => (
          <article key={module.id} className="ds-module-workspace-card">
            <Link to={`/modules/data-science/${module.id}`} className="ds-module-workspace-open">
              <span className="ds-workspace-module-number">MODULE {String(module.number).padStart(2, '0')}</span>
              <BookOpen size={25} />
              <h2>{module.title}</h2>
              <span>{module.materials.length} {module.materials.length === 1 ? 'presentation' : 'presentations'}</span>
              <strong>Open module <ArrowUpRight size={14} /></strong>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function PresentationCard({ material }) {
  return (
    <article className="ds-study-card">
      <a
        className="ds-document-cover-link"
        href={material.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${material.title}`}
      >
        <span className="ds-document-cover">
          <span className="ds-cover-mark"><FileText size={24} /></span>
          <span className="ds-cover-kind">{material.fileType} · PRESENTATION</span>
          <strong>{material.title}</strong>
          <span className="ds-cover-file">{material.originalFileName}</span>
        </span>
      </a>
      <div className="ds-study-card-info">
        <div className="ds-study-card-heading">
          <div>
            <span className="section-eyebrow">{material.fileType} · Module presentation</span>
            <h3>{material.title}</h3>
          </div>
        </div>
        <p className="ds-original-name">{material.originalFileName}</p>
        <div className="ds-study-card-actions">
          <a className="academic-button" href={material.url} target="_blank" rel="noreferrer">
            <BookOpen size={14} /> Open PPT
          </a>
          <a className="academic-button is-secondary" href={material.url} download={material.originalFileName}>
            <Download size={14} /> Download
          </a>
        </div>
      </div>
    </article>
  );
}

function ModuleDetailPage({ module }) {
  return (
    <section className="ds-workspace-page">
      <Link to="/modules/data-science" className="back-link"><ArrowLeft size={15} /> Back to Data Science modules</Link>
      <header className="ds-workspace-heading">
        <div>
          <span className="ds-eyebrow">MODULE {String(module.number).padStart(2, '0')}</span>
          <h1>{module.title}</h1>
          <p>Open or download the presentations for this module.</p>
        </div>
      </header>

      <section className="ds-study-materials">
        <div className="ds-study-heading">
          <div><span className="ds-eyebrow">STUDY LIBRARY</span><h2>Presentations</h2></div>
          <span>{module.materials.length} {module.materials.length === 1 ? 'file' : 'files'}</span>
        </div>
        {module.materials.length > 0 ? (
          <div className="ds-study-grid">
            {module.materials.map((material) => <PresentationCard key={material.id} material={material} />)}
          </div>
        ) : (
          <div className="ds-materials-empty">
            <span><FileText size={23} /></span>
            <h3>No presentations added yet</h3>
            <p>Presentations added to this module will appear here.</p>
          </div>
        )}
      </section>
    </section>
  );
}

export default function DataScienceWorkspacePage() {
  const { moduleId } = useParams();
  if (!moduleId) return <ModuleListPage />;

  const module = dataScienceModules.find((item) => item.id === moduleId);
  if (!module) {
    return (
      <section className="ds-workspace-page">
        <Link to="/modules/data-science" className="back-link"><ArrowLeft size={15} /> Back to Data Science modules</Link>
        <div className="ds-materials-empty">
          <span><FileText size={23} /></span>
          <h3>Module not found</h3>
          <p>Choose one of the five Data Science modules.</p>
        </div>
      </section>
    );
  }

  return <ModuleDetailPage module={module} />;
}
