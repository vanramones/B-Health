import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * Generic CRUD hook for admin pages.
 * @param {string} endpoint - e.g. '/residents'
 * @returns {{ items, loading, error, refresh, createItem, updateItem, deleteItem }}
 */
export default function useCrud(endpoint) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(endpoint);
      console.log(`[useCrud] Fetched from ${endpoint}:`, data);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`[useCrud] Error fetching ${endpoint}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { refresh(); }, [refresh]);

  const createItem = async (payload) => {
    const data = await api.post(endpoint, payload);
    await refresh();
    return data;
  };

  const updateItem = async (id, payload) => {
    const data = await api.put(`${endpoint}/${id}`, payload);
    await refresh();
    return data;
  };

  const deleteItem = async (id) => {
    const data = await api.delete(`${endpoint}/${id}`);
    await refresh();
    return data;
  };

  return { items, setItems, loading, error, refresh, createItem, updateItem, deleteItem };
}
