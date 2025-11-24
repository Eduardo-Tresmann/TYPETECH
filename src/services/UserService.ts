/**
 * Serviço para busca e gerenciamento de usuários e perfis
 * Centraliza a lógica de busca de perfis, fallback para user_basic, etc.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

/**
 * Busca um perfil na tabela profiles
 */
export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar perfil:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    display_name: data.display_name,
    avatar_url: data.avatar_url,
  };
}

/**
 * Busca múltiplos perfis na tabela profiles
 */
export async function fetchProfiles(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  if (error) {
    console.error('Erro ao buscar perfis:', error);
    return [];
  }

  return (data || []).map(p => ({
    id: p.id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
  }));
}

/**
 * Busca informações básicas de usuário usando RPC user_basic
 * Usado como fallback quando o perfil não existe na tabela profiles
 */
export async function fetchUserBasic(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  try {
    const { data: userBasic, error: userErr } = await supabase.rpc('user_basic', {
      p_user: userId,
    });

    if (userErr) {
      const errorMsg = userErr.message || String(userErr);
      if (!errorMsg.includes('Could not find the function') && !errorMsg.includes('schema cache')) {
        console.error('Erro ao buscar user_basic:', userErr);
      }
      return null;
    }

    if (!userBasic) return null;

    const userArray = Array.isArray(userBasic) ? userBasic : [userBasic];
    const user = userArray.length > 0 ? userArray[0] : null;

    if (user && user.id) {
      return {
        id: user.id,
        display_name: user.display_name || 'Usuário',
        avatar_url: user.avatar_url || null,
      };
    }

    return null;
  } catch (rpcErr) {
    // Ignorar erros silenciosamente
    return null;
  }
}

/**
 * Busca um perfil com fallback para user_basic
 * Primeiro tenta buscar na tabela profiles, se não encontrar, tenta user_basic
 */
export async function fetchProfileWithFallback(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  // Primeiro tenta buscar na tabela profiles
  const profile = await fetchProfile(supabase, userId);
  if (profile) return profile;

  // Se não encontrou, tenta user_basic
  return fetchUserBasic(supabase, userId);
}

/**
 * Busca múltiplos perfis com fallback para user_basic
 * Para cada ID que não foi encontrado na tabela profiles, tenta user_basic
 */
export async function fetchProfilesWithFallback(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];

  // Primeiro busca na tabela profiles
  const profiles = await fetchProfiles(supabase, userIds);
  const foundIds = new Set(profiles.map(p => p.id));
  const missingIds = userIds.filter(id => !foundIds.has(id));

  // Para cada ID não encontrado, tenta user_basic
  const fallbackProfiles: UserProfile[] = [];
  for (const missingId of missingIds) {
    const fallback = await fetchUserBasic(supabase, missingId);
    if (fallback) {
      fallbackProfiles.push(fallback);
    }
  }

  return [...profiles, ...fallbackProfiles];
}

/**
 * Busca usuários usando RPC search_profiles
 */
export async function searchProfiles(
  supabase: SupabaseClient,
  query: string,
  limit = 30
): Promise<UserProfile[]> {
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('search_profiles', {
      p_query: query,
      p_limit: limit,
    });

    if (rpcErr || !rpcData || !Array.isArray(rpcData)) {
      return [];
    }

    return rpcData.map((item: any) => ({
      id: item.id,
      display_name: item.display_name || 'Usuário',
      avatar_url: item.avatar_url || null,
    }));
  } catch {
    return [];
  }
}

/**
 * Busca usuários usando RPC search_users
 */
export async function searchUsers(
  supabase: SupabaseClient,
  query: string,
  limit = 30
): Promise<UserProfile[]> {
  try {
    const { data: usersData, error: usersErr } = await supabase.rpc('search_users', {
      p_query: query,
      p_limit: limit,
    });

    if (usersErr || !usersData) {
      return [];
    }

    const userArray = Array.isArray(usersData) ? usersData : [usersData];
    return userArray.map((user: any) => ({
      id: user.id,
      display_name: user.display_name || 'Usuário',
      avatar_url: user.avatar_url || null,
    }));
  } catch {
    return [];
  }
}

/**
 * Busca usuários usando busca direta na tabela profiles com ILIKE
 */
export async function searchProfilesDirect(
  supabase: SupabaseClient,
  query: string,
  limit = 30
): Promise<UserProfile[]> {
  const tokens = query.split(/\s+/).filter(Boolean);

  let queryBuilder = supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .not('display_name', 'is', null);

  if (tokens.length > 1) {
    // Múltiplos tokens: aplicar ILIKE para cada um
    tokens.forEach(token => {
      queryBuilder = queryBuilder.ilike('display_name', `%${token}%`);
    });
  } else {
    // Um único token
    queryBuilder = queryBuilder.ilike('display_name', `%${query}%`);
  }

  const { data, error } = await queryBuilder.limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(p => ({
    id: p.id,
    display_name: p.display_name || 'Usuário',
    avatar_url: p.avatar_url || null,
  }));
}

/**
 * Busca usuários usando múltiplas estratégias
 * Tenta search_profiles, depois busca direta, depois search_users
 */
export async function searchUsersMultiStrategy(
  supabase: SupabaseClient,
  query: string,
  limit = 30
): Promise<UserProfile[]> {
  // Estratégia 1: RPC search_profiles
  let results = await searchProfiles(supabase, query, limit);
  if (results.length > 0) {
    return results;
  }

  // Estratégia 2: Busca direta na tabela profiles
  results = await searchProfilesDirect(supabase, query, limit);
  if (results.length > 0) {
    return results;
  }

  // Estratégia 3: RPC search_users
  results = await searchUsers(supabase, query, limit);
  return results;
}
