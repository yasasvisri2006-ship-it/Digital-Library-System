import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, Pencil, Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import api from '../services/api';

const emptyDraft = {
  studentId: '',
  name: '',
  email: '',
  department: '',
  branch: '',
  year: '',
  semester: '',
  section: '',
  password: '',
  phone: '',
};
const pageSize = 12;
const errorMessage = (error) => error.response?.data?.message || 'The student account request could not be completed.';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageCount: 0, total: 0 });
  const [draft, setDraft] = useState(emptyDraft);
  const [photo, setPhoto] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [resetTarget, setResetTarget] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/users/', {
        params: {
          search: search.trim() || undefined,
          department: department || undefined,
          status,
          page,
          pageSize,
        },
        signal,
      });
      setUsers(data.data.users);
      setDepartments(data.data.departments);
      setPagination(data.data.pagination);
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') setError(errorMessage(requestError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [search, department, status, page]);

  useEffect(() => {
    const controller = new AbortController();
    loadUsers(controller.signal);
    return () => controller.abort();
  }, [loadUsers]);

  function setField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function clearForm() {
    setDraft(emptyDraft);
    setPhoto(null);
    setEditingUser(null);
  }

  function editUser(user) {
    const profile = user.studentProfile || {};
    setEditingUser(user);
    setCreatedCredentials(null);
    setDraft({
      studentId: profile.studentId || '',
      name: user.name,
      email: user.email,
      department: profile.department || '',
      branch: profile.branch || '',
      year: profile.year || '',
      semester: profile.semester || '',
      section: profile.section || '',
      password: '',
      phone: profile.phone || '',
    });
    setPhoto(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveStudent(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingUser) {
        const { password, ...changes } = draft;
        await api.patch(`/admin/users/${editingUser.id}`, changes);
        if (photo) {
          const formData = new FormData();
          formData.append('photo', photo);
          await api.patch(`/admin/users/${editingUser.id}/photo`, formData);
        }
        setMessage('Student account details updated.');
        clearForm();
      } else {
        const payload = { ...draft };
        if (photo) {
          const formData = new FormData();
          Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
          formData.append('photo', photo);
          await api.post('/admin/users', formData);
        } else {
          await api.post('/admin/users', payload);
        }
        setCreatedCredentials({ studentId: draft.studentId, email: draft.email, password: draft.password });
        setMessage('Student account created. Share these credentials directly with the student through a secure channel.');
        clearForm();
      }
      await loadUsers();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user) {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${user.name}'s account?`)) return;
    setError('');
    setMessage('');
    try {
      await api.patch(`/admin/users/${user.id}/status`, { isActive: !user.isActive });
      setMessage(`Student account ${user.isActive ? 'deactivated' : 'activated'}.`);
      await loadUsers();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function submitPasswordReset(event) {
    event.preventDefault();
    if (!resetTarget) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.patch(`/admin/users/${resetTarget}/password`, { password: resetPasswordValue });
      const resetUser = users.find((user) => user.id === resetTarget);
      if (resetUser) setCreatedCredentials({
        studentId: resetUser.studentProfile?.studentId || '',
        email: resetUser.email,
        password: resetPasswordValue,
      });
      setMessage('Password reset and all existing student sessions revoked. Share the new password through a secure channel.');
      setResetTarget('');
      setResetPasswordValue('');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-users-page">
      <header className="learning-page-heading">
        <span className="learning-title-icon"><Users size={21} /></span>
        <div><span className="section-eyebrow">ADMINISTRATOR WORKSPACE</span><h1>Users Management</h1><p>Create student accounts, maintain their academic details, and control account access.</p></div>
        <span className="library-count-pill">{pagination.total} students</span>
      </header>

      <div className="learning-disclaimer"><ShieldCheck size={17} /><p>Student accounts are created with the STUDENT role. Passwords are hashed on the server and never included in account responses.</p></div>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {message && <p className="academic-message" role="status">{message}</p>}

      {createdCredentials && <section className="admin-credential-notice" aria-label="New student login credentials">
        <div><strong>Provide the student’s login credentials securely</strong><p>These are shown only in this administrator session. Do not share them over a public channel.</p></div>
        <dl><div><dt>Student ID</dt><dd>{createdCredentials.studentId}</dd></div><div><dt>Email</dt><dd>{createdCredentials.email}</dd></div><div><dt>Initial password</dt><dd><code>{createdCredentials.password}</code></dd></div></dl>
        <button type="button" className="learning-button is-secondary" onClick={() => setCreatedCredentials(null)}>Dismiss credentials</button>
      </section>}

      <section className="learning-panel admin-user-form-panel">
        <div className="learning-panel-heading"><div><span className="section-eyebrow">{editingUser ? 'EDIT ACCOUNT' : 'NEW STUDENT ACCOUNT'}</span><h2>{editingUser ? `Edit ${editingUser.name}` : 'Create student account'}</h2></div>{editingUser && <button className="learning-button is-secondary" type="button" onClick={clearForm}>Cancel edit</button>}</div>
        <form className="library-admin-form" onSubmit={saveStudent}>
          <div className="admin-user-form-grid">
            <label>Student ID<input required maxLength="40" value={draft.studentId} onChange={(event) => setField('studentId', event.target.value)} autoComplete="off" /></label>
            <label>Full name<input required minLength="2" maxLength="100" value={draft.name} onChange={(event) => setField('name', event.target.value)} autoComplete="name" /></label>
            <label>Email<input required type="email" maxLength="254" value={draft.email} onChange={(event) => setField('email', event.target.value)} autoComplete="email" /></label>
            <label>Department<input required maxLength="120" value={draft.department} onChange={(event) => setField('department', event.target.value)} /></label>
            <label>Branch<input required maxLength="120" value={draft.branch} onChange={(event) => setField('branch', event.target.value)} /></label>
            <label>Year of study<input required maxLength="40" placeholder="e.g. III Year" value={draft.year} onChange={(event) => setField('year', event.target.value)} /></label>
            <label>Semester<input required maxLength="40" placeholder="e.g. V Semester" value={draft.semester} onChange={(event) => setField('semester', event.target.value)} /></label>
            <label>Section<input required maxLength="40" value={draft.section} onChange={(event) => setField('section', event.target.value)} /></label>
            <label>Phone number <span className="admin-field-optional">Optional</span><input type="tel" maxLength="40" value={draft.phone} onChange={(event) => setField('phone', event.target.value)} /></label>
            {!editingUser && <label>Initial password<input required type="password" minLength="8" maxLength="72" autoComplete="new-password" value={draft.password} onChange={(event) => setField('password', event.target.value)} /></label>}
            <label className="admin-photo-field">Profile photo <span className="admin-field-optional">Optional · JPEG, PNG, WebP up to 5 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></label>
          </div>
          <button className="learning-button" type="submit" disabled={saving}><UserPlus size={15} />{saving ? 'Saving...' : editingUser ? 'Save student details' : 'Create student account'}</button>
        </form>
      </section>

      <section className="learning-panel admin-user-list-panel">
        <div className="learning-panel-heading"><div><span className="section-eyebrow">ACCOUNT DIRECTORY</span><h2>Students</h2></div></div>
        <div className="library-search-filters admin-user-filters">
          <label className="learning-search"><Search size={16} /><input aria-label="Search students by name, email, or Student ID" placeholder="Search name, email, or Student ID..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
          <select aria-label="Filter students by department" value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }}><option value="">All departments</option>{departments.filter(Boolean).map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Filter students by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
        </div>
        {loading ? <div className="academic-loading">Loading student accounts...</div> : users.length === 0 ? <div className="portfolio-empty"><span><Users size={22} /></span><h3>No student accounts found</h3><p>Try changing the search or filters, or create a student account above.</p></div> : <div className="admin-user-list">{users.map((user) => <article key={user.id}>
          <div className="admin-user-details"><span className={`library-issue-status ${user.isActive ? 'active' : 'inactive'}`}>{user.isActive ? 'active' : 'inactive'}</span><h3>{user.name}</h3><p>{user.email} · {user.studentProfile?.studentId || 'No Student ID'}</p><small>{[user.studentProfile?.department, user.studentProfile?.branch, user.studentProfile?.year, user.studentProfile?.semester, user.studentProfile?.section && `Section ${user.studentProfile.section}`].filter(Boolean).join(' · ')}</small></div>
          <div className="admin-user-actions"><button className="learning-button is-secondary" type="button" onClick={() => editUser(user)}><Pencil size={13} /> Edit</button><button className="learning-button is-secondary" type="button" onClick={() => { setResetTarget(user.id); setResetPasswordValue(''); }}><KeyRound size={13} /> Reset password</button><button className="learning-button is-secondary" type="button" onClick={() => toggleStatus(user)}>{user.isActive ? 'Deactivate' : 'Activate'}</button></div>
          {resetTarget === user.id && <form className="admin-reset-form" onSubmit={submitPasswordReset}><label>New password<input required minLength="8" maxLength="72" type="password" autoComplete="new-password" value={resetPasswordValue} onChange={(event) => setResetPasswordValue(event.target.value)} /></label><button className="learning-button" disabled={saving}>{saving ? 'Saving...' : 'Set password'}</button><button className="learning-button is-secondary" type="button" onClick={() => setResetTarget('')}>Cancel</button></form>}
        </article>)}</div>}
        {pagination.pageCount > 1 && <nav className="library-pagination" aria-label="Student account pages"><button className="learning-button is-secondary" type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ArrowLeft size={14} /> Previous</button><span>Page {pagination.page} of {pagination.pageCount}</span><button className="learning-button is-secondary" type="button" disabled={page >= pagination.pageCount || loading} onClick={() => setPage((current) => current + 1)}>Next <ArrowRight size={14} /></button></nav>}
      </section>
    </section>
  );
}
