import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config/api';

const USER_TOKEN_KEY = 'bh_user_token';
const USER_SESSION_KEY = 'bh_user_session';

export const getUserToken = () => localStorage.getItem(USER_TOKEN_KEY);
const setUserToken = (t) => localStorage.setItem(USER_TOKEN_KEY, t);
const clearUserToken = () => localStorage.removeItem(USER_TOKEN_KEY);

async function userRequest(path, options = {}) {
  const token = getUserToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const userApi = {
  get:    (path) => userRequest(path),
  post:   (path, body) => userRequest(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body) => userRequest(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)       => userRequest(path, { method: 'DELETE' }),
};

const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
  }, [currentUser]);

  const register = async ({ username, password, full_name, phone, purok }) => {
    try {
      await userApi.post('/auth/user/register', { username, password, full_name, phone, purok });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const login = async (username, password) => {
    try {
      const data = await userApi.post('/auth/user/login', { username, password });
      setUserToken(data.token);
      setCurrentUser(data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const logout = () => {
    clearUserToken();
    setCurrentUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const data = await userApi.get('/auth/user/me');
      setCurrentUser((u) => ({ ...u, ...data }));
    } catch { /* token expired — silently ignore */ }
  }, []);

  return (
    <UserAuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, login, logout, register, refreshUser }}>
      {children}
    </UserAuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
};
