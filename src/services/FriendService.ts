/**
 * Serviço para gerenciamento de amigos e convites
 * Centraliza a lógica de amigos, convites e relacionamentos
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { fetchUserResults } from '@/lib/db';
import { fetchProfilesWithFallback, type UserProfile } from './UserService';

export type Friend = UserProfile & {
  bestWpm: number | null;
};

export type FriendRequest = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  sender?: UserProfile;
};

/**
 * Busca todos os amigos de um usuário
 */
export async function loadFriends(supabase: SupabaseClient, userId: string): Promise<Friend[]> {
  // Buscar amigos - usar duas queries separadas para evitar problemas com OR
  const { data: frs1, error: e1a } = await supabase
    .from('friends')
    .select('user_a, user_b, created_at')
    .eq('user_a', userId);

  const { data: frs2, error: e1b } = await supabase
    .from('friends')
    .select('user_a, user_b, created_at')
    .eq('user_b', userId);

  if (e1a) {
    console.error('Erro ao buscar amigos (user_a):', e1a);
    throw e1a;
  }
  if (e1b) {
    console.error('Erro ao buscar amigos (user_b):', e1b);
    throw e1b;
  }

  const allFriends = [...(frs1 ?? []), ...(frs2 ?? [])];
  const friendIds = allFriends.map((r: any) => (r.user_a === userId ? r.user_b : r.user_a));

  if (friendIds.length === 0) {
    return [];
  }

  // Buscar perfis com fallback
  const profiles = await fetchProfilesWithFallback(supabase, friendIds);

  // Buscar melhor WPM de cada amigo
  const friendsWithWpm: Friend[] = await Promise.all(
    profiles.map(async profile => {
      let bestWpm: number | null = null;
      try {
        const { data: results } = await fetchUserResults(profile.id);
        if (results && Array.isArray(results) && results.length > 0) {
          const maxWpm = Math.max(...results.map((r: any) => r.wpm || 0));
          bestWpm = maxWpm > 0 ? maxWpm : null;
        }
      } catch {
        // Ignorar erros ao buscar WPM
        bestWpm = null;
      }

      return {
        ...profile,
        bestWpm,
      };
    })
  );

  return friendsWithWpm;
}

/**
 * Busca convites pendentes recebidos por um usuário
 */
export async function loadPendingInvites(
  supabase: SupabaseClient,
  userId: string
): Promise<FriendRequest[]> {
  const { data: inv, error: e3 } = await supabase
    .from('friend_requests')
    .select('id, sender_id, recipient_id, status, created_at')
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (e3) throw e3;

  const senderIds = (inv ?? []).map((i: any) => i.sender_id);
  if (senderIds.length === 0) {
    return (inv ?? []).map((i: any) => ({ ...i, sender: undefined }));
  }

  // Buscar perfis dos remetentes com fallback
  const senders = await fetchProfilesWithFallback(supabase, senderIds);

  return (inv ?? []).map((i: any) => ({
    ...i,
    sender: senders.find(s => s.id === i.sender_id),
  }));
}

/**
 * Envia um convite de amizade
 */
export async function sendInvite(
  supabase: SupabaseClient,
  senderId: string,
  recipientId: string,
  existingFriendIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (senderId === recipientId) {
    return { success: false, error: 'Você não pode adicionar a si mesmo.' };
  }

  // Verificar se já é amigo
  if (existingFriendIds.includes(recipientId)) {
    return { success: false, error: 'Este usuário já é seu amigo.' };
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
    };
  }

  const { error: e } = await supabase
    .from('friend_requests')
    .insert({ sender_id: senderId, recipient_id: recipientId });

  if (e) {
    return { success: false, error: e.message };
  }

  return { success: true };
}

/**
 * Aceita um convite de amizade
 */
export async function acceptInvite(
  supabase: SupabaseClient,
  requestId: string
): Promise<{ success: boolean; error?: string; friendId?: string }> {
  // Buscar o convite para obter o sender_id
  const { data: invite, error: inviteError } = await supabase
    .from('friend_requests')
    .select('sender_id, recipient_id')
    .eq('id', requestId)
    .maybeSingle();

  if (inviteError || !invite) {
    return { success: false, error: 'Convite não encontrado.' };
  }

  const friendId = invite.sender_id;

  // Aceitar o convite usando RPC
  const { error: e } = await supabase.rpc('accept_friend_request', {
    p_request: requestId,
  });

  if (e) {
    return { success: false, error: e.message };
  }

  return { success: true, friendId };
}

/**
 * Rejeita um convite de amizade
 */
export async function rejectInvite(
  supabase: SupabaseClient,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const { error: e } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  if (e) {
    return { success: false, error: e.message };
  }

  return { success: true };
}

/**
 * Busca IDs de usuários que têm convites pendentes com o usuário atual
 */
export async function getPendingRequestUserIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data: pendingReqs } = await supabase
    .from('friend_requests')
    .select('sender_id, recipient_id')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .eq('status', 'pending')
    .limit(100);

  if (!pendingReqs) return [];

  const exclude = new Set<string>();
  pendingReqs.forEach((req: any) => {
    if (req.sender_id === userId) exclude.add(req.recipient_id);
    if (req.recipient_id === userId) exclude.add(req.sender_id);
  });

  return Array.from(exclude);
}
