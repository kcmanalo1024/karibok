import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('SUPABASE URL EXISTS:', Boolean(url));
console.log('SUPABASE KEY EXISTS:', Boolean(key));

export const supabase =
  url && key ? createClient(url, key) : null;