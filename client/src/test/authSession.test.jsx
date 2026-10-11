import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';
import api from '../services/api';
import { normalizeApiBaseUrl } from '../services/apiBaseUrl';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

afterEach(cleanup);

describe('authentication session restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes a Render backend origin to the API mount path', () => {
    expect(normalizeApiBaseUrl('https://digital-library-api.onrender.com')).toBe(
      'https://digital-library-api.onrender.com/api',
    );
    expect(normalizeApiBaseUrl('https://digital-library-api.onrender.com/api/')).toBe(
      'https://digital-library-api.onrender.com/api',
    );
    expect(normalizeApiBaseUrl(undefined)).toBe('http://localhost:5000/api');
  });

  it('restores an administrator from the current-user endpoint before rendering an admin route', async () => {
    let resolveCurrentUser;
    api.get.mockReturnValueOnce(new Promise((resolve) => {
      resolveCurrentUser = resolve;
    }));

    render(
      <MemoryRouter initialEntries={['/admin/users/create']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<p>Login page</p>} />
            <Route
              path="/admin/users/create"
              element={<ProtectedRoute allowedRoles={['admin']}><p>Admin tools</p></ProtectedRoute>}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(screen.getByText('Loading your session...')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();

    resolveCurrentUser({ data: { data: { user: { id: 'admin-1', role: 'admin' } } } });

    expect(await screen.findByText('Admin tools')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading your session...')).not.toBeInTheDocument());
  });

});
