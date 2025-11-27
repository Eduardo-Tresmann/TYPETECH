/**
 * DTOs (Data Transfer Objects) para operações de mensagens
 */

export type SendMessageRequestDTO = {
  recipient_id: string;
  content: string;
};

export type SendMessageResponseDTO = {
  success: true;
  data: {
    message_id: number;
    created_at: string;
  };
};

export type MessageErrorResponseDTO = {
  success: false;
  error: string;
  status: number;
};

export type MessageDTO = {
  id: number;
  pair_key: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
};

/**
 * Valida um SendMessageRequestDTO
 */
export function validateSendMessageRequest(
  data: unknown
): { valid: boolean; error?: string; normalized?: SendMessageRequestDTO } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dados inválidos' };
  }

  const dto = data as Partial<SendMessageRequestDTO>;

  // Validar recipient_id
  if (!dto.recipient_id || typeof dto.recipient_id !== 'string') {
    return { valid: false, error: 'recipient_id é obrigatório e deve ser uma string' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(dto.recipient_id)) {
    return { valid: false, error: 'recipient_id deve ser um UUID válido' };
  }

  // Validar content
  if (!dto.content || typeof dto.content !== 'string') {
    return { valid: false, error: 'content é obrigatório e deve ser uma string' };
  }

  const trimmed = dto.content.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Mensagem não pode estar vazia' };
  }

  const MAX_LENGTH = 5000;
  if (trimmed.length > MAX_LENGTH) {
    return {
      valid: false,
      error: `Mensagem muito longa (máximo ${MAX_LENGTH} caracteres)`,
    };
  }

  // Sanitizar conteúdo (remover tags HTML e scripts)
  const sanitized = trimmed
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');

  return {
    valid: true,
    normalized: {
      recipient_id: dto.recipient_id,
      content: sanitized,
    },
  };
}

