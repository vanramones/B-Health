import { useEffect } from 'react';
import { supabase } from '../config/supabase';

/**
 * Universal realtime hook — gamitin sa kahit anong table
 * @param {string} table — pangalan ng table (e.g. 'appointments')
 * @param {function} onUpdate — callback na tatawag pag may changes
 * @param {string} event — 'INSERT' | 'UPDATE' | 'DELETE' | '*' (default: '*')
 */
const useRealtimeTable = (table, onUpdate, event = '*') => {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [table, onUpdate, event]);
};

export default useRealtimeTable;  