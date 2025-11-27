/**
 * Lógica de negócio para operações de amizades (server-side)
 */

import { getSupabaseService } from '@/lib/supabaseAdmin';
import type {
  SendInviteRequestDTO,
  SendInviteResponseDTO,
  AcceptInviteResponseDTO,
  RejectInviteResponseDTO,
  FriendErrorResponseDTO,
} from './dto/friends.dto';

/**
 * Envia um convite de amizade
 */
export async function sendInvite(
  senderId: string,
  request: SendInviteRequestDTO
): Promise<SendInviteResponseDTO | FriendErrorResponseDTO> {
  try {
    const recipientId = request.recipient_id;

    // Validar que não está tentando adicionar a si mesmo
    if (senderId === recipientId) {
      return {
        success: false,
        error: 'Você não pode adicionar a si mesmo.',
        status: 400,
      };
    }

    const supabase = getSupabaseService();

    // Verificar se já são amigos
    const { data: existingFriends1 } = await supabase
      .from('friends')
      .select('user_a, user_b')
      .eq('user_a', senderId)
      .eq('user_b', recipientId)
      .limit(1);

    const { data: existingFriends2 } = await supabase
      .from('friends')
      .select('user_a, user_b')
      .eq('user_a', recipientId)
      .eq('user_b', senderId)
      .limit(1);

    if ((existingFriends1 && existingFriends1.length > 0) || (existingFriends2 && existingFriends2.length > 0)) {
      return {
        success: false,
        error: 'Este usuário já é seu amigo.',
        status: 400,
      };
    }

    // Verificar se já existe convite pendente
    const { data: existing1 } = await supabase
      .from('friend_requests')
      .select('id, status')
      .eq('sender_id', senderId)
      .eq('recipient_id', recipientId)
      .eq('status', 'pending')
      .limit(1);

    const { data: existing2 } = await supabase
      .from('friend_requests')
      .select('id, status')
      .eq('sender_id', recipientId)
      .eq('recipient_id', senderId)
      .eq('status', 'pending')
      .limit(1);

    const existing = [...(existing1 ?? []), ...(existing2 ?? [])];

    if (existing && existing.length > 0) {
      return {
        success: false,
        error: 'Já existe um convite pendente com este usuário.',
        status: 400,
      };
    }

    // Criar convite
    const { data: newRequest, error: insertError } = await supabase
      .from('friend_requests')
      .insert({ sender_id: senderId, recipient_id: recipientId })
      .select('id')
      .single();

    if (insertError) {
      console.error('Erro ao enviar convite:', insertError);
      return {
        success: false,
        error: insertError.message || 'Erro ao enviar convite.',
        status: 500,
      };
    }

    return {
      success: true,
      data: {
        request_id: newRequest.id,
      },
    };
  } catch (err) {
    console.error('Erro inesperado ao enviar convite:', err);
    return {
      success: false,
      error: 'Erro interno ao enviar convite.',
      status: 500,
    };
  }
}

/**
 * Aceita um convite de amizade
 */
export async function acceptInvite(
  userId: string,
  requestId: string
): Promise<AcceptInviteResponseDTO | FriendErrorResponseDTO> {
  try {
    const supabase = getSupabaseService();

    // Buscar o convite e verificar se pertence ao usuário
    const { data: invite, error: inviteError } = await supabase
      .from('friend_requests')
      .select('sender_id, recipient_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (inviteError || !invite) {
      return {
        success: false,
        error: 'Convite não encontrado.',
        status: 404,
      };
    }

    // Verificar se o usuário é o destinatário do convite
    if (invite.recipient_id !== userId) {
      return {
        success: false,
        error: 'Você não tem permissão para aceitar este convite.',
        status: 403,
      };
    }

    // Verificar se o convite ainda está pendente
    if (invite.status !== 'pending') {
      return {
        success: false,
        error: 'Este convite já foi processado.',
        status: 400,
      };
    }

    const friendId = invite.sender_id;

    // Aceitar o convite usando RPC
    const { error: rpcError } = await supabase.rpc('accept_friend_request', {
      p_request: requestId,
    });

    if (rpcError) {
      console.error('Erro ao aceitar convite:', rpcError);
      return {
        success: false,
        error: rpcError.message || 'Erro ao aceitar convite.',
        status: 500,
      };
    }

    return {
      success: true,
      data: {
        friend_id: friendId,
      },
    };
  } catch (err) {
    console.error('Erro inesperado ao aceitar convite:', err);
    return {
      success: false,
      error: 'Erro interno ao aceitar convite.',
      status: 500,
    };
  }
}

/**
 * Rejeita um convite de amizade
 */
export async function rejectInvite(
  userId: string,
  requestId: string
): Promise<RejectInviteResponseDTO | FriendErrorResponseDTO> {
  try {
    const supabase = getSupabaseService();

    // Buscar o convite e verificar se pertence ao usuário
    const { data: invite, error: inviteError } = await supabase
      .from('friend_requests')
      .select('recipient_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (inviteError || !invite) {
      return {
        success: false,
        error: 'Convite não encontrado.',
        status: 404,
      };
    }

    // Verificar se o usuário é o destinatário do convite
    if (invite.recipient_id !== userId) {
      return {
        success: false,
        error: 'Você não tem permissão para rejeitar este convite.',
        status: 403,
      };
    }

    // Verificar se o convite ainda está pendente
    if (invite.status !== 'pending') {
      return {
        success: false,
        error: 'Este convite já foi processado.',
        status: 400,
      };
    }

    // Rejeitar o convite
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (updateError) {
      console.error('Erro ao rejeitar convite:', updateError);
      return {
        success: false,
        error: updateError.message || 'Erro ao rejeitar convite.',
        status: 500,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error('Erro inesperado ao rejeitar convite:', err);
    return {
      success: false,
      error: 'Erro interno ao rejeitar convite.',
      status: 500,
    };
  }
}

