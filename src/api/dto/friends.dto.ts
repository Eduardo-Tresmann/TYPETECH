/**
 * DTOs (Data Transfer Objects) para operações de amizades
 */

export type SendInviteRequestDTO = {
  recipient_id: string;
};

export type SendInviteResponseDTO = {
  success: true;
  data: {
    request_id: string;
  };
};

export type AcceptInviteResponseDTO = {
  success: true;
  data: {
    friend_id: string;
  };
};

export type RejectInviteResponseDTO = {
  success: true;
};

export type FriendRequestDTO = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
};

export type FriendDTO = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  best_wpm?: number | null;
};

export type FriendErrorResponseDTO = {
  success: false;
  error: string;
  status: number;
};

/**
 * Valida um SendInviteRequestDTO
 */
export function validateSendInviteRequest(
  data: unknown
): { valid: boolean; error?: string; normalized?: SendInviteRequestDTO } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dados inválidos' };
  }

  const dto = data as Partial<SendInviteRequestDTO>;

  if (!dto.recipient_id || typeof dto.recipient_id !== 'string') {
    return { valid: false, error: 'recipient_id é obrigatório e deve ser uma string' };
  }

  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(dto.recipient_id)) {
    return { valid: false, error: 'recipient_id deve ser um UUID válido' };
  }

  return {
    valid: true,
    normalized: {
      recipient_id: dto.recipient_id,
    },
  };
}

/**
 * Valida um ID de convite
 */
export function validateInviteId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID do convite inválido' };
  }

  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return { valid: false, error: 'ID do convite deve ser um UUID válido' };
  }

  return { valid: true };
}

