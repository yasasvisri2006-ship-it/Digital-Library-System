import { ArrowUpRight, Download, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function CodeBlock({ children }) {
  return <pre className="solution-notes"><code>{children}</code></pre>;
}

function MaterialContent({ material }) {
  const { content = {} } = material;
  if (Array.isArray(content.modules)) {
    return <div className="education-module-list">{content.modules.map((module, index) => (
      <details key={`${module.title}-${index}`}>
        <summary>Module {String(index + 1).padStart(2, '0')} · {module.title}</summary>
        <p>{module.notes}</p>
        {module.example && <CodeBlock>{module.example}</CodeBlock>}
        {module.questions?.length > 0 && <ul>{module.questions.map((question) => <li key={question}>{question}</li>)}</ul>}
      </details>
    ))}</div>;
  }
  if (content.aim || content.algorithm) {
    return (
      <div className="education-detail">
        {content.aim && <p><strong>Aim:</strong> {content.aim}</p>}
        {content.algorithm?.length > 0 && <><strong>Algorithm</strong><ol>{content.algorithm.map((step) => <li key={step}>{step}</li>)}</ol></>}
        {content.code && <><strong>Code</strong><CodeBlock>{content.code}</CodeBlock></>}
        {content.output && <><strong>Sample output</strong><CodeBlock>{content.output}</CodeBlock></>}
        {content.result && <p><strong>Result:</strong> {content.result}</p>}
        {content.viva?.length > 0 && <><strong>Viva questions</strong><ul>{content.viva.map((question) => <li key={question}>{question}</li>)}</ul></>}
      </div>
    );
  }
  if (content.notes && content.questions) {
    return <div className="education-detail">
      <p>{content.notes}</p>
      {content.example && <><strong>Worked example</strong><CodeBlock>{content.example}</CodeBlock></>}
      <strong>Important questions</strong>
      <ul>{content.questions.map((question) => <li key={question}>{question}</li>)}</ul>
    </div>;
  }
  if (content.solution || content.practiceNote) {
    return <div className="education-detail">
      <p><strong>Try it first:</strong> solve the problem and add boundary tests before opening the explanation.</p>
      <details><summary>Show explanation and solution approach</summary><p>{content.solution}</p></details>
    </div>;
  }
  if (content.tasks || content.evaluation) {
    return <div className="education-detail">
      {content.dataset && <p><strong>Dataset:</strong> {content.dataset}</p>}
      {content.tasks?.length > 0 && <><strong>Practice tasks</strong><ol>{content.tasks.map((task) => <li key={task}>{task}</li>)}</ol></>}
      {content.evaluation?.length > 0 && <><strong>Self-evaluation checklist</strong><ul>{content.evaluation.map((item) => <li key={item}>{item}</li>)}</ul></>}
    </div>;
  }
  if (content.weeks || content.checklist) {
    return <div className="education-detail">
      {content.weeks?.length > 0 && <><strong>Suggested study plan</strong><ol>{content.weeks.map((week) => <li key={week}>{week}</li>)}</ol></>}
      {content.checklist?.length > 0 && <><strong>Revision checklist</strong><ul>{content.checklist.map((item) => <li key={item}>{item}</li>)}</ul></>}
    </div>;
  }
  if (content.questions || content.answers) {
    return <div className="education-detail">
      <ol>{content.questions?.map((question, index) => <li key={question}>{question}
        {content.answers?.[index] && <details><summary>Check answer</summary><p>{content.answers[index]}</p></details>}
      </li>)}</ol>
    </div>;
  }
  if (content.example) return <div className="education-detail"><CodeBlock>{content.example}</CodeBlock></div>;
  if (content.citation) return <p className="education-citation">{content.citation}</p>;
  if (content.practice) return <div className="education-detail"><p>{content.practice}</p></div>;
  return null;
}

export function EducationalMaterialCard({ material, showSection = false, compact = false }) {
  const [downloadError, setDownloadError] = useState('');

  async function downloadFile() {
    setDownloadError('');
    try {
      const { data } = await api.get(material.fileUrl, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = material.fileName || material.title;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setDownloadError(error.response?.status === 401 || error.response?.status === 403
        ? 'Sign in with your student account to download this file.'
        : 'The download failed. Please try again.');
    }
  }

  return (
    <article className="learning-panel education-material-card">
      <div className="learning-panel-heading">
        <div>
          <span className="section-eyebrow">{showSection ? material.section.replaceAll('-', ' ') : material.category || 'LEARNING RESOURCE'}</span>
          <h2>{material.title}</h2>
        </div>
        {material.moduleNumber && <span className="coding-language-tag">MODULE {String(material.moduleNumber).padStart(2, '0')}</span>}
      </div>
      {material.subjectName && <p className="education-subject">{material.subjectName}{material.semester ? ` · ${material.semester}` : ''}</p>}
      <p className="education-description">{material.description}</p>
      {!compact && <MaterialContent material={material} />}
      <div className="education-actions">
        {material.fileUrl && <button className="learning-button is-secondary" type="button" onClick={downloadFile}><Download size={14} /> Download {material.fileName?.split('.').pop()?.toUpperCase()}</button>}
        {material.sourceUrl && <a className="learning-external-link" href={material.sourceUrl} target="_blank" rel="noreferrer">Open source documentation <ExternalLink size={13} /></a>}
        {material.subjectName && <Link className="learning-external-link" to="/study-materials">Related study materials <ArrowUpRight size={13} /></Link>}
      </div>
      {downloadError && <p className="academic-message is-error" role="alert">{downloadError}</p>}
    </article>
  );
}

export function EducationalMaterialGrid({ materials, showSection = false }) {
  return <div className="education-material-grid">{materials.map((material) => (
    <EducationalMaterialCard key={material.slug} material={material} showSection={showSection} />
  ))}</div>;
}
