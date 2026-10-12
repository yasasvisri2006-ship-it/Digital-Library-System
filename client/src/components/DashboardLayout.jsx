import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  BookOpen,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { navigationItems } from '../data/navigation';
import { publicDashboardProfile } from '../data/publicDashboardProfile';
import { useAuth } from '../context/AuthContext';
import { getInitials, getProfilePhotoUrl } from '../services/profilePhoto';

function BrandMark() {
  const [hasLogo, setHasLogo] = useState(true);

  return (
    <div className="header-branding">
      <div className="university-lockup" aria-label="Mohan Babu University branding">
        {hasLogo ? (
          <img className="university-logo-image" src="/images/mbu-logo.png" alt="Mohan Babu University" onError={() => setHasLogo(false)} />
        ) : (
          <span className="university-mark"><strong>MBU</strong><small>LOGO</small></span>
        )}
        <span className="university-copy"><strong>MOHAN BABU</strong><small>UNIVERSITY</small></span>
      </div>
      <span className="branding-divider" />
      <div className="library-lockup">
        <BookOpen size={27} strokeWidth={1.7} />
        <span><strong>DIGITAL LIBRARY</strong><small>Data Science Library</small></span>
      </div>
    </div>
  );
}

function StudentAvatar({ user, className = 'profile-avatar' }) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState('');
  const photoUrl = user?.isDemo
    ? '/images/student-photo.png'
    : getProfilePhotoUrl(user?.studentProfile);
  const hasPhoto = Boolean(photoUrl && failedPhotoUrl !== photoUrl);

  return (
    <span className={className}>
      {hasPhoto && photoUrl
        ? <img src={photoUrl} alt="" crossOrigin="use-credentials" onError={() => setFailedPhotoUrl(photoUrl)} />
      : getInitials(user?.name || publicDashboardProfile.name)}
    </span>
  );
}

function Sidebar({ mobileOpen, onClose }) {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close navigation menu"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
      <aside className={`portal-sidebar${mobileOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-mobile-title">YOUR PORTAL</span>
          <button className="mobile-close icon-button" type="button" onClick={onClose} aria-label="Close menu">
            <X size={19} />
          </button>
        </div>

        <nav className="sidebar-navigation" aria-label="Student portal navigation">
          {navigationItems.filter((item) => user?.role === 'admin'
            ? item.roles?.includes('admin')
            : !item.roles || item.roles.includes('student')).map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`navigation-link${location.pathname === to || (to !== '/digital-library' && location.pathname.startsWith(`${to}/`)) ? ' active' : ''}`}
              onClick={onClose}
              aria-current={location.pathname === to || (to !== '/digital-library' && location.pathname.startsWith(`${to}/`)) ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-quote">
            <span>Learn</span>
            <span>Grow</span>
            <span>Excel</span>
          </div>
          <div className="sidebar-campus-art" role="img" aria-label="Decorative campus illustration placeholder; add an approved campus image at client/public/images/mbu-campus.jpg">
            <span className="sidebar-campus-label">Campus illustration</span>
            <span className="sidebar-campus-building campus-building-one" />
            <span className="sidebar-campus-building campus-building-two" />
            <span className="sidebar-campus-building campus-building-three" />
          </div>
          <small className="sidebar-version">MBU · STUDENT PORTAL</small>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenuOpen }) {
  const [search, setSearch] = useState('');
  const [openPanel, setOpenPanel] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const { user, logout } = useAuth();
  const displayedUser = user || publicDashboardProfile;
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';
  const homepageLinks = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Books', to: '/digital-library' },
    { label: 'Subjects', to: '/my-subjects' },
    { label: 'Resources', to: '/study-materials' },
    { label: 'Projects', to: '/projects' },
    { label: 'Resume', to: '/my-resume' },
    { label: 'Profile', to: '/my-profile' },
  ];

  function submitSearch(event) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setOpenPanel('');
  }

  function togglePanel(panel) {
    setOpenPanel((current) => current === panel ? '' : panel);
  }

  async function handleLogout() {
    setLogoutError('');
    try {
      await logout();
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setLogoutError(error.response?.data?.message || 'Unable to sign out. Please try again.');
    }
  }

  return (
    <header className={`portal-topbar${isDashboard ? ' homepage-topbar' : ''}`}>
      <div className="topbar-brand-area">
        <button className="mobile-menu-toggle icon-button" type="button" onClick={onMenuOpen} aria-label="Open navigation menu">
          <Menu size={20} />
        </button>
        <BrandMark />
        <Link to="/dashboard" className="mobile-brand" aria-label="MBU Digital Library home">
          <img src="/images/mbu-logo.png" alt="" />
          <BookOpen size={18} strokeWidth={1.8} />
          <span><b>DIGITAL LIBRARY</b><small>Data Science Library</small></span>
        </Link>
      </div>

      {isDashboard && (
        <nav className="homepage-nav-links" aria-label="Homepage navigation">
          {homepageLinks.map(({ label, to }) => (
            <Link key={label} to={to} aria-current={to === '/dashboard' ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>
      )}

      <div className="topbar-actions">
        <form className="portal-search" role="search" onSubmit={submitSearch}>
          <Search size={17} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes, labs, assignments..."
            aria-label="Search notes, labs, assignments"
          />
          <kbd>↵</kbd>
        </form>

        {user ? (
          <>
            <div className="action-menu-wrap">
              <button
                type="button"
                className={`icon-button notification-button${openPanel === 'notifications' ? ' selected' : ''}`}
                aria-label="Notifications"
                aria-expanded={openPanel === 'notifications'}
                onClick={() => togglePanel('notifications')}
              >
                <Bell size={19} />
              </button>
              {openPanel === 'notifications' && (
                <div className="action-popover notification-popover">
                  <div className="popover-heading"><strong>Notifications</strong><span>Just for you</span></div>
                  <div className="popover-empty">
                    <span className="popover-empty-icon"><Bell size={18} /></span>
                    <strong>You’re all caught up</strong>
                    <span>New updates will appear here.</span>
                  </div>
                </div>
              )}
            </div>
            <div className="action-menu-wrap">
              <button
                type="button"
                className={`profile-trigger${openPanel === 'profile' ? ' selected' : ''}`}
                aria-expanded={openPanel === 'profile'}
                aria-label="Open profile menu"
                onClick={() => togglePanel('profile')}
              >
                <StudentAvatar user={displayedUser} />
                <span className="profile-trigger-copy"><strong>{user.name}</strong><small>{user.role}</small></span>
                <ChevronDown size={15} />
              </button>
              {openPanel === 'profile' && (
                <div className="action-popover profile-popover">
                  <div className="profile-popover-heading">
                    <StudentAvatar user={displayedUser} />
                    <span><strong>{user.name}</strong><small>{user.studentProfile?.department || user.role}</small></span>
                  </div>
                  <Link to="/modules" onClick={() => setOpenPanel('')}>Modules</Link>
                  <Link to="/my-subjects" onClick={() => setOpenPanel('')}>My subjects</Link>
                  <Link to="/my-profile" onClick={() => setOpenPanel('')}>My profile</Link>
                  <Link to="/settings" onClick={() => setOpenPanel('')}>Settings</Link>
                  <Link to="/digital-library" onClick={() => setOpenPanel('')}>Digital library</Link>
                  <Link to="/my-resume" onClick={() => setOpenPanel('')}>My resume</Link>
                  <Link to="/certificates" onClick={() => setOpenPanel('')}>My certificates</Link>
                  {logoutError && <div className="logout-error-message" role="alert">{logoutError}</div>}
                  <button className="profile-logout-action" type="button" onClick={handleLogout}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : <span className="public-preview-badge">Public preview</span>}
      </div>
      <svg className="header-floral" viewBox="0 0 78 110" aria-hidden="true">
        <path d="M78 99C57 79 51 51 58 9" fill="none" stroke="#efcbd0" strokeWidth="1.5" />
        <path d="M61 37C43 31 40 21 43 11c13 4 19 13 18 26Zm-5 20c-17-2-24-10-24-21 14 1 23 8 24 21Zm7 4c17-8 21-18 17-29-13 6-19 15-17 29Zm5 18c15-10 18-20 12-30-12 8-16 18-12 30Z" fill="#f9e9ea" />
        <path d="M4 103c16-14 22-32 19-59" fill="none" stroke="#f0d4d7" strokeWidth="1.3" />
        <path d="M23 61C10 57 6 50 8 42c10 3 15 9 15 19Zm-2 15C9 74 4 67 6 59c10 4 15 9 15 17Zm1 4c12-6 15-14 12-22-9 5-13 12-12 22Z" fill="#fbefef" />
      </svg>
    </header>
  );
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="portal-shell">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="portal-main">
        <Topbar onMenuOpen={() => setMobileOpen(true)} />
        <main className="portal-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname + location.search}
              className="route-content"
              initial={{ opacity: 0, y: 9 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
