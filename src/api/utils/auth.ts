/**
 * Utilitários de autenticação para APIs
 */

import { getSupabaseAnon } from '@/lib/supabaseAdmin';

export type AuthResult =
  | { success: true; userId: string }
  | { success: false; error: string; status: number };

/**
 * Extrai e valida o token de autenticação de uma requisição
 */
export async function validateAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Token de acesso ausente.',
      status: 401,
    };
  }

  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return {
      success: false,
      error: 'Token de acesso inválido.',
      status: 401,
    };
  }

  try {
    const supabase = getSupabaseAnon();
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      return {
        success: false,
        error: 'Sessão inválida ou expirada.',
        status: 401,
      };
    }

    return {
      success: true,
      userId: userData.user.id,
    };
  } catch (err) {
    console.error('Erro ao validar autenticação:', err);
    return {
      success: false,
      error: 'Erro ao validar autenticação.',
      status: 500,
    };
  }
}

