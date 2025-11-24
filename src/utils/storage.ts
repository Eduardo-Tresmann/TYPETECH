/**
 * Utilitários para gerenciamento de localStorage de perfis
 * Centraliza a lógica de cache de dados de perfil
 */

const PROFILE_DISPLAY_NAME_KEY = 'profile.display_name';
const PROFILE_AVATAR_URL_KEY = 'profile.avatar_url';
const PROFILE_CACHE_PREFIX = 'profile.cache.';

/**
 * Obtém o nome de exibição do perfil do cache
 */
export function getCachedDisplayName(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(PROFILE_DISPLAY_NAME_KEY);
  } catch {
    return null;
  }
}

/**
 * Obtém a URL do avatar do perfil do cache
 */
export function getCachedAvatarUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(PROFILE_AVATAR_URL_KEY);
  } catch {
    return null;
  }
}

/**
 * Salva o nome de exibição do perfil no cache
 */
export function setCachedDisplayName(displayName: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (displayName) {
      localStorage.setItem(PROFILE_DISPLAY_NAME_KEY, displayName);
    } else {
      localStorage.removeItem(PROFILE_DISPLAY_NAME_KEY);
    }
  } catch {
    // Ignorar erros de localStorage
  }
}

/**
 * Salva a URL do avatar do perfil no cache
 */
export function setCachedAvatarUrl(avatarUrl: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (avatarUrl) {
      localStorage.setItem(PROFILE_AVATAR_URL_KEY, avatarUrl);
    } else {
      localStorage.removeItem(PROFILE_AVATAR_URL_KEY);
    }
  } catch {
    // Ignorar erros de localStorage
  }
}

/**
 * Salva ambos os dados do perfil no cache
 */
export function setCachedProfile(displayName: string | null, avatarUrl: string | null): void {
  setCachedDisplayName(displayName);
  setCachedAvatarUrl(avatarUrl);
}

/**
 * Obtém dados de perfil de outro usuário do cache
 */
export function getCachedProfileForUser(
  userId: string
): { display_name: string | null; avatar_url: string | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Salva dados de perfil de outro usuário no cache
 */
export function setCachedProfileForUser(
  userId: string,
  displayName: string | null,
  avatarUrl: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${PROFILE_CACHE_PREFIX}${userId}`,
      JSON.stringify({ display_name: displayName, avatar_url: avatarUrl })
    );
  } catch {
    // Ignorar erros de localStorage
  }
}
