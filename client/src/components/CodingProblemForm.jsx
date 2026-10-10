import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const emptyProblem = {
  title: '',
  statement: '',
  language: 'PYTHON',
  topic: '',
  difficulty: 'MEDIUM',
  sourceUrl: '',
  solutionNotes: '',
};

export default function CodingProblemForm({ problem, onClose, onSave, saving }) {
  const [values, setValues] = useState(emptyProblem);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (problem) {
      setValues({
        title: problem.title,
        statement: problem.statement,
        language: problem.language,
        topic: problem.topic || '',
        difficulty: problem.difficulty,
        sourceUrl: problem.sourceUrl || '',
        solutionNotes: problem.solutionNotes || '',
      });
    }
  }, [problem]);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setFormError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (values.title.trim().length < 2 || !values.statement.trim()) {
      setFormError('Add a title and problem statement before saving.');
      return;
    }
    try {
      await onSave({
        ...values,
        title: values.title.trim(),
        statement: values.statement.trim(),
        topic: values.topic.trim() || null,
        sourceUrl: values.sourceUrl.trim() || null,
        solutionNotes: values.solutionNotes.trim() || null,
      });
    } catch (error) {
      setFormError(error);
    }
  }

  return (
    <div className="learning-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="learning-modal" role="dialog" aria-modal="true" aria-labelledby="coding-form-title">
        <header><div><span className="section-eyebrow">YOUR PRIVATE PRACTICE SET</span><h2 id="coding-form-title">{problem ? 'Edit problem' : 'Add a practice problem'}</h2></div><button type="button" onClick={onClose} aria-label="Close form"><X size={19} /></button></header>
        <form onSubmit={submit}>
          <label>Problem title<input required minLength="2" maxLength="160" value={values.title} onChange={(event) => update('title', event.target.value)} /></label>
          <div className="learning-form-row">
            <label>Language / topic<select value={values.language} onChange={(event) => update('language', event.target.value)}><option value="PYTHON">Python</option><option value="SQL">SQL</option><option value="JAVA">Java</option><option value="CPP">C++</option><option value="DSA">Data Structures & Algorithms</option></select></label>
            <label>Difficulty<select value={values.difficulty} onChange={(event) => update('difficulty', event.target.value)}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label>
          </div>
          <label>Topic (optional)<input maxLength="100" value={values.topic} onChange={(event) => update('topic', event.target.value)} placeholder="e.g. arrays, joins, recursion" /></label>
          <label>Problem statement<textarea required maxLength="8000" rows="5" value={values.statement} onChange={(event) => update('statement', event.target.value)} /></label>
          <label>Source link (optional)<input type="url" value={values.sourceUrl} onChange={(event) => update('sourceUrl', event.target.value)} placeholder="https://" /></label>
          <label>Solution notes<textarea maxLength="8000" rows="4" value={values.solutionNotes} onChange={(event) => update('solutionNotes', event.target.value)} placeholder="Keep your approach and learning notes here." /></label>
          {formError && <p className="academic-message is-error" role="alert">{formError}</p>}
          <footer><button type="button" className="learning-button is-secondary" onClick={onClose}>Cancel</button><button type="submit" className="learning-button" disabled={saving}>{saving ? 'Saving...' : problem ? 'Save changes' : 'Save problem'}</button></footer>
        </form>
      </section>
    </div>
  );
}
