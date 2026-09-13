import { supabase } from '../config/supabase';

export const logAuditEvent = async (action, details, userId = null) => {
  try {
    const logEntry = {
      action,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      user_id: userId,
      ip_address: null,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    console.log('[AUDIT]', logEntry);

    const { error } = await supabase
      .from('audit_logs')
      .insert([logEntry]);

    if (error && error.code !== '42P01') {
      console.error('Audit log error:', error);
    }
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
};

export const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  VIEW: 'VIEW',
  EXPORT: 'EXPORT',
  FAILED_LOGIN: 'FAILED_LOGIN',
};
