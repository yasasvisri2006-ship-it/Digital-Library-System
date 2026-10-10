import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import AuthLayout from '../components/AuthLayout';
import LoadingPage from '../components/LoadingPage';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  identity: z.string().trim().min(1, 'Enter your email or student ID'),
  password: z.string().min(1, 'Enter your password'),
});

function getErrorMessage(error) {
  const response = error.response?.data;
  if (Array.isArray(response?.errors)) return response.errors[0]?.message || response.message;
  return response?.message || 'We could not sign you in. Please try again.';
}

export default function LoginPage({ role = 'student' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loading, sessionError } = useAuth();
  const isAdmin = role === 'admin';
  const [submitError, setSubmitError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identity: '', password: '' },
  });

  if (loading) return <LoadingPage />;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;

  const onSubmit = async (values) => {
    setSubmitError('');
    try {
      const authenticatedUser = await login(values, role);
      const destination = location.state?.from;
      navigate(
        typeof destination === 'string' && destination.startsWith('/')
          ? destination
          : authenticatedUser.role === 'admin' ? '/admin/dashboard' : '/dashboard',
        { replace: true },
      );
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  };

  return (
    <AuthLayout variant="login">
      <div className="mbu-auth-heading">
        <span className="mbu-auth-icon"><UserRound size={27} strokeWidth={1.65} /></span>
        <h1>{isAdmin ? 'Administrator Login' : 'Student Login'}</h1>
        <p>{isAdmin ? 'Manage student access and library services securely.' : <>Access your resources, explore knowledge,<br className="auth-desktop-break" /> and build your future.</>}</p>
      </div>

      <form className="mbu-auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className={`mbu-auth-input${errors.identity ? ' has-error' : ''}`}>
          <UserRound size={18} aria-hidden="true" />
          <input
            autoComplete="username"
            placeholder={isAdmin ? 'Administrator email' : 'Email or Student ID'}
            aria-label={isAdmin ? 'Administrator email' : 'Email or Student ID'}
            aria-invalid={Boolean(errors.identity)}
            {...register('identity')}
          />
        </label>
        {errors.identity && <small className="mbu-field-error">{errors.identity.message}</small>}

        <label className={`mbu-auth-input${errors.password ? ' has-error' : ''}`}>
          <LockKeyhole size={18} aria-hidden="true" />
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          <button
            className="mbu-password-toggle"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </label>
        {errors.password && <small className="mbu-field-error">{errors.password.message}</small>}

        {sessionError && <div className="mbu-form-message" role="status">{sessionError}</div>}
        {submitError && <div className="mbu-form-message is-error" role="alert">{submitError}</div>}

        <button className="mbu-submit-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Login'}
          {!isSubmitting && <ArrowRight size={17} />}
        </button>
      </form>

      {!isAdmin
        ? <p className="mbu-account-access-note">Account access is provided by your administrator. Contact the library administrator if you need an account.</p>
        : <p className="mbu-account-access-note">Administrator accounts are reserved for authorized library staff.</p>}
      <p className="mbu-auth-footnote">Your academic space, all in one place.</p>
    </AuthLayout>
  );
}
