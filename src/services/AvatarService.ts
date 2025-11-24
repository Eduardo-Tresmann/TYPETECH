/**
 * Serviço para gerenciamento de upload de avatares
 * Centraliza a lógica de upload, validação e processamento de avatares
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { isValidImageMimeType, isValidFileSize, sanitizeFileName } from '@/utils/security';
import { isValidAvatarUrl } from '@/utils/validation';

const MAX_FILE_SIZE_MB = 5;

/**
 * Converte um arquivo File para data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Valida um arquivo de imagem
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!isValidImageMimeType(file.type)) {
    return {
      valid: false,
      error: 'Tipo de arquivo inválido. Use apenas imagens (JPEG, PNG, GIF, WebP).',
    };
  }

  if (!isValidFileSize(file.size, MAX_FILE_SIZE_MB)) {
    return {
      valid: false,
      error: `Arquivo muito grande. O tamanho máximo é ${MAX_FILE_SIZE_MB}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Faz upload de um avatar para o Supabase Storage
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  bucketName: string = 'avatars'
): Promise<{ success: boolean; url?: string; error?: string }> {
  // Validação
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const sanitizedName = sanitizeFileName(file.name);
    const path = `${userId}/${Date.now()}-${sanitizedName}`;
    const storage = supabase.storage.from(bucketName);

    const { error: uploadError } = await storage.upload(path, file, {
      upsert: true,
    });

    if (uploadError) {
      const msg = (uploadError.message ?? '').toLowerCase();
      if (msg.includes('bucket not found')) {
        // Fallback: tentar salvar como data URL
        try {
          const dataUrl = await fileToDataUrl(file);
          return {
            success: true,
            url: dataUrl,
            error: `Bucket "${bucketName}" não encontrado. A imagem foi salva inline temporariamente.`,
          };
        } catch (e) {
          return {
            success: false,
            error: `Bucket de avatares não encontrado. Crie o bucket "${bucketName}" em Storage e defina como público.`,
          };
        }
      } else {
        return { success: false, error: uploadError.message ?? 'Erro ao enviar avatar' };
      }
    }

    const { data: pub } = storage.getPublicUrl(path);
    const url = pub.publicUrl;

    // Validar URL
    if (!isValidAvatarUrl(url)) {
      return {
        success: false,
        error: 'URL de avatar inválida. Use apenas HTTPS de domínios confiáveis.',
      };
    }

    return { success: true, url };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro desconhecido ao fazer upload' };
  }
}

/**
 * Valida uma URL de avatar
 */
export function validateAvatarUrl(url: string | null): { valid: boolean; error?: string } {
  if (!url) return { valid: true };

  if (!isValidAvatarUrl(url)) {
    return {
      valid: false,
      error: 'URL de avatar inválida. Use apenas HTTPS de domínios confiáveis.',
    };
  }

  return { valid: true };
}
