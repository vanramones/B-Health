import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ymndmujraysmbdbesydb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_07QgZ4uWzZa5_dn9Whal_w_HdPvN7EE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);