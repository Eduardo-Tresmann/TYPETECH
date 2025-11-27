/**
 * DTOs (Data Transfer Objects) para operações de perfil
 * Define a estrutura e validação de dados transferidos entre frontend e backend
 */

export type UpdateProfileRequestDTO = {
  display_name: string | null;
  avatar_url?: string | null;
};

export type UpdateProfileResponseDTO = {
  success: true;
  data: {
    display_name: string | null;
    avatar_url: string | null;
  };
};

export type ProfileErrorResponseDTO = {
  success: false;
  error: string;
  status: number;
};

export type ProfileDTO = {
  display_name: string | null;
  avatar_url: string | null;
};

/**
 * Valida um UpdateProfileRequestDTO
 */
export function validateUpdateProfileRequest(
  data: unknown
): { valid: boolean; error?: string; normalized?: UpdateProfileRequestDTO } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dados inválidos' };
  }

  const dto = data as Partial<UpdateProfileRequestDTO>;

  // Validar display_name
  if (dto.display_name !== null && dto.display_name !== undefined) {
    if (typeof dto.display_name !== 'string') {
      return { valid: false, error: 'display_name deve ser uma string ou null' };
    }

    const trimmed = dto.display_name.trim();
    if (trimmed.length < 3 || trimmed.length > 24) {
      return { valid: false, error: 'display_name deve ter entre 3 e 24 caracteres' };
    }

    // Verificar caracteres válidos
    const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s._-]+$/;
    if (!nameRegex.test(trimmed)) {
      return {
        valid: false,
        error: 'display_name contém caracteres inválidos',
      };
    }
  }

  // Validar avatar_url se fornecido
  if (dto.avatar_url !== undefined && dto.avatar_url !== null) {
    if (typeof dto.avatar_url !== 'string') {
      return { valid: false, error: 'avatar_url deve ser uma string ou null' };
    }
  }

  return {
    valid: true,
    normalized: {
      display_name: dto.display_name ?? null,
      avatar_url: dto.avatar_url ?? null,
    },
  };
}

