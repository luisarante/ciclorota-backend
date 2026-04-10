import { createClient } from '@supabase/supabase-js';
import { loadEnvironment } from './loadEnv.js';

loadEnvironment();

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || supabaseServiceKey;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltam as credenciais do Supabase no arquivo .env');
}

function createConfiguredClient(key: string) {
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

export const supabaseAdmin = createConfiguredClient(supabaseServiceKey);

export function createSupabaseAuthClient() {
  return createConfiguredClient(supabaseAnonKey);
}
