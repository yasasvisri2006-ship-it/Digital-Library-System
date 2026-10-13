import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import { navigationItems } from '../data/navigation';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

afterEach(cleanup);

describe('dashboard presentation', () => {
  it('shows the five book-cover pictures on the dashboard', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Recent Books' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /View All/ }).some((link) => (
      link.getAttribute('href') === '/digital-library'
    ))).toBe(true);
    expect(screen.getByRole('img', { name: 'Introduction to Machine Learning' })).toHaveAttribute(
      'src',
      '/images/dashboard-books/machine-learning.png',
    );
    expect(screen.getByRole('img', { name: 'Fundamentals of Data Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Practical Guide to Oracle SQL, T-SQL and MySQL' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Basics of Python Programming for Pharmaceutical Sciences' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Introduction to Data Science' })).toBeInTheDocument();
  });

  it('removes Certifications and Quizzes & Tests from the portal navigation', () => {
    expect(navigationItems.some(({ label }) => label === 'Certificates')).toBe(false);
    expect(navigationItems.some(({ label }) => label === 'Quizzes & Tests')).toBe(false);
  });
});
