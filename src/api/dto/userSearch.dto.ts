/**
 * DTOs (Data Transfer Objects) para busca de usuários
 */

export type SearchUsersRequestDTO = {
  query: string;
  limit?: number;
};

export type SearchUsersResponseDTO = {
  success: true;
  data: UserProfileDTO[];
};

export type UserProfileDTO = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email_prefix?: string | null;
};

export type UserSearchErrorResponseDTO = {
  success: false;
  error: string;
  status: number;
};

/**
 * Valida um SearchUsersRequestDTO
 */
export function validateSearchUsersRequest(
  data: unknown
): { valid: boolean; error?: string; normalized?: SearchUsersRequestDTO } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dados inválidos' };
  }

  const dto = data as Partial<SearchUsersRequestDTO>;

  // Validar query
  if (!dto.query || typeof dto.query !== 'string') {
    return { valid: false, error: 'query é obrigatória e deve ser uma string' };
  }

  const trimmed = dto.query.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Query de busca não pode estar vazia' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Query de busca deve ter pelo menos 2 caracteres' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Query de busca muito longa (máximo 100 caracteres)' };
  }

  // Sanitizar query (remover caracteres perigosos)
  const sanitized = trimmed
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');

  // Validar limit se fornecido
  let limit = dto.limit ?? 30;
  if (typeof dto.limit === 'number') {
    if (dto.limit < 1 || dto.limit > 100) {
      return { valid: false, error: 'limit deve estar entre 1 e 100' };
    }
    limit = dto.limit;
  }

  return {
    valid: true,
    normalized: {
      query: sanitized,
      limit,
    },
  };
}

