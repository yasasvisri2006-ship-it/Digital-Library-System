import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.data.user);
    setSessionError('');
    return data.data.user;
  };

  useEffect(() => {
    let active = true;
    localStorage.removeItem('authToken');
    api.get('/auth/me')
      .then(({ data }) => {
        if (active) setUser(data.data.user);
      })
      .catch((error) => {
        if (!active) return;
        setUser(null);
        if (error.response?.status !== 401) {
          setSessionError(error.response?.data?.message || 'Unable to reach the sign-in service.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (payload, role = 'student') => {
    const loginPath = role === 'admin' ? '/auth/admin/login' : '/auth/student/login';
    await api.post(loginPath, payload);
    return refreshUser();
  };

  const updateProfile = async (changes) => {
    const { data } = await api.patch('/profile', changes);
    const updatedUser = {
      ...user,
      name: data.data.profile.name,
      studentProfile: data.data.profile,
    };
    setUser(updatedUser);
    return data.data.profile;
  };

  const uploadProfilePhoto = async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const { data } = await api.post('/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const updatedUser = { ...user, studentProfile: data.data.profile };
    setUser(updatedUser);
    return data.data.profile;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    setSessionError('');
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      sessionError,
      login,
      logout,
      refreshUser,
      updateProfile,
      uploadProfilePhoto,
    }),
    [user, loading, sessionError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
