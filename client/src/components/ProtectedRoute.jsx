import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = ['student', 'admin'] }) {
  const { user, loading, sessionError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card loading-card">
          <div className="spinner" />
          <p>Loading your session...</p>
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="auth-shell">
        <div className="auth-card form-error-card" role="alert">
          <h1>Unable to verify your session</h1>
          <p>{sessionError}</p>
          <button className="primary-button auth-button" type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    const loginPath = allowedRoles.length === 1 && allowedRoles[0] === 'admin'
      ? '/admin/login'
      : '/student/login';
    return <Navigate
      to={loginPath}
      replace
      state={{ from: `${location.pathname}${location.search}${location.hash}` }}
    />;
  }
  if (!allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}
