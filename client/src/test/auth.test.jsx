import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppRoutes } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from '../components/ProtectedRoute';
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

  it('keeps admin-only content restricted without redirecting to a login page', () => {
    useAuth.mockReturnValue({ user: { role: 'student' }, loading: false, sessionError: '' });
    render(
      <MemoryRouter initialEntries={['/admin/users/create']}>
        <Routes>
          <Route path="/admin/login" element={<p>Admin login page</p>} />
          <Route path="/admin/users/create" element={<ProtectedRoute allowedRoles={['admin']}><p>Admin tools</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Administrator access required' })).toBeInTheDocument();
    expect(screen.queryByText('Admin tools')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin login page')).not.toBeInTheDocument();
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

  it('shows a restricted page instead of redirecting unauthenticated users to login', () => {
    useAuth.mockReturnValue({ user: null, loading: false, sessionError: '' });
    render(
      <MemoryRouter initialEntries={['/admin/users/create?filter=active']}>
        <Routes>
          <Route path="/admin/login" element={<p>Admin login page</p>} />
          <Route path="/admin/users/create" element={<ProtectedRoute allowedRoles={['admin']}><p>Admin tools</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Administrator access required' })).toBeInTheDocument();
    expect(screen.queryByText('Admin login page')).not.toBeInTheDocument();
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

  it('opens the existing dashboard at the site root with a labeled demo profile and no login links', async () => {
    useAuth.mockReturnValue({ user: null, logout: vi.fn(), loading: false, sessionError: '' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /Data Science Library/i })).toBeInTheDocument();
    expect(screen.getByText('Peta Yasasvisri')).toBeInTheDocument();
    expect(screen.getByText('DEMO PREVIEW · SAMPLE PROFILE')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Peta Yasasvisri profile' })).toHaveAttribute('src', '/images/student-photo.png');
    expect(screen.getByText('CSE (DS)')).toBeInTheDocument();
    expect(screen.getByText('Data Science')).toBeInTheDocument();
    expect(screen.getByText('25302A030001')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Student portal navigation' })).toHaveTextContent('Digital Library');
    expect(screen.queryByRole('link', { name: /login|sign in|register/i })).not.toBeInTheDocument();
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
