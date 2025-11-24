/**
 * Serviço para gerenciamento de perfis de usuário
 * Centraliza a lógica de validação, busca e atualização de perfis
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { isValidDisplayName, normalizeDisplayName } from '@/utils/validation';

export type Profile = {
  display_name: string | null;
  avatar_url: string | null;
};

/**
 * Busca o perfil de um usuário
 */
export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Cria um perfil inicial para um usuário
 */
export async function createInitialProfile(
  supabase: SupabaseClient,
  userId: string,
  defaultName: string
): Promise<Profile> {
  const initial = {
    id: userId,
    display_name: defaultName,
    avatar_url: null,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(initial, { onConflict: 'id' });

  if (upsertError) {
    throw upsertError;
  }

  return {
    display_name: defaultName,
    avatar_url: null,
  };
}

/**
 * Valida e normaliza um nome de exibição
 */
export function validateDisplayName(displayName: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const normalized = normalizeDisplayName(displayName);

  if (!isValidDisplayName(normalized)) {
    return {
      valid: false,
      error:
        'O nome do perfil deve ter entre 3 e 24 caracteres e conter apenas letras, números, espaços e alguns caracteres especiais.',
    };
  }

  return { valid: true, normalized };
}

/**
 * Verifica se um nome de exibição já está em uso
 */
export async function isDisplayNameTaken(
  supabase: SupabaseClient,
  displayName: string,
  excludeUserId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .neq('id', excludeUserId)
    .ilike('display_name', displayName);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

/**
 * Atualiza o perfil de um usuário
 */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  displayName: string | null,
  avatarUrl: string | null
): Promise<void> {
  const toSave = {
    id: userId,
    display_name: displayName,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(toSave, { onConflict: 'id' });

  if (upsertError) {
    throw upsertError;
  }
}
