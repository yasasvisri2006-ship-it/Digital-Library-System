import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Bookmark, Check, Circle, Code2, Filter, Pencil, Play, Plus, Search, Trash2, Trophy } from 'lucide-react';
import CodingProblemForm from '../components/CodingProblemForm';
import api from '../services/api';
import EducationalCatalogFeed from '../components/EducationalCatalogFeed';
import { useAuth } from '../context/AuthContext';

const languageLabels = {
  PYTHON: 'Python',
  SQL: 'SQL',
  JAVA: 'Java',
  CPP: 'C++',
  DSA: 'Data Structures & Algorithms',
};
const difficultyLabels = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

function responseMessage(error) {
  return error.response?.data?.message || 'The request could not be completed. Please try again.';
}

function activityLabel(type) {
  return ({
    CREATED: 'Added a practice problem',
    UPDATED: 'Updated a practice problem',
    DELETED: 'Removed a practice problem',
    COMPLETED: 'Marked a problem complete',
    REOPENED: 'Reopened a problem',
    BOOKMARKED: 'Bookmarked a problem',
    UNBOOKMARKED: 'Removed a bookmark',
    NOTE_UPDATED: 'Updated solution notes',
  })[type] || 'Updated practice activity';
}

export default function CodingPracticePage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [progress, setProgress] = useState({ totalCount: 0, completedCount: 0, bookmarkedCount: 0, completionPercent: 0 });
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState({ search: '', language: '', difficulty: '', status: 'all' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editorCode, setEditorCode] = useState('');
  const [editorOutput, setEditorOutput] = useState('');

  const load = useCallback(async (signal) => {
    if (!user) {
      setProblems([]);
      setHistory([]);
      setProgress({ totalCount: 0, completedCount: 0, bookmarkedCount: 0, completionPercent: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    setPageError('');
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const [codingResponse, historyResponse] = await Promise.all([
        api.get('/learning/coding/problems', { params, signal }),
        api.get('/learning/coding/history', { signal }),
      ]);
      setProblems(codingResponse.data.data.problems);
      setProgress(codingResponse.data.data.progress);
      setHistory(historyResponse.data.data.history);
    } catch (error) {
      if (error.name !== 'CanceledError') setPageError(responseMessage(error));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const completionText = useMemo(() => `${progress.completedCount} of ${progress.totalCount} completed`, [progress]);

  function runEditorCode() {
    setEditorOutput('Code was not run. A secure, isolated Python sandbox service is not configured for this application.');
  }

  async function saveProblem(values) {
    setSaving(true);
    setPageError('');
    try {
      if (editing) await api.patch(`/learning/coding/problems/${editing.id}`, values);
      else await api.post('/learning/coding/problems', values);
      setMessage(editing ? 'Problem updated.' : 'Problem saved.');
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (error) {
      throw responseMessage(error);
    } finally {
      setSaving(false);
    }
  }

  async function updateProblem(problem, changes) {
    setPageError('');
    try {
      await api.patch(`/learning/coding/problems/${problem.id}`, changes);
      setMessage('Practice progress saved.');
      await load();
    } catch (error) {
      setPageError(responseMessage(error));
    }
  }

  async function deleteProblem(problem) {
    if (!window.confirm(`Delete "${problem.title}"? Its activity history will remain without its statement.`)) return;
    setPageError('');
    try {
      await api.delete(`/learning/coding/problems/${problem.id}`);
      setMessage('Problem deleted.');
      await load();
    } catch (error) {
      setPageError(responseMessage(error));
    }
  }

  return (
    <section className="learning-page">
      <header className="learning-page-heading">
        <span className="learning-title-icon"><Code2 size={21} /></span>
        <div><span className="section-eyebrow">BUILD A STEADY HABIT</span><h1>Coding Practice</h1><p>Keep problem statements, solution notes, bookmarks, and completed work together.</p></div>
        {user && <button className="learning-button learning-heading-action" type="button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={17} /> Add problem</button>}
      </header>

      <div className="learning-disclaimer"><Code2 size={17} /><p><strong>Practice tracker only.</strong> This portal does not execute code or connect to an external compiler. Use a trusted local or sandboxed environment for code execution; never run untrusted code on an application server.</p></div>
      <section className="learning-panel code-playground" aria-labelledby="code-playground-heading">
        <div className="learning-panel-heading">
          <div><span className="section-eyebrow">SAFE PRACTICE EDITOR</span><h2 id="code-playground-heading">Python code editor</h2></div>
          <label className="code-language-select">Language
            <select aria-label="Editor language" defaultValue="python"><option value="python">Python</option></select>
          </label>
        </div>
        <label className="code-editor-label" htmlFor="practice-code">Your code</label>
        <textarea
          id="practice-code"
          aria-label="Python code editor"
          className="code-editor-input"
          value={editorCode}
          onChange={(event) => setEditorCode(event.target.value)}
          placeholder={'print("Hello, World!")'}
          spellCheck="false"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
        <div className="code-editor-actions">
          <button className="learning-button" type="button" onClick={runEditorCode}><Play size={14} /> Run Code</button>
          <button className="learning-button is-secondary" type="button" onClick={() => setEditorOutput('')}>Clear Output</button>
        </div>
        <div className="code-output-panel" aria-live="polite">
          <strong>Output</strong>
          <pre>{editorOutput || 'Output will appear here. Configure an isolated Python sandbox service with CPU/memory/time limits and no access to application secrets, private files, or internal network.'}</pre>
        </div>
      </section>
      <EducationalCatalogFeed section="coding-practice" title="Guided problem bank" description="Beginner-to-intermediate Python, C, C++, Java, SQL, data-structure, and algorithm problems with solution explanations." />
      {user && <>
      {pageError && <p className="academic-message is-error" role="alert">{pageError}</p>}
      {message && <p className="academic-message" role="status">{message}</p>}

      <div className="learning-stat-grid">
        <article><span>PROBLEMS SAVED</span><strong>{progress.totalCount}</strong><small>Personal practice list</small></article>
        <article><span>COMPLETED</span><strong>{progress.completionPercent}%</strong><small>{completionText}</small></article>
        <article><span>BOOKMARKED</span><strong>{progress.bookmarkedCount}</strong><small>Ready for another review</small></article>
      </div>

      <div className="learning-toolbar">
        <label className="learning-search"><Search size={16} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search your problems..." aria-label="Search problems" /></label>
        <select aria-label="Filter by language" value={filters.language} onChange={(event) => setFilters((current) => ({ ...current, language: event.target.value }))}><option value="">All languages</option>{Object.entries(languageLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
        <select aria-label="Filter by difficulty" value={filters.difficulty} onChange={(event) => setFilters((current) => ({ ...current, difficulty: event.target.value }))}><option value="">All difficulties</option>{Object.entries(difficultyLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
        <select aria-label="Filter by status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="all">All progress</option><option value="incomplete">In progress</option><option value="completed">Completed</option><option value="bookmarked">Bookmarked</option></select>
      </div>

      <div className="learning-content-grid">
        <section className="learning-panel">
          <div className="learning-panel-heading"><div><span className="section-eyebrow">YOUR QUESTION BANK</span><h2>Practice problems <small>{problems.length}</small></h2></div><Filter size={17} /></div>
          {loading ? <div className="academic-loading">Loading your practice list...</div> : problems.length === 0 ? (
            <div className="learning-empty"><span><Code2 size={25} /></span><h3>{filters.search || filters.language || filters.difficulty || filters.status !== 'all' ? 'No matching problems' : 'Start your personal practice list'}</h3><p>{filters.search || filters.language || filters.difficulty || filters.status !== 'all' ? 'Try another filter, or add a problem statement of your own.' : 'Save questions you are studying in Python, SQL, Java, C++, or Data Structures and Algorithms.'}</p><button className="learning-button is-secondary" type="button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={15} /> Add a problem</button></div>
          ) : (
            <div className="coding-problem-list">{problems.map((problem) => (
              <article className={`coding-problem-card${problem.isCompleted ? ' is-completed' : ''}`} key={problem.id}>
                <div className="coding-problem-top"><span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>{difficultyLabels[problem.difficulty]}</span><span className="coding-language-tag">{languageLabels[problem.language]}</span>{problem.topic && <span className="coding-language-tag">{problem.topic}</span>}<div className="coding-problem-actions">
                  <button type="button" aria-label={problem.isBookmarked ? `Remove bookmark from ${problem.title}` : `Bookmark ${problem.title}`} aria-pressed={problem.isBookmarked} onClick={() => updateProblem(problem, { isBookmarked: !problem.isBookmarked })}><Bookmark size={16} fill={problem.isBookmarked ? 'currentColor' : 'none'} /></button>
                  <button type="button" aria-label={`Edit ${problem.title}`} onClick={() => { setEditing(problem); setFormOpen(true); }}><Pencil size={14} /></button>
                  <button type="button" aria-label={`Delete ${problem.title}`} onClick={() => deleteProblem(problem)}><Trash2 size={15} /></button>
                </div></div>
                <h3>{problem.title}</h3><p className="coding-problem-statement">{problem.statement}</p>
                {problem.solutionNotes && <div className="solution-notes"><strong>Solution notes</strong><p>{problem.solutionNotes}</p></div>}
                {problem.sourceUrl && <a className="learning-external-link" href={problem.sourceUrl} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14} /></a>}
                <button className={`coding-complete-toggle${problem.isCompleted ? ' is-done' : ''}`} type="button" onClick={() => updateProblem(problem, { isCompleted: !problem.isCompleted })}>{problem.isCompleted ? <Check size={15} /> : <Circle size={15} />}{problem.isCompleted ? 'Completed' : 'Mark complete'}</button>
              </article>
            ))}</div>
          )}
        </section>

        <aside className="learning-panel coding-history-panel">
          <div className="learning-panel-heading"><div><span className="section-eyebrow">YOUR RECENT ACTIVITY</span><h2>Practice history</h2></div><Trophy size={17} /></div>
          {history.length === 0 ? <p className="learning-muted">Updates to your saved problems will appear here.</p> : <ol className="coding-history-list">{history.map((event) => <li key={event.id}><span className="history-dot" /><div><strong>{event.problemTitle}</strong><small>{activityLabel(event.eventType)}</small><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleDateString()}</time></div></li>)}</ol>}
        </aside>
      </div>
      {formOpen && <CodingProblemForm problem={editing} onClose={() => setFormOpen(false)} onSave={saveProblem} saving={saving} />}
      </>}
    </section>
  );
}
