import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing MCP server...');
console.log('Supabase URL:', process.env.VITE_SUPABASE_URL);
console.log('Anon Key exists:', !!process.env.VITE_SUPABASE_ANON_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

try {
  const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
  console.log('Connection test:', error ? 'FAILED' : 'SUCCESS');
  if (error) console.log('Error:', error.message);
} catch (err) {
  console.log('Connection error:', err.message);
}