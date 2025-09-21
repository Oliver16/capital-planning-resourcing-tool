import { createClient } from '@supabase/supabase-js';

const readEnv = (...keys) =>
  keys
    .map((key) => process.env[key])
    .find((value) => value !== undefined && value !== null && value !== '');

const supabaseUrl = readEnv(
  'REACT_APP_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
  'STORAGE_NEXT_PUBLIC_SUPABASE_URL',
  'STORAGE_SUPABASE_URL'
);

const supabaseAnonKey = readEnv(
  'REACT_APP_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'STORAGE_SUPABASE_ANON_KEY'
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase client is missing configuration. Provide Supabase URL and anon key environment variables (see README for supported names).'
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;
