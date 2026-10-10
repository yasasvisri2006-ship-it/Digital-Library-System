import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, LibraryBig, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function AdminDashboardPage() {
  const [studentCount, setStudentCount] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/admin/users/', { params: { page: 1, pageSize: 1 } })
      .then(({ data }) => {
        if (active) setStudentCount(data.data.pagination.total);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load administrator dashboard data.');
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="admin-dashboard-page">
      <header className="learning-page-heading">
        <span className="learning-title-icon"><ShieldCheck size={21} /></span>
        <div><span className="section-eyebrow">MBU DIGITAL LIBRARY</span><h1>Admin Dashboard</h1><p>Manage student access and library operations.</p></div>
      </header>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      <div className="admin-dashboard-cards">
        <article className="learning-panel admin-dashboard-card">
          <span className="ds-section-icon"><Users size={20} /></span>
          <div><span className="section-eyebrow">ACCOUNT DIRECTORY</span><h2>{studentCount === null ? 'Loading...' : `${studentCount} students`}</h2><p>Create accounts, edit student details, deactivate access, or reset passwords.</p></div>
          <Link className="learning-button" to="/admin/users/create">Manage students <ArrowRight size={15} /></Link>
        </article>
        <article className="learning-panel admin-dashboard-card">
          <span className="ds-section-icon"><LibraryBig size={20} /></span>
          <div><span className="section-eyebrow">LIBRARY OPERATIONS</span><h2>Digital Library</h2><p>Manage book records, circulation, student borrowing, and library reports.</p></div>
          <Link className="learning-button" to="/library/admin">Open library admin <ArrowRight size={15} /></Link>
        </article>
        <article className="learning-panel admin-dashboard-card">
          <span className="ds-section-icon"><BookOpen size={20} /></span>
          <div><span className="section-eyebrow">STUDENT VIEW</span><h2>Browse the catalog</h2><p>Review the digital library catalog and book details.</p></div>
          <Link className="learning-button is-secondary" to="/digital-library">View catalog <ArrowRight size={15} /></Link>
        </article>
      </div>
    </section>
  );
}
