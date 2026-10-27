import { useEffect, useState } from 'react';
import { api } from '../api/api';

// Loads a report from the server whenever the dates (or extra filters) change.
// Usage: const { data, loading, error } = useReport('/reports/daily-sales', from, to);
export function useReport(path, from, to, extraParams = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const query = new URLSearchParams({ from, to, ...extraParams }).toString();

  useEffect(() => {
    let cancelled = false; // ignore old answers if the dates change quickly

    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await api.get(`${path}?${query}`);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [path, query]);

  return { data, loading, error };
}
