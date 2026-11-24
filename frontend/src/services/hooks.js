import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/** Loads GET `path` (skipped when path is null) and exposes reload(). */
export function useApi(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!path) { setData(null); setLoading(false); return; }
    setLoading(true);
    setError('');
    try { setData(await api.get(path)); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}
