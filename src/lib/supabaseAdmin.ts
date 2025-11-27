import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

/**
 * Obtém um cliente Supabase com a service role key.
 * Esse cliente deve ser utilizado apenas em ambientes server-side.
 */
export const getSupabaseService = (): SupabaseClient => {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL não configurada. Configure a variável de ambiente no arquivo .env.local ou nas configurações do servidor.'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não configurada. Configure a variável de ambiente no arquivo .env.local ou nas configurações do servidor. Obtenha a chave em: Supabase Dashboard > Project Settings > API > service_role key'
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return adminClient;
};

/**
 * Obtém um cliente Supabase com a anon key para validação de tokens de usuário.
 * Esse cliente deve ser utilizado apenas em ambientes server-side.
 */
export const getSupabaseAnon = (): SupabaseClient => {
  if (anonClient) {
    return anonClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.');
  }

  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.');
  }

  anonClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return anonClient;
};

