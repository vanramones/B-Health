const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

module.exports = db;