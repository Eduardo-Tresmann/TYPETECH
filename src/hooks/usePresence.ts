'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook para gerenciar presença online de usuários
 * Usa Supabase Realtime Presence para rastrear quais usuários estão online
 */
export function usePresence(userId: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);

  // Atualizar presença quando o usuário estiver ativo
  useEffect(() => {
    if (!userId || !hasSupabaseConfig()) {
      setIsConnected(false);
      return;
    }

    const supabase = getSupabase();
    const channelName = 'presence:online-users';
    
    // Remover canal existente se houver
    const existingChannel = supabase
      .getChannels()
      .find((ch: any) => ch.topic === `realtime:${channelName}`);
    
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    // Criar novo canal de presença
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Sincronizar estado de presença
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineSet = new Set<string>();
        
        // Extrair todos os IDs de usuários online
        Object.values(state).forEach((presences: any) => {
          if (Array.isArray(presences)) {
            presences.forEach((presence: any) => {
              if (presence.user_id) {
                onlineSet.add(presence.user_id);
              }
            });
          }
        });
        
        setOnlineUsers(onlineSet);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (newPresences && Array.isArray(newPresences)) {
            newPresences.forEach((presence: any) => {
              if (presence.user_id) {
                newSet.add(presence.user_id);
              }
            });
          }
          return newSet;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (leftPresences && Array.isArray(leftPresences)) {
            leftPresences.forEach((presence: any) => {
              if (presence.user_id) {
                newSet.delete(presence.user_id);
              }
            });
          }
          return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Enviar presença inicial
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
          setIsConnected(true);
          isConnectedRef.current = true;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          isConnectedRef.current = false;
        }
      });

    channelRef.current = channel;

    // Atualizar presença periodicamente para manter o usuário online
    const heartbeatInterval = setInterval(async () => {
      if (channelRef.current && isConnectedRef.current) {
        await channelRef.current.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    }, 30000); // A cada 30 segundos

    // Cleanup
    return () => {
      clearInterval(heartbeatInterval);
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      isConnectedRef.current = false;
      setOnlineUsers(new Set());
    };
  }, [userId]);

  // Verificar se um usuário específico está online
  const isUserOnline = useCallback(
    (targetUserId: string) => {
      return onlineUsers.has(targetUserId);
    },
    [onlineUsers]
  );

  // Obter contagem de usuários online
  const getOnlineCount = useCallback(() => {
    return onlineUsers.size;
  }, [onlineUsers]);

  return {
    onlineUsers,
    isUserOnline,
    getOnlineCount,
    isConnected,
  };
}

