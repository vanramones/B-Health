// Admin API — now talks DIRECTLY to Supabase (works even if the backend/laptop is off).
import { supabaseApi } from '../services/supabaseApi';

const TOKEN_KEY = 'bh_token';

// ── Token helpers (kept for compatibility with the auth context) ──
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// ── Convenience methods (same interface as before) ──
export const api = supabaseApi;

export default api;
