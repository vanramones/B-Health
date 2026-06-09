import { BASE_URL } from '../config/api';

const TOKEN_KEY = 'bh_token';

// ── Token helpers ──
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// ── Core fetch wrapper ──
async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  console.log(`[API] ${options.method || 'GET'} ${BASE_URL}${path}`, { hasToken: !!token });

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  console.log(`[API] Response status: ${res.status}`, data);

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Convenience methods ──
export const api = {
  get:    (path, params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`${path}${qs}`);
  },
  post:   (path, body) => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body) => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body) => request(path, { method: 'PATCH',  body: body ? JSON.stringify(body) : undefined }),
  delete: (path)       => request(path, { method: 'DELETE' }),
};

export default api;
