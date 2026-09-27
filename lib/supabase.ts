import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keyljrshzozuzzjhqiix.supabase.co';

export const db = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('Supabase service key is not configured.');
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};
