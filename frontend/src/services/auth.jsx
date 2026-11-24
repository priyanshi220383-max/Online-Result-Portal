import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return undefined;
    api.get('/auth/me').then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setLoading(false));
    return undefined;
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (username, password) => {
    const r = await api.post('/auth/login', { username, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const homePathFor = (role) => (role === 'student' ? '/my-results' : '/dashboard');
