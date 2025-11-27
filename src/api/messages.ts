/**
 * Lógica de negócio para operações de mensagens (server-side)
 */

import { getSupabaseService } from '@/lib/supabaseAdmin';
import type {
  SendMessageRequestDTO,
  SendMessageResponseDTO,
  MessageErrorResponseDTO,
} from './dto/messages.dto';

/**
 * Gera uma chave de par único para identificar uma conversa entre dois usuários
 */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Verifica se dois usuários são amigos
 */
async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const supabase = getSupabaseService();

  const { data: friend1 } = await supabase
    .from('friends')
    .select('user_a, user_b')
    .eq('user_a', userId1)
    .eq('user_b', userId2)
    .limit(1)
    .maybeSingle();

  const { data: friend2 } = await supabase
    .from('friends')
    .select('user_a, user_b')
    .eq('user_a', userId2)
    .eq('user_b', userId1)
    .limit(1)
    .maybeSingle();

  return (friend1 !== null && friend1 !== undefined) || (friend2 !== null && friend2 !== undefined);
}

/**
 * Envia uma mensagem direta
 */
export async function sendMessage(
  senderId: string,
  request: SendMessageRequestDTO
): Promise<SendMessageResponseDTO | MessageErrorResponseDTO> {
  try {
    const recipientId = request.recipient_id;
    const content = request.content;

    // Validar que não está enviando para si mesmo
    if (senderId === recipientId) {
      return {
        success: false,
        error: 'Você não pode enviar mensagens para si mesmo.',
        status: 400,
      };
    }

    // Verificar se são amigos (opcional - pode ser removido se mensagens forem permitidas para qualquer um)
    const friends = await areFriends(senderId, recipientId);
    if (!friends) {
      return {
        success: false,
        error: 'Você só pode enviar mensagens para seus amigos.',
        status: 403,
      };
    }

    const supabase = getSupabaseService();
    const key = pairKey(senderId, recipientId);

    // Inserir mensagem
    const { data: newMessage, error: insertError } = await supabase
      .from('direct_messages')
      .insert({
        pair_key: key,
        sender_id: senderId,
        recipient_id: recipientId,
        content,
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('Erro ao enviar mensagem:', insertError);
      return {
        success: false,
        error: insertError.message || 'Erro ao enviar mensagem.',
        status: 500,
      };
    }

    return {
      success: true,
      data: {
        message_id: newMessage.id,
        created_at: newMessage.created_at,
      },
    };
  } catch (err) {
    console.error('Erro inesperado ao enviar mensagem:', err);
    return {
      success: false,
      error: 'Erro interno ao enviar mensagem.',
      status: 500,
    };
  }
}

