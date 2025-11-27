/**
 * Lógica de negócio para busca de usuários (server-side)
 */

import { getSupabaseAnon } from '@/lib/supabaseAdmin';
import { sanitizeString } from '@/utils/validation';
import type {
  SearchUsersRequestDTO,
  SearchUsersResponseDTO,
  UserSearchErrorResponseDTO,
} from './dto/userSearch.dto';

/**
 * Busca usuários usando RPC search_profiles
 */
async function searchProfiles(query: string, limit: number): Promise<any[]> {
  try {
    const supabase = getSupabaseAnon();
    const { data: rpcData, error: rpcErr } = await supabase.rpc('search_profiles', {
      p_query: query,
      p_limit: limit,
    });

    if (rpcErr || !rpcData || !Array.isArray(rpcData)) {
      return [];
    }

    return rpcData;
  } catch {
    return [];
  }
}

/**
 * Busca usuários usando busca direta na tabela profiles
 */
async function searchProfilesDirect(query: string, limit: number): Promise<any[]> {
  try {
    const supabase = getSupabaseAnon();
    const tokens = query.split(/\s+/).filter(Boolean);

    let queryBuilder = supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .not('display_name', 'is', null);

    if (tokens.length > 1) {
      tokens.forEach(token => {
        queryBuilder = queryBuilder.ilike('display_name', `%${token}%`);
      });
    } else {
      queryBuilder = queryBuilder.ilike('display_name', `%${query}%`);
    }

    const { data, error } = await queryBuilder.limit(limit);

    if (error || !data) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}

/**
 * Busca usuários usando RPC search_users
 */
async function searchUsers(query: string, limit: number): Promise<any[]> {
  try {
    const supabase = getSupabaseAnon();
    const { data: usersData, error: usersErr } = await supabase.rpc('search_users', {
      p_query: query,
      p_limit: limit,
    });

    if (usersErr || !usersData) {
      return [];
    }

    const userArray = Array.isArray(usersData) ? usersData : [usersData];
    return userArray;
  } catch {
    return [];
  }
}

/**
 * Busca usuários usando múltiplas estratégias
 */
export async function searchUsersMultiStrategy(
  request: SearchUsersRequestDTO
): Promise<SearchUsersResponseDTO | UserSearchErrorResponseDTO> {
  try {
    const { query, limit } = request;

    // Estratégia 1: RPC search_profiles
    let results = await searchProfiles(query, limit);
    if (results.length > 0) {
      return {
        success: true,
        data: results.map((item: any) => ({
          id: item.id,
          display_name: item.display_name || null,
          avatar_url: item.avatar_url || null,
          email_prefix: item.email_prefix || null,
        })),
      };
    }

    // Estratégia 2: Busca direta na tabela profiles
    results = await searchProfilesDirect(query, limit);
    if (results.length > 0) {
      return {
        success: true,
        data: results.map((item: any) => ({
          id: item.id,
          display_name: item.display_name || null,
          avatar_url: item.avatar_url || null,
          email_prefix: null,
        })),
      };
    }

    // Estratégia 3: RPC search_users
    results = await searchUsers(query, limit);
    return {
      success: true,
      data: results.map((user: any) => ({
        id: user.id,
        display_name: user.display_name || null,
        avatar_url: user.avatar_url || null,
        email_prefix: user.email_prefix || null,
      })),
    };
  } catch (err) {
    console.error('Erro inesperado ao buscar usuários:', err);
    return {
      success: false,
      error: 'Erro interno ao buscar usuários.',
      status: 500,
    };
  }
}

