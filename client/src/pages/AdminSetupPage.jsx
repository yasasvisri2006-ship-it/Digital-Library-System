import { useEffect, useState } from 'react';
import { ArrowRight, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LoadingPage from '../components/LoadingPage';
import api from '../services/api';

const errorMessage = (error) => error.response?.data?.message || 'Administrator setup could not be completed.';

export default function AdminSetupPage() {
  const [setupAvailable, setSetupAvailable] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/auth/admin/setup-status')
      .then(({ data }) => {
        if (active) setSetupAvailable(data.data.available);
      })
      .catch((requestError) => {
        if (active) {
          setStatusError(errorMessage(requestError));
        }
      });
    return () => { active = false; };
  }, []);

  if (setupAvailable === null && !statusError) return <LoadingPage />;
  if (statusError) {
    return (
      <AuthLayout variant="login">
        <div className="mbu-auth-heading">
          <span className="mbu-auth-icon"><ShieldCheck size={25} /></span>
          <h1>First Admin Setup</h1>
          <p>We could not verify whether one-time setup is available.</p>
        </div>
        <div className="mbu-form-message is-error" role="alert">{statusError}</div>
        <Link className="mbu-submit-button admin-setup-back-link" to="/admin/login">Administrator login</Link>
      </AuthLayout>
    );
  }
  if (!setupAvailable) {
    return <Navigate to="/admin/login" replace state={{ setupUnavailable: true }} />;
  }

  async function submitSetup(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/auth/admin/setup', { name, email, password, setupKey });
      setPassword('');
      setSetupKey('');
      setSetupAvailable(false);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthLayout variant="login">
      <div className="mbu-auth-heading">
        <span className="mbu-auth-icon"><ShieldCheck size={25} /></span>
        <h1>First Admin Setup</h1>
        <p>One-time setup for the first administrator account.</p>
      </div>
      {error && <div className="mbu-form-message is-error" role="alert">{error}</div>}
      {setupAvailable ? (
        <form className="mbu-auth-form admin-setup-form" onSubmit={submitSetup}>
          <label className="mbu-form-field">Administrator full name
            <input required minLength="2" maxLength="100" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="mbu-form-field">Admin ID / email
            <input required type="email" maxLength="254" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="mbu-form-field">One-time setup key
            <input required type="password" minLength="32" maxLength="256" autoComplete="off" value={setupKey} onChange={(event) => setSetupKey(event.target.value)} />
          </label>
          <label className="mbu-form-field">Administrator password
            <input required type="password" minLength="12" maxLength="72" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <p className="admin-setup-security-note"><KeyRound size={15} /> Passwords are hashed on the server and never returned by the API.</p>
          <button className="mbu-submit-button" type="submit" disabled={saving}>
            {saving ? 'Creating administrator...' : 'Create first administrator'}
            {!saving && <ArrowRight size={16} />}
          </button>
        </form>
      ) : (
        <div className="mbu-form-message" role="status">
          Administrator setup is complete. Sign in to continue.
        </div>
      )}
      {setupAvailable && <p className="mbu-account-access-note">Setup closes automatically after the first administrator is created.</p>}
      <p className="mbu-auth-role-link"><UserRound size={14} /> <Link to="/admin/login">Administrator login</Link></p>
    </AuthLayout>
  );
}
