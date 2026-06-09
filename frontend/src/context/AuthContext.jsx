import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import api, { getToken, setToken, clearToken } from '../utils/api';

const AuthContext = createContext(null);

const SESSION_KEY = 'bh_admin_auth';

const initialsOf = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD';

export const AuthProvider = ({ children }) => {
  const [admins, setAdmins] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  // Fetch admins list from backend, normalize snake_case → camelCase
  const fetchAdmins = useCallback(async () => {
    try {
      const data = await api.get('/auth/admins');
      setAdmins(data.map((a) => ({
        ...a,
        active: !!a.is_active,
        owner: !!a.is_owner,
        createdAt: a.created_at,
      })));
    } catch {
      // backend offline – keep current list
    }
  }, []);

  useEffect(() => {
    if (user) fetchAdmins();
  }, [user, fetchAdmins]);

  // Login via backend API
  const login = async (username, password) => {
    try {
      const data = await api.post('/auth/login', { username, password });
      setToken(data.token);
      setUser({ ...data.user, loginAt: new Date().toISOString() });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setAdmins([]);
  };

  // ----- Admin CRUD (backend) -----
  const addAdmin = async (payload) => {
    try {
      await api.post('/auth/admins', payload);
      await fetchAdmins();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const updateAdmin = async (id, payload) => {
    try {
      await api.put(`/auth/admins/${id}`, payload);
      await fetchAdmins();
      // If editing the current user, refresh session
      if (user && user.id === id) {
        const me = await api.get('/auth/me');
        setUser((u) => ({ ...u, ...me }));
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const deleteAdmin = async (id) => {
    try {
      await api.delete(`/auth/admins/${id}`);
      await fetchAdmins();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const toggleAdminActive = async (id) => {
    try {
      await api.patch(`/auth/admins/${id}/toggle`);
      await fetchAdmins();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      admins,
      login,
      logout,
      addAdmin,
      updateAdmin,
      deleteAdmin,
      toggleAdminActive,
      fetchAdmins,
    }),
    [user, admins, fetchAdmins],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
