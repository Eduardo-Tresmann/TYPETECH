/**
 * Lógica de negócio para operações de perfil (server-side)
 */

import { Buffer } from 'buffer';
import { getSupabaseService } from '@/lib/supabaseAdmin';
import { normalizeDisplayName, isValidDisplayName, isValidAvatarUrl } from '@/utils/validation';
import { sanitizeFileName, isValidImageMimeType, isValidFileSize } from '@/utils/security';
import type {
  UpdateProfileRequestDTO,
  UpdateProfileResponseDTO,
  ProfileErrorResponseDTO,
} from './dto/profile.dto';

const MAX_FILE_SIZE_MB = 5;
const AVATARS_BUCKET = 'avatars';

/**
 * Verifica se um nome de exibição já está em uso
 */
async function isDisplayNameTaken(
  displayName: string,
  excludeUserId: string
): Promise<boolean> {
  const supabase = getSupabaseService();
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .neq('id', excludeUserId)
    .ilike('display_name', displayName);

  if (error) {
    console.error('Erro ao verificar nome duplicado:', error);
    throw new Error('Erro ao verificar disponibilidade do nome');
  }

  return (count ?? 0) > 0;
}

/**
 * Atualiza o perfil de um usuário
 */
export async function updateProfile(
  userId: string,
  request: UpdateProfileRequestDTO
): Promise<UpdateProfileResponseDTO | ProfileErrorResponseDTO> {
  try {
    const supabase = getSupabaseService();

    // Normalizar e validar display_name se fornecido
    let displayName: string | null = null;
    if (request.display_name !== null && request.display_name !== undefined) {
      const normalized = normalizeDisplayName(request.display_name);
      if (!isValidDisplayName(normalized)) {
        return {
          success: false,
          error:
            'O nome do perfil deve ter entre 3 e 24 caracteres e conter apenas letras, números, espaços e alguns caracteres especiais.',
          status: 400,
        };
      }

      // Verificar se o nome já está em uso
      const taken = await isDisplayNameTaken(normalized, userId);
      if (taken) {
        return {
          success: false,
          error: 'Este nome de perfil já está em uso.',
          status: 400,
        };
      }

      displayName = normalized;
    }

    // Validar avatar_url se fornecido
    let avatarUrl: string | null = request.avatar_url ?? null;
    if (avatarUrl !== null && avatarUrl !== undefined) {
      if (typeof avatarUrl !== 'string') {
        return {
          success: false,
          error: 'avatar_url deve ser uma string ou null',
          status: 400,
        };
      }

      // Validar URL apenas se não for data URL (data URLs são aceitas temporariamente)
      if (!avatarUrl.startsWith('data:image/') && !isValidAvatarUrl(avatarUrl)) {
        return {
          success: false,
          error: 'URL de avatar inválida. Use apenas HTTPS de domínios confiáveis.',
          status: 400,
        };
      }
    }

    // Buscar perfil atual para preservar valores não alterados
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    // Preparar dados para atualização
    const toSave = {
      id: userId,
      display_name: displayName ?? currentProfile?.display_name ?? null,
      avatar_url: avatarUrl ?? currentProfile?.avatar_url ?? null,
      updated_at: new Date().toISOString(),
    };

    // Atualizar no banco
    const { error: upsertError } = await supabase.from('profiles').upsert(toSave, {
      onConflict: 'id',
    });

    if (upsertError) {
      console.error('Erro ao atualizar perfil:', upsertError);
      return {
        success: false,
        error: 'Não foi possível atualizar o perfil.',
        status: 500,
      };
    }

    return {
      success: true,
      data: {
        display_name: toSave.display_name,
        avatar_url: toSave.avatar_url,
      },
    };
  } catch (err) {
    console.error('Erro inesperado ao atualizar perfil:', err);
    return {
      success: false,
      error: 'Erro interno ao atualizar perfil.',
      status: 500,
    };
  }
}

/**
 * Valida um arquivo de imagem para upload
 */
function validateImageFile(file: File): { valid: boolean; error?: string } {
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
 * Faz upload de um avatar via FormData
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ success: true; url: string } | ProfileErrorResponseDTO> {
  try {
    // Validar arquivo
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Arquivo inválido',
        status: 400,
      };
    }

    const supabase = getSupabaseService();
    const sanitizedName = sanitizeFileName(file.name);
    const path = `${userId}/${Date.now()}-${sanitizedName}`;
    const storage = supabase.storage.from(AVATARS_BUCKET);

    // Converter File para ArrayBuffer e depois para Buffer para upload no servidor
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await storage.upload(path, buffer, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });

    if (uploadError) {
      console.error('Erro ao fazer upload do avatar:', uploadError);
      return {
        success: false,
        error: 'Erro ao fazer upload do avatar. Verifique se o bucket está configurado corretamente.',
        status: 500,
      };
    }

    const { data: pub } = storage.getPublicUrl(path);
    const url = pub.publicUrl;

    // Validar URL gerada
    if (!isValidAvatarUrl(url)) {
      return {
        success: false,
        error: 'URL de avatar inválida gerada pelo storage.',
        status: 500,
      };
    }

    return {
      success: true,
      url,
    };
  } catch (err) {
    console.error('Erro inesperado ao fazer upload do avatar:', err);
    return {
      success: false,
      error: 'Erro interno ao fazer upload do avatar.',
      status: 500,
    };
  }
}

