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

  it('displays the resume publicly without requiring sign-in', async () => {
    useAuth.mockReturnValue({ user: null, loading: false, sessionError: '' });
    render(
      <MemoryRouter initialEntries={['/my-resume']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByTitle('Peta Yasasvisri resume')).toHaveAttribute(
      'src',
      '/resumes/Peta_Yasasvisri_Resume.pdf#view=FitH',
    );
    expect(screen.getByRole('link', { name: 'Download PDF' })).toHaveAttribute(
      'href',
      '/resumes/Peta_Yasasvisri_Resume.pdf',
    );
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
    expect(screen.queryByText('DEMO PREVIEW · SAMPLE PROFILE')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Peta Yasasvisri profile' })).toHaveAttribute('src', '/images/student-photo.png');
    expect(screen.getByText('BTech CSE (DS)')).toBeInTheDocument();
    expect(screen.getByText('25302A030001')).toBeInTheDocument();
    const identityCard = screen.getByText('Registration Number:').closest('.ds-id-card');
    expect(screen.queryByText('STUDENT IDENTITY CARD')).not.toBeInTheDocument();
    expect(identityCard).not.toHaveTextContent('Department:');
    expect(screen.getAllByText('DATA SCIENCE DIGITAL LIBRARY')).toHaveLength(2);
    expect(screen.queryByRole('navigation', { name: 'Homepage navigation' })).not.toBeInTheDocument();
    expect(identityCard).toHaveTextContent('Registration Number:25302A030001');
    expect(identityCard).not.toHaveTextContent('Student ID:');
    const facultyCard = screen.getByRole('heading', { name: 'Faculty Information' }).closest('.ds-faculty-card');
    expect(identityCard.parentElement).toHaveClass('ds-dashboard-identity');
    expect(identityCard.parentElement.children[1]).toBe(facultyCard);
    expect(facultyCard).toHaveTextContent('Faculty Name');
    expect(facultyCard).toHaveTextContent('S Bosu Babu');
    expect(facultyCard).toHaveTextContent('Designation');
    expect(facultyCard).toHaveTextContent('Assistant Professor');
    expect(screen.getByRole('link', { name: 'LinkedIn (opens in a new tab)' })).toHaveAttribute('href', 'https://linkedin.com/in/peta-yasasvisri-reddy-28763b379/');
    expect(screen.getByRole('link', { name: 'LinkedIn (opens in a new tab)' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'GitHub (opens in a new tab)' })).toHaveAttribute('href', 'https://github.com/yasasvisri2006-ship-it');
    expect(screen.getByRole('link', { name: 'GitHub (opens in a new tab)' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'GitHub (opens in a new tab)' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'Resume (opens resume section)' })).toHaveAttribute('href', '/my-resume');
    expect(screen.getByRole('heading', { name: 'Quick Access' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'EXPLORE DATA SCIENCE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Study shortcuts and featured resources' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Recently added learning materials' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Explore by subject' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Student portal navigation', hidden: true })).not.toHaveTextContent('Digital Library');
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

    expect(screen.getByRole('navigation', { name: 'Student portal navigation', hidden: true })).not.toHaveTextContent('Digital Library');
    expect(screen.queryByRole('link', { name: 'Library Admin' })).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('keeps navigation closed by default and closes it after selecting a route', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({
      user: { name: 'Test Student', role: 'student', studentProfile: {} },
      logout: vi.fn(),
      loading: false,
      sessionError: '',
    });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<p>Dashboard content</p>} />
            <Route path="/my-subjects" element={<p>Subjects content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const toggle = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('aria-hidden', 'true');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('link', { name: 'My Subjects' }));
    expect(screen.getByText('Subjects content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});
