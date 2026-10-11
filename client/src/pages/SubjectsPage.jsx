import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Plus, Search, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import SubjectCard from '../components/SubjectCard';
import SubjectForm from '../components/SubjectForm';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import EducationalCurriculum from '../components/EducationalCurriculum';

const searchSchema = z.object({ search: z.string().max(120) });

function responseMessage(error) {
  return error.response?.data?.message || 'The request could not be completed. Please try again.';
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [semester, setSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalSubject, setModalSubject] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const {
    register,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(searchSchema),
    defaultValues: { search: '' },
  });
  const search = watch('search');

  const loadSubjects = useCallback(async (signal) => {
    setLoading(true);
    setPageError('');
    try {
      const { data } = await api.get('/subjects', {
        params: { search: search.trim() || undefined, semester: semester || undefined },
        signal,
      });
      setSubjects(data.data.subjects);
    } catch (error) {
      if (error.name !== 'CanceledError') setPageError(responseMessage(error));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [search, semester]);

  useEffect(() => {
    const controller = new AbortController();
    loadSubjects(controller.signal);
    return () => controller.abort();
  }, [loadSubjects]);

  const semesterOptions = useMemo(
    () => [...new Set(subjects.map((subject) => subject.semester).filter(Boolean))].sort(),
    [subjects],
  );

  async function saveSubject(values) {
    setSaving(true);
    setPageError('');
    try {
      if (modalSubject) {
        const { data } = await api.patch(`/subjects/${modalSubject.id}`, values);
        setSubjects((current) => current.map((subject) => subject.id === data.data.subject.id ? data.data.subject : subject));
        setActionMessage('Subject updated.');
      } else {
        const { data } = await api.post('/subjects', values);
        setSubjects((current) => [...current, data.data.subject].sort((a, b) => (a.semester || '').localeCompare(b.semester || '') || a.name.localeCompare(b.name)));
        setActionMessage('Subject added.');
      }
      setModalOpen(false);
    } catch (error) {
      setPageError(responseMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubject(subject) {
    if (!window.confirm(`Delete "${subject.name}" and its saved resources? This cannot be undone.`)) return;
    setPageError('');
    try {
      await api.delete(`/subjects/${subject.id}`);
      setSubjects((current) => current.filter((item) => item.id !== subject.id));
      setActionMessage('Subject and its resources deleted.');
    } catch (error) {
      setPageError(responseMessage(error));
    }
  }

  async function addDemoSubjects() {
    setSaving(true);
    setPageError('');
    try {
      const { data } = await api.post('/subjects/demo');
      setSubjects(data.data.subjects);
      setActionMessage('Optional demo subjects added. Verify them against your official MBU syllabus.');
    } catch (error) {
      setPageError(responseMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const groupedSubjects = useMemo(() => {
    return subjects.reduce((groups, subject) => {
      const key = subject.semester || 'Semester not set';
      groups[key] = [...(groups[key] || []), subject];
      return groups;
    }, {});
  }, [subjects]);

  return (
    <section className="subjects-page">
      <header className="academic-page-heading">
        <span className="academic-title-icon"><BookOpen size={20} /></span>
        <div><span>YOUR LEARNING SPACE</span><h1>My Subjects</h1><p>{user.studentProfile?.program || 'Your program'}{user.studentProfile?.department ? ` · ${user.studentProfile.department}` : ''}</p></div>
        <button className="academic-button heading-action" type="button" onClick={() => { setModalSubject(null); setModalOpen(true); }}>
          <Plus size={17} /> Add subject
        </button>
      </header>

      <div className="subjects-note"><Sparkles size={17} /><p><strong>Use your verified course details.</strong> No official syllabus or faculty-approved material is preloaded. Resources and review progress are private to your account.</p></div>
      <EducationalCurriculum />

      <div className="subjects-toolbar">
        <label className="subjects-search"><Search size={17} /><input placeholder="Search subjects and course codes..." {...register('search')} aria-label="Search subjects" /></label>
        <select value={semester} onChange={(event) => setSemester(event.target.value)} aria-label="Filter by semester">
          <option value="">All semesters</option>
          {semesterOptions.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
        {errors.search && <small role="alert">{errors.search.message}</small>}
      </div>
      {pageError && <p className="academic-message is-error" role="alert">{pageError}</p>}
      {actionMessage && <p className="academic-message" role="status">{actionMessage}</p>}

      {loading ? <div className="academic-loading">Loading your subjects...</div> : subjects.length === 0 ? (
        <div className="subjects-empty">
          <span><BookOpen size={25} /></span>
          <h2>{search || semester ? 'No matching subjects' : 'Your subject list is ready'}</h2>
          <p>{search || semester ? 'Try a different search or semester filter.' : 'Add subjects you have verified. You can also add clearly marked placeholders to explore the layout.'}</p>
          {!search && !semester && <div><button className="academic-button" type="button" onClick={() => { setModalSubject(null); setModalOpen(true); }}><Plus size={16} /> Add a subject</button><button className="academic-button is-secondary" type="button" onClick={addDemoSubjects} disabled={saving}><Sparkles size={15} /> {saving ? 'Adding...' : 'Add optional demo subjects'}</button></div>}
        </div>
      ) : Object.entries(groupedSubjects).map(([groupName, group]) => (
        <section className="semester-group" key={groupName}>
          <div className="semester-heading"><h2>{groupName}</h2><span>{group.length} {group.length === 1 ? 'subject' : 'subjects'}</span></div>
          <div className="subject-card-grid">
            {group.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} onEdit={(item) => { setModalSubject(item); setModalOpen(true); }} onDelete={deleteSubject} />
            ))}
          </div>
        </section>
      ))}

      {subjects.length > 0 && <button className="add-demo-subjects" type="button" onClick={addDemoSubjects} disabled={saving}><Sparkles size={15} /> {saving ? 'Adding...' : 'Add optional demo placeholders'}</button>}
      {modalOpen && <SubjectForm subject={modalSubject} onClose={() => setModalOpen(false)} onSave={saveSubject} saving={saving} error={pageError} />}
    </section>
  );
}
