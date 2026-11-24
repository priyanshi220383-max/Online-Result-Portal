// Thin fetch wrapper. The API address comes from VITE_API_URL (see .env.example),
// so the same build works locally (/api via the Vite proxy) and in production.
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'result_portal_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/login')) {
      setToken(null);
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(data?.message || `Request failed (${res.status}).`, res.status);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  put: (p, b) => request('PUT', p, b ?? {}),
  patch: (p, b) => request('PATCH', p, b ?? {}),
  del: (p) => request('DELETE', p),
};

export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};
