/**
 * Utilitários para manipulação de avatares e iniciais
 * Centraliza a lógica de exibição de avatares e geração de iniciais
 */

/**
 * Gera iniciais a partir de um nome ou email
 * @param name - Nome de exibição ou email
 * @param fallback - Valor padrão caso o nome esteja vazio (padrão: 'US')
 * @returns Iniciais em maiúsculas (máximo 2 caracteres)
 */
export function getInitials(name: string | null | undefined, fallback = 'US'): string {
  if (!name) return fallback;

  // Se for um email, pegar a parte antes do @
  const displayName = name.includes('@') ? name.split('@')[0] : name;

  // Pegar os primeiros 2 caracteres e converter para maiúsculas
  return displayName.slice(0, 2).toUpperCase();
}

/**
 * Obtém a URL do avatar ou retorna null
 * @param avatarUrl - URL do avatar (pode ser null)
 * @param displayName - Nome de exibição (usado apenas para validação)
 * @returns URL do avatar ou null
 */
export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  _displayName?: string | null
): string | null {
  return avatarUrl || null;
}

/**
 * Trunca um nome de exibição se for muito longo
 * @param displayName - Nome de exibição
 * @param maxLength - Comprimento máximo (padrão: 20)
 * @returns Nome truncado com "..." se necessário
 */
export function truncateDisplayName(
  displayName: string | null | undefined,
  maxLength = 20
): string {
  if (!displayName) return 'amigo';
  if (displayName.length <= maxLength) return displayName;
  return displayName.slice(0, maxLength - 3) + '...';
}
