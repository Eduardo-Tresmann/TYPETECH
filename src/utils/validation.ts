/**
 * Utilitários de validação e sanitização de entrada
 * Protege contra injeção de dados maliciosos
 */

/**
 * Sanitiza string removendo caracteres perigosos
 * Previne XSS e injeção de código
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove caracteres de controle e tags HTML
  return input
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers (onclick=, onerror=, etc)
    .trim();
}

/**
 * Sanitiza HTML mantendo apenas texto seguro
 * Escapa caracteres HTML especiais
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Valida email com regex mais rigoroso
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim().toLowerCase());
}

/**
 * Valida nome de exibição
 * - Entre 3 e 24 caracteres
 * - Apenas letras, números, espaços e alguns caracteres especiais
 * - Não pode começar ou terminar com espaço
 */
export function isValidDisplayName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 24) {
    return false;
  }

  // Permite letras, números, espaços, acentos e alguns caracteres especiais
  const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s._-]+$/;
  if (!nameRegex.test(trimmed)) {
    return false;
  }

  // Não pode começar ou terminar com espaço ou caracteres especiais
  if (/^[\s._-]|[\s._-]$/.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Valida senha
 * - Mínimo 6 caracteres (requisito do Supabase)
 * - Recomendado: 8+ caracteres com mix de letras, números e símbolos
 */
export function isValidPassword(password: string, strict: boolean = false): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push('Senha é obrigatória');
    return { valid: false, errors };
  }

  if (password.length < 6) {
    errors.push('Senha deve ter no mínimo 6 caracteres');
    return { valid: false, errors };
  }

  if (strict) {
    if (password.length < 8) {
      errors.push('Senha deve ter no mínimo 8 caracteres');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida dados de resultado de digitação
 * Previne valores inválidos ou maliciosos
 */
export function validateTypingResult(data: {
  total_time: number;
  wpm: number;
  accuracy: number;
  correct_letters: number;
  incorrect_letters: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar total_time
  if (![15, 30, 60, 120].includes(data.total_time)) {
    errors.push('Duração do teste inválida');
  }

  // Validar WPM (deve ser não-negativo e razoável)
  if (typeof data.wpm !== 'number' || data.wpm < 0 || data.wpm > 1000) {
    errors.push('WPM inválido');
  }

  // Validar accuracy (0-100)
  if (
    typeof data.accuracy !== 'number' ||
    data.accuracy < 0 ||
    data.accuracy > 100
  ) {
    errors.push('Precisão inválida (deve estar entre 0 e 100)');
  }

  // Validar letras corretas e incorretas
  if (
    typeof data.correct_letters !== 'number' ||
    data.correct_letters < 0 ||
    data.correct_letters > 100000
  ) {
    errors.push('Número de letras corretas inválido');
  }

  if (
    typeof data.incorrect_letters !== 'number' ||
    data.incorrect_letters < 0 ||
    data.incorrect_letters > 100000
  ) {
    errors.push('Número de letras incorretas inválido');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida e sanitiza mensagem de chat
 * - Limita tamanho
 * - Remove caracteres perigosos
 */
export function validateChatMessage(message: string): {
  valid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];

  if (!message || typeof message !== 'string') {
    errors.push('Mensagem não pode estar vazia');
    return { valid: false, sanitized: '', errors };
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    errors.push('Mensagem não pode estar vazia');
    return { valid: false, sanitized: '', errors };
  }

  // Limite de caracteres (5000 caracteres)
  const MAX_LENGTH = 5000;
  if (trimmed.length > MAX_LENGTH) {
    errors.push(`Mensagem muito longa (máximo ${MAX_LENGTH} caracteres)`);
    return { valid: false, sanitized: trimmed.slice(0, MAX_LENGTH), errors };
  }

  // Sanitiza mas mantém quebras de linha
  const sanitized = trimmed
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

/**
 * Valida URL de avatar
 * - Deve ser HTTPS
 * - Deve ser de domínio permitido (Supabase Storage ou domínios confiáveis)
 */
export function isValidAvatarUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string') {
    return true; // null/undefined é válido (sem avatar)
  }

  try {
    const parsed = new URL(url);

    // Deve ser HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Verifica se é do Supabase Storage ou domínios confiáveis
    const allowedDomains = [
      'supabase.co',
      'supabase.in',
      'storage.googleapis.com', // Supabase usa GCS
    ];

    const isAllowed = allowedDomains.some((domain) =>
      parsed.hostname.endsWith(domain)
    );

    return isAllowed;
  } catch {
    return false;
  }
}

/**
 * Normaliza email (trim + lowercase)
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}

/**
 * Normaliza nome de exibição (trim + remove espaços extras)
 */
export function normalizeDisplayName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  return name.trim().replace(/\s+/g, ' ');
}

