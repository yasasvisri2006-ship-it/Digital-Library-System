import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from '../components/ProtectedRoute';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

afterEach(cleanup);

describe('authentication screens', () => {
  let login;

  beforeEach(() => {
    login = vi.fn();
    useAuth.mockReturnValue({ user: null, login, loading: false, sessionError: '' });
  });

  it('shows required-field feedback before submitting credentials', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /^Login/ }));

    expect(screen.getByText('Enter your email or student ID')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('explains that students must receive an account from an administrator', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByText('Account access is provided by your administrator. Contact the library administrator if you need an account.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /create account|register/i })).not.toBeInTheDocument();
  });

  it('shows authentication errors returned by the API', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue({ response: { data: { message: 'Invalid credentials.' } } });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await user.type(screen.getByRole('textbox', { name: 'Email or Student ID' }), 'student@example.test');
    await user.type(screen.getByLabelText('Password'), 'incorrect-password');
    await user.click(screen.getByRole('button', { name: /^Login/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials.');
  });

  it('redirects a signed-in user without the required role away from an admin page', () => {
    useAuth.mockReturnValue({ user: { role: 'student' }, loading: false, sessionError: '' });
    render(
      <MemoryRouter initialEntries={['/admin/users/create']}>
        <Routes>
          <Route path="/dashboard" element={<p>Student dashboard</p>} />
          <Route path="/admin/users/create" element={<ProtectedRoute allowedRoles={['admin']}><p>Admin tools</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Student dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin tools')).not.toBeInTheDocument();
  });

  it('does not redirect while the session check is pending', () => {
    useAuth.mockReturnValue({ user: null, loading: true, sessionError: '' });
    render(
      <MemoryRouter initialEntries={['/admin/users/create']}>
        <Routes>
          <Route path="/admin/login" element={<p>Admin login page</p>} />
          <Route path="/admin/users/create" element={<ProtectedRoute allowedRoles={['admin']}><p>Admin tools</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading your session...')).toBeInTheDocument();
    expect(screen.queryByText('Admin login page')).not.toBeInTheDocument();
  });

  it('sends unauthenticated users to login with their requested route preserved', () => {
    useAuth.mockReturnValue({ user: null, loading: false, sessionError: '' });
    function LoginDestination() {
      const location = useLocation();
      return <p>Login destination: {location.state?.from}</p>;
    }
    render(
      <MemoryRouter initialEntries={['/admin/users/create?filter=active']}>
        <Routes>
          <Route path="/admin/login" element={<LoginDestination />} />
          <Route path="/admin/users/create" element={<ProtectedRoute allowedRoles={['admin']}><p>Admin tools</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login destination: /admin/users/create?filter=active')).toBeInTheDocument();
  });

  it('keeps the protected page visible when session restoration cannot reach the API', () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      sessionError: 'Unable to reach the sign-in service.',
    });
    render(
      <MemoryRouter initialEntries={['/admin/users/create']}>
        <Routes>
          <Route path="/admin/login" element={<p>Admin login page</p>} />
          <Route path="/admin/users/create" element={<ProtectedRoute allowedRoles={['admin']}><p>Admin tools</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to reach the sign-in service.');
    expect(screen.queryByText('Admin login page')).not.toBeInTheDocument();
  });

  it('routes an already signed-in administrator to user management from login', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' }, loading: false, sessionError: '' });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/users/create" element={<p>Admin tools</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin tools')).toBeInTheDocument();
  });

  it('renders the dashboard navigation for a signed-in student', () => {
    useAuth.mockReturnValue({
      user: { name: 'Test Student', role: 'student', studentProfile: { department: 'Data Science' } },
      logout: vi.fn(),
      loading: false,
      sessionError: '',
    });
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<p>Dashboard content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: 'Student portal navigation' })).toHaveTextContent('Digital Library');
    expect(screen.queryByRole('link', { name: 'Library Admin' })).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });
});
