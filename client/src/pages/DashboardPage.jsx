import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderKanban,
  Image,
  UserRound,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { facultyProfile } from '../data/mockFaculty';
import { quickAccessItems } from '../data/navigation';
import { socialLinks } from '../data/socialLinks';
import { publicDashboardProfile } from '../data/publicDashboardProfile';
import { useAuth } from '../context/AuthContext';
import { getProfilePhotoUrl } from '../services/profilePhoto';

function WelcomeBanner() {
  return (
    <motion.section
      className="ds-welcome library-hero"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="ds-welcome-copy library-hero-copy">
        <span className="library-hero-eyebrow">MOHAN BABU UNIVERSITY</span>
        <h1>Welcome to the<br /><em>Data Science Library</em></h1>
        <p className="library-hero-subtitle">Discover. Learn. Grow.</p>
        <p className="library-hero-description">
          Your academic space for books, Data Science subjects, study materials, coding resources, projects, and career tools—all in one place.
        </p>
        <Link to="/digital-library" className="library-hero-action">
          Explore Library <ArrowRight size={16} />
        </Link>
      </div>
    </motion.section>
  );
}

function RecentBooksPanel() {
  const bookCovers = [
    { image: '/images/dashboard-books/machine-learning.png', title: 'Introduction to Machine Learning' },
    { image: '/images/dashboard-books/data-analytics.png', title: 'Fundamentals of Data Analytics' },
    { image: '/images/dashboard-books/oracle-sql.png', title: 'Practical Guide to Oracle SQL, T-SQL and MySQL' },
    { image: '/images/dashboard-books/python-programming.png', title: 'Basics of Python Programming for Pharmaceutical Sciences' },
    { image: '/images/dashboard-books/data-science.png', title: 'Introduction to Data Science' },
  ];

  return (
    <section className="ds-panel ds-recent-books" aria-labelledby="recent-books-heading">
      <div className="ds-section-heading">
        <span className="ds-section-icon"><BookOpen size={17} /></span>
        <div><span className="ds-eyebrow">FROM YOUR COLLECTION</span><h2 id="recent-books-heading">Recent Books</h2></div>
        <Link to="/digital-library" className="ds-view-all">View All <ArrowRight size={14} /></Link>
      </div>
      <div className="ds-books-gallery" aria-label="Featured book covers">
        {bookCovers.map(({ image, title }) => (
          <img key={image} src={image} alt={title} loading="lazy" />
        ))}
      </div>
    </section>
  );
}

function QuickAccessPanel() {
  return (
    <section className="ds-panel quick-panel" id="quick-access">
      <div className="ds-section-heading">
        <span className="ds-section-icon"><FlaskConical size={17} /></span>
        <div><span className="ds-eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Quick Access</h2></div>
        <Link to="/quick-access" className="ds-view-all">View All <ArrowRight size={14} /></Link>
      </div>
      <div className="ds-quick-grid">
        {quickAccessItems.map(({ title, to, icon: Icon, tone }, index) => (
          <motion.div key={to + title} whileHover={{ y: -3 }} transition={{ duration: 0.16 }}>
            <Link to={to} className={`ds-quick-card ${tone}`}>
              <span className="ds-quick-icon"><Icon size={20} strokeWidth={1.8} /></span>
              <strong>{title}</strong>
              <span className="ds-card-number">0{index + 1}</span>
              <ArrowUpRight className="ds-quick-arrow" size={14} />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function StudentIdentityCard() {
  const { user } = useAuth();
  const displayedUser = user?.role === 'student' ? user : publicDashboardProfile;
  const studentProfile = displayedUser.studentProfile || {};
  const displayedBranch = studentProfile.branch === 'CSE (DS)'
    ? 'BTech CSE (DS)'
    : studentProfile.branch || 'Not provided';
  const [hasLogo, setHasLogo] = useState(true);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState('');
  const studentPhotoUrl = displayedUser.isDemo
    ? '/images/student-photo.png'
    : getProfilePhotoUrl(studentProfile);
  const hasStudentPhoto = Boolean(studentPhotoUrl && failedPhotoUrl !== studentPhotoUrl);
  return (
    <article className="ds-id-card">
      <div className="ds-id-header">
        {hasLogo
          ? <img src="/images/mbu-logo.png" alt="Mohan Babu University" onError={() => setHasLogo(false)} />
          : <span className="ds-id-brand"><strong>MBU</strong><small>MOHAN BABU UNIVERSITY</small></span>}
      </div>
      <div className="ds-id-body">
        <div className="ds-id-person">
          <span className="ds-student-photo">
            {hasStudentPhoto
              ? <img src={studentPhotoUrl} alt={`${displayedUser.name} profile`} crossOrigin="use-credentials" onError={() => setFailedPhotoUrl(studentPhotoUrl)} />
              : <UserRound size={35} />}
          </span>
          <div className="ds-id-fields">
            <p><span>Name:</span><strong>{displayedUser.name}</strong></p>
            <p><span>Branch:</span><strong>{displayedBranch}</strong></p>
          </div>
        </div>
        <div className="ds-id-bottom">
          <p><span>Semester:</span><strong>{studentProfile.semester || 'Not provided'}</strong></p>
          <p><span>Registration Number:</span><strong>{studentProfile.studentId || 'Not provided'}</strong></p>
        </div>
      </div>
    </article>
  );
}

function FacultyCard() {
  return (
    <article className="ds-faculty-card" aria-label="Faculty Information">
      <div className="ds-faculty-heading"><UserRound size={18} /><h2>Faculty Information</h2></div>
      <div className="ds-faculty-details">
        <p><span>Faculty Name</span><strong>{facultyProfile.name}</strong></p>
        <p><span>Designation</span><strong>{facultyProfile.title}</strong></p>
      </div>
    </article>
  );
}

function MotivationCard() {
  return (
    <article className="ds-motivation-card">
      <span className="ds-leaf ds-leaf-left" aria-hidden="true">❧</span>
      <BookOpen size={31} strokeWidth={1.5} />
      <p>Small steps every day<br />lead to big results</p>
      <span className="ds-leaf ds-leaf-right" aria-hidden="true">❧</span>
    </article>
  );
}

const connectItems = [
  { label: 'LinkedIn', url: socialLinks.linkedin, tone: 'linkedin' },
  { label: 'GitHub', url: socialLinks.github, tone: 'github' },
  { label: 'Resume', url: '/resumes/Peta_Yasasvisri_Resume.pdf', icon: FileText, tone: 'resume' },
];

function ConnectWithMeCard() {
  return (
    <section className="ds-connect-card" aria-labelledby="connect-heading">
      <div className="ds-connect-heading">
        <h2 id="connect-heading">Connect with me</h2>
        <span />
      </div>
      <div className="ds-connect-grid">
        {connectItems.map(({ label, url, to, icon: Icon, tone }) => {
          const content = (
            <>
              <span className="ds-connect-icon">
                {tone === 'linkedin' ? <span className="ds-linkedin-mark" aria-hidden="true">in</span> : null}
                {tone === 'github' ? <svg className="ds-github-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54v-2.1c-3.1.68-3.75-1.32-3.75-1.32-.5-1.29-1.24-1.63-1.24-1.63-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1 1.87-.74 2.16-1.18.1-.73.39-1.23.7-1.51-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.16-3-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.08 1.15a10.68 10.68 0 0 1 5.6 0c2.13-1.45 3.08-1.15 3.08-1.15.61 1.54.23 2.68.11 2.96.72.78 1.16 1.78 1.16 3 0 4.29-2.62 5.23-5.11 5.51.4.35.75 1.03.75 2.08v3.09c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z" /></svg> : null}
                {Icon ? <Icon size={17} strokeWidth={2} /> : null}
              </span>
              <strong>{label}</strong>
              <ExternalLink className="ds-connect-external" size={11} />
            </>
          );

          return to ? (
            <Link
              key={label}
              className={`ds-connect-item ${tone}`}
              to={to}
              aria-label={`${label} (opens resume section)`}
            >
              {content}
            </Link>
          ) : url ? (
            <a
              key={label}
              className={`ds-connect-item ${tone}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} (opens in a new tab)`}
            >
              {content}
            </a>
          ) : (
            <button
              key={label}
              className={`ds-connect-item ${tone} is-unconfigured`}
              type="button"
              disabled
              title={`Add your ${label} URL in client/src/data/socialLinks.js`}
              aria-label={`${label} link not configured`}
            >
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="ds-dashboard">
      <div className="ds-dashboard-primary">
        <WelcomeBanner />
        <main className="ds-dashboard-main">
          <QuickAccessPanel />
          <RecentBooksPanel />
        </main>
      </div>
      <div className="ds-dashboard-profile-column">
        <div className="ds-dashboard-identity">
          <StudentIdentityCard />
          <FacultyCard />
        </div>
        <aside className="ds-dashboard-aside" aria-label="Student information">
          <ConnectWithMeCard />
          <MotivationCard />
          <Link to="/my-resume" className="ds-resume-link"><FileText size={15} /> View my academic profile <ArrowRight size={14} /></Link>
        </aside>
      </div>
    </div>
  );
}
