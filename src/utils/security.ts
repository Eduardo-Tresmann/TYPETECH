/**
 * Utilitários de segurança
 * Rate limiting, proteção CSRF, etc.
 */

/**
 * Rate Limiter simples baseado em localStorage
 * Para produção, use um serviço backend ou Redis
 */
export class RateLimiter {
  private key: string;
  private maxRequests: number;
  private windowMs: number;

  constructor(key: string, maxRequests: number, windowMs: number) {
    this.key = `ratelimit_${key}`;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Verifica se a requisição está dentro do limite
   * Retorna true se permitido, false se excedido
   */
  check(): boolean {
    if (typeof window === 'undefined') {
      return true; // Server-side, sempre permitir
    }

    try {
      const stored = localStorage.getItem(this.key);
      const now = Date.now();

      if (!stored) {
        // Primeira requisição
        localStorage.setItem(
          this.key,
          JSON.stringify({ count: 1, resetAt: now + this.windowMs })
        );
        return true;
      }

      const data = JSON.parse(stored) as {
        count: number;
        resetAt: number;
      };

      // Janela expirou, resetar
      if (now > data.resetAt) {
        localStorage.setItem(
          this.key,
          JSON.stringify({ count: 1, resetAt: now + this.windowMs })
        );
        return true;
      }

      // Verificar limite
      if (data.count >= this.maxRequests) {
        return false;
      }

      // Incrementar contador
      data.count++;
      localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      // Em caso de erro, permitir (fail open)
      return true;
    }
  }

  /**
   * Obtém tempo restante até o reset (em ms)
   */
  getTimeUntilReset(): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    try {
      const stored = localStorage.getItem(this.key);
      if (!stored) {
        return 0;
      }

      const data = JSON.parse(stored) as {
        count: number;
        resetAt: number;
      };
      const now = Date.now();
      return Math.max(0, data.resetAt - now);
    } catch {
      return 0;
    }
  }

  /**
   * Reseta o contador manualmente
   */
  reset(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.key);
    }
  }
}

/**
 * Rate limiters pré-configurados
 */
export const rateLimiters = {
  // Limite de login: 5 tentativas por 15 minutos
  login: new RateLimiter('login', 5, 15 * 60 * 1000),

  // Limite de registro: 3 tentativas por hora
  register: new RateLimiter('register', 3, 60 * 60 * 1000),

  // Limite de envio de mensagens: 30 por minuto
  chatMessage: new RateLimiter('chat_message', 30, 60 * 1000),

  // Limite de salvamento de resultados: 100 por hora
  saveResult: new RateLimiter('save_result', 100, 60 * 60 * 1000),

  // Limite de atualização de perfil: 10 por hora
  updateProfile: new RateLimiter('update_profile', 10, 60 * 60 * 1000),
};

/**
 * Gera token CSRF simples (para proteção adicional)
 * Em produção, use tokens mais robustos
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      ''
    );
  }
  // Fallback para ambientes sem crypto
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Valida token CSRF
 */
export function validateCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) {
    return false;
  }
  return token === storedToken;
}

/**
 * Sanitiza nome de arquivo para upload seguro
 */
export function sanitizeFileName(fileName: string): string {
  // Remove caracteres perigosos e limita tamanho
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\./g, '_') // Previne path traversal
    .slice(0, 255); // Limite de tamanho
}

/**
 * Valida tipo MIME de arquivo de imagem
 */
export function isValidImageMimeType(mimeType: string): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Valida tamanho de arquivo (em bytes)
 */
export function isValidFileSize(size: number, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size > 0 && size <= maxSizeBytes;
}

