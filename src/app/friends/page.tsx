'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { translateError } from '@/lib/errorMessages';
import { pairKey } from '@/lib/db';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSound } from '@/hooks/useSound';
import FriendsSidebar from '@/components/friends/FriendsSidebar';
import FriendsMainArea from '@/components/friends/FriendsMainArea';
import InvitesList from '@/components/friends/InvitesList';
import AddFriendForm from '@/components/friends/AddFriendForm';
import NotificationModal from '@/components/friends/modals/NotificationModal';
import ConfirmInviteModal from '@/components/friends/modals/ConfirmInviteModal';
import SuccessModal from '@/components/friends/modals/SuccessModal';
import ConfirmRemoveModal from '@/components/friends/modals/ConfirmRemoveModal';
import {
  loadFriends,
  loadPendingInvites,
  getPendingRequestUserIds,
  type Friend,
  type FriendRequest,
} from '@/services/FriendService';
import { type UserProfile } from '@/services/UserService';
import { usePresence } from '@/hooks/usePresence';

type Message = {
  id: number;
  pair_key: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
};

function FriendsPageContent() {
  const { user } = useAuth();
  const { playClick } = useSound();
  const searchParams = useSearchParams();
  const [view, setView] = useState<'friends' | 'invites' | 'add'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<FriendRequest[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingWpm, setLoadingWpm] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  // Estados para modais
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    userName: string;
    userAvatar?: string | null;
    message: string;
    type?: 'info' | 'success' | 'warning';
  }>({
    isOpen: false,
    userName: '',
    message: '',
  });
  const [confirmInviteModal, setConfirmInviteModal] = useState<{
    isOpen: boolean;
    invite: FriendRequest | null;
    action: 'accept' | 'reject';
  }>({
    isOpen: false,
    invite: null,
    action: 'accept',
  });
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });
  // Sidebar aberta por padrão em desktop, fechada em mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Abrir sidebar automaticamente em desktop
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const supabase = useMemo(() => (hasSupabaseConfig() ? getSupabase() : null), []);

  // Hook de presença para rastrear usuários online
  const { isUserOnline } = usePresence(user?.id ?? null);

  // Criar versão dos amigos com status online
  const friendsWithOnlineStatus = useMemo(() => {
    return friends.map(friend => ({
      ...friend,
      isOnline: isUserOnline(friend.id),
    }));
  }, [friends, isUserOnline]);

  // Ler parâmetros de query para abrir view ou chat
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    const chatParam = searchParams?.get('chat');

    if (tabParam === 'invites' || tabParam === 'add') {
      setView(tabParam as 'invites' | 'add');
    }

    if (chatParam && friends.length > 0) {
      const friend = friends.find(f => f.id === chatParam);
      if (friend) {
        setSelectedFriend(friend);
        setView('friends');
      }
    }
  }, [searchParams, friends]);

  const handleLoadFriends = useCallback(async () => {
    if (!user || !supabase) return;
    try {
      setLoadingWpm(true);
      const friendsList = await loadFriends(supabase, user.id);
      setFriends(friendsList);
    } catch (err: any) {
      console.error('Erro ao carregar amigos:', err);
      setError(`Erro ao carregar amigos: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setLoadingWpm(false);
    }
  }, [user, supabase]);

  const prevInvitesCountRef = useRef<number>(0);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      setInfo(null);
      try {
        if (!user) return;
        if (!supabase) {
          setError('Serviço indisponível. Verifique configuração do Supabase.');
          return;
        }
        await handleLoadFriends();
        const invitesList = await loadPendingInvites(supabase, user.id);
        
        // Detectar novos convites
        if (prevInvitesCountRef.current > 0 && invitesList.length > prevInvitesCountRef.current) {
          const newInvite = invitesList[0]; // O mais recente
          if (newInvite?.sender) {
            setNotificationModal({
              isOpen: true,
              userName: newInvite.sender.display_name ?? 'Usuário',
              userAvatar: newInvite.sender.avatar_url,
              message: 'enviou um convite de amizade!',
              type: 'info',
            });
          }
        }
        
        prevInvitesCountRef.current = invitesList.length;
        setInvites(invitesList);
      } catch (err: any) {
        const errorMsg = translateError(err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, supabase, handleLoadFriends]);

  // Busca de usuários
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      if (!supabase) {
        setResults([]);
        setSearching(false);
        return;
      }

      // Sanitizar query antes de buscar
      const { sanitizeString } = await import('@/utils/validation');
      const sanitizedQuery = sanitizeString(query.trim());

      if (sanitizedQuery.length === 0 || sanitizedQuery.length < 2) {
        setResults([]);
        setSearching(false);
        setError(null); // Não mostrar erro para queries muito curtas
        return;
      }

      setSearching(true);
      setError(null);
      try {
        // Obter token de acesso
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          setResults([]);
          setSearching(false);
          return;
        }

        // Buscar via API
        const searchParams = new URLSearchParams({
          q: sanitizedQuery,
          limit: '30',
        });

        const response = await fetch(`/api/users/search?${searchParams.toString()}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setResults([]);
          // Não exibir erro se for sobre tamanho mínimo da query
          const errorMsg = payload?.error || '';
          if (!errorMsg.includes('pelo menos 2 caracteres')) {
            setError(errorMsg || 'Erro ao buscar usuários');
          }
          return;
        }

        const list = payload?.data || [];

        const me = user.id;
        const friendIds = new Set(friends.map(f => f.id));
        const pendingIds = await getPendingRequestUserIds(supabase, me);

        const exclude = new Set([me, ...friendIds, ...pendingIds]);

        // Remover duplicatas e excluir amigos/convites pendentes
        const unique = new Map<string, UserProfile>();
        for (const r of list) {
          if (r && r.id && !exclude.has(r.id)) {
            unique.set(r.id, r);
          }
        }

        setResults(Array.from(unique.values()));
      } catch (err: any) {
        console.error('Erro na busca:', err);
        setResults([]);
        setError(`Erro ao buscar usuários: ${err?.message || 'Erro desconhecido'}`);
      } finally {
        setSearching(false);
      }
    };

    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [query, user, supabase, friends]);

  // Lógica de mensagens (mantida por enquanto - pode ser extraída para hook depois)
  useEffect(() => {
    let sub: any;
    let channel: any;
    let pollInterval: NodeJS.Timeout | null = null;

    const loadMessages = async () => {
      if (!user || !supabase || !selectedFriend) return;
      const key = pairKey(user.id, selectedFriend.id);

      const { data: rows, error: fetchError } = await supabase
        .from('direct_messages')
        .select('id, pair_key, sender_id, recipient_id, content, created_at')
        .eq('pair_key', key)
        .order('created_at', { ascending: true })
        .limit(200);

      if (fetchError) {
        console.error('❌ Erro ao carregar mensagens:', fetchError);
        return;
      }

      if (rows) {
        setMessages(prev => {
          if (prev.length > 0) {
            const prevIds = new Set(prev.map(m => m.id));
            const newMessages = rows.filter(r => !prevIds.has(r.id));

            const optimisticIdsToRemove = new Set<number>();
            const realMessagesToAdd = new Map<number, Message>();

            rows.forEach((realMsg: Message) => {
              if (realMsg.sender_id === user?.id) {
                const optimisticMessages = prev.filter(m => {
                  if (m.sender_id !== user.id || m.content !== realMsg.content) {
                    return false;
                  }
                  const timeDiff = Math.abs(
                    new Date(m.created_at).getTime() - new Date(realMsg.created_at).getTime()
                  );
                  if (timeDiff > 30000) {
                    return false;
                  }
                  const isOptimistic = m.id >= 1000000000000;
                  return isOptimistic;
                });

                if (optimisticMessages.length > 0) {
                  optimisticMessages.forEach(opt => optimisticIdsToRemove.add(opt.id));
                  if (!prevIds.has(realMsg.id)) {
                    realMessagesToAdd.set(realMsg.id, realMsg);
                  }
                }
              }
            });

            let updated = prev.filter(m => !optimisticIdsToRemove.has(m.id));

            const addedRealIds = new Set<number>();
            realMessagesToAdd.forEach(realMsg => {
              console.log('🔄 Polling: Substituindo mensagem otimista pela real:', realMsg.id);
              updated.push(realMsg);
              addedRealIds.add(realMsg.id);
            });

            const trulyNewMessages = newMessages.filter(m => !addedRealIds.has(m.id));

            if (trulyNewMessages.length > 0) {
              console.log(
                'Novas mensagens encontradas via polling:',
                trulyNewMessages.length,
                trulyNewMessages.map(m => m.id)
              );
              const combined = [...updated, ...trulyNewMessages];
              return combined.sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            }

            return updated.sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
          return rows;
        });
      }
    };

    const subscribe = async () => {
      if (!user || !supabase || !selectedFriend) {
        setMessages([]);
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        return;
      }

      const key = pairKey(user.id, selectedFriend.id);

      await loadMessages();

      pollInterval = setInterval(() => {
        if (selectedFriend && user) {
          console.log('🔄 Polling: verificando novas mensagens...');
          loadMessages().catch(err => {
            console.error('Erro no polling:', err);
          });
        }
      }, 1000);

      const channelName = `dm-${key}`;

      const existingChannel = supabase
        .getChannels()
        .find((ch: any) => ch.topic === `realtime:${channelName}`);
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      channel = supabase.channel(channelName);

      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `pair_key=eq.${key}`,
          },
          (payload: any) => {
            console.log('📨 Nova mensagem recebida via subscription:', payload);
            const newMsg = payload.new;

            if (!newMsg || !newMsg.id) {
              console.error('❌ Mensagem inválida recebida:', payload);
              return;
            }

            setMessages(prev => {
              const exists = prev.some(m => m.id === newMsg.id);
              if (exists) {
                console.log('⚠️ Mensagem já existe, ignorando:', newMsg.id);
                return prev;
              }

              console.log(
                '✅ Adicionando nova mensagem via subscription:',
                newMsg.id,
                'de',
                newMsg.sender_id === user.id ? 'você' : 'outro usuário'
              );

              if (newMsg.sender_id === user.id) {
                const optimisticMessages = prev.filter(m => {
                  if (m.sender_id !== user.id || m.content !== newMsg.content) {
                    return false;
                  }

                  const timeDiff = Math.abs(
                    new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()
                  );
                  if (timeDiff > 30000) {
                    return false;
                  }

                  const isOptimistic = m.id >= 1000000000000;

                  return isOptimistic;
                });

                if (optimisticMessages.length > 0) {
                  console.log(
                    '🔄 Substituindo',
                    optimisticMessages.length,
                    'mensagem(ns) otimista(s) pela real:',
                    newMsg.id
                  );
                  const updated = prev
                    .filter(m => !optimisticMessages.some(opt => opt.id === m.id))
                    .filter(m => m.id !== newMsg.id)
                    .concat([
                      {
                        id: newMsg.id,
                        pair_key: newMsg.pair_key,
                        sender_id: newMsg.sender_id,
                        recipient_id: newMsg.recipient_id,
                        content: newMsg.content,
                        created_at: newMsg.created_at,
                      },
                    ]);
                  return updated.sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                }
              }

              if (newMsg.sender_id === user.id) {
                const duplicate = prev.find(
                  m =>
                    m.sender_id === user.id &&
                    m.content === newMsg.content &&
                    Math.abs(
                      new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()
                    ) < 5000
                );
                if (duplicate) {
                  console.log('⚠️ Mensagem duplicada detectada, ignorando:', newMsg.id);
                  return prev;
                }
              }

              console.log('➕ Adicionando mensagem ao estado');
              const updated = [
                ...prev,
                {
                  id: newMsg.id,
                  pair_key: newMsg.pair_key,
                  sender_id: newMsg.sender_id,
                  recipient_id: newMsg.recipient_id,
                  content: newMsg.content,
                  created_at: newMsg.created_at,
                },
              ];
              return updated.sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          }
        )
        .subscribe((status: string, err?: any) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscribed to channel:', channelName);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel error:', channelName, err);
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️ Channel timeout:', channelName);
          } else if (status === 'CLOSED') {
            console.log('🔒 Channel closed:', channelName);
          } else {
            console.log('📡 Channel status:', status, channelName);
          }
        });

      sub = channel;
    };

    subscribe();

    return () => {
      if (channel && supabase) {
        console.log('Limpando subscription do canal');
        supabase.removeChannel(channel);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (!selectedFriend) {
        setMessages([]);
      }
    };
  }, [selectedFriend?.id, user?.id, supabase]);

  // Remover este useEffect pois o scroll será gerenciado pelo FriendsMainArea

  const handleSendInvite = async (recipientId: string) => {
    setError(null);
    setInfo(null);
    try {
      if (!user || !supabase) {
        setError('Serviço indisponível.');
        return;
      }

      // Obter token de acesso
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      // Enviar convite via API
      const response = await fetch('/api/friends/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          recipient_id: recipientId,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || 'Erro ao enviar convite');
        setTimeout(() => setError(null), 5000);
        return;
      }

      setResults(prev => prev.filter(r => r.id !== recipientId));
      
      // Mostrar modal de sucesso
      const recipient = results.find(r => r.id === recipientId);
      setSuccessModal({
        isOpen: true,
        title: 'Convite enviado!',
        message: `Convite enviado para ${recipient?.display_name ?? 'o usuário'} com sucesso!`,
      });
    } catch (err: any) {
      const errorMsg = translateError(err);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleAcceptInvite = async (reqId: string) => {
    const invite = invites.find(i => i.id === reqId);
    if (invite) {
      setConfirmInviteModal({
        isOpen: true,
        invite,
        action: 'accept',
      });
    }
  };

  const confirmAcceptInvite = async () => {
    const reqId = confirmInviteModal.invite?.id;
    if (!reqId) return;

    setError(null);
    setInfo(null);
    try {
      if (!user || !supabase) {
        setError('Serviço indisponível.');
        return;
      }

      // Obter token de acesso
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      // Aceitar convite via API
      const response = await fetch(`/api/friends/invites/${reqId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || 'Erro ao aceitar convite');
        setTimeout(() => setError(null), 5000);
        return;
      }

      const invite = confirmInviteModal.invite;
      setInvites(list => list.filter(i => i.id !== reqId));
      await new Promise(resolve => setTimeout(resolve, 300));

      await handleLoadFriends();

      // Mostrar modal de sucesso
      setSuccessModal({
        isOpen: true,
        title: 'Convite aceito!',
        message: `${invite?.sender?.display_name ?? 'O amigo'} foi adicionado à sua lista de amigos.`,
      });
    } catch (err: any) {
      const errorMsg = translateError(err);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleRejectInvite = async (reqId: string) => {
    const invite = invites.find(i => i.id === reqId);
    if (invite) {
      setConfirmInviteModal({
        isOpen: true,
        invite,
        action: 'reject',
      });
    }
  };

  const confirmRejectInvite = async () => {
    const reqId = confirmInviteModal.invite?.id;
    if (!reqId) return;

    setError(null);
    setInfo(null);
    try {
      if (!user || !supabase) {
        setError('Serviço indisponível.');
        return;
      }

      // Obter token de acesso
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      // Rejeitar convite via API
      const response = await fetch(`/api/friends/invites/${reqId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || 'Erro ao rejeitar convite');
        return;
      }

      setInvites(list => list.filter(i => i.id !== reqId));
    } catch (err: any) {
      setError(translateError(err));
    }
  };

  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);

  const handleRemoveFriend = (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (friend) {
      setFriendToRemove(friend);
    }
  };

  const confirmRemoveFriend = async () => {
    if (!friendToRemove) return;

    const friendId = friendToRemove.id;
    setError(null);
    setInfo(null);
    try {
      if (!user || !supabase) {
        setError('Serviço indisponível.');
        return;
      }

      // Obter token de acesso
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      // Remover amigo via API
      const response = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || 'Erro ao remover amigo');
        setTimeout(() => setError(null), 5000);
        return;
      }

      // Remover da lista local
      setFriends(prev => prev.filter(f => f.id !== friendId));
      
      // Se o amigo removido estava selecionado, limpar seleção
      if (selectedFriend?.id === friendId) {
        setSelectedFriend(null);
      }

      // Mostrar modal de sucesso
      setSuccessModal({
        isOpen: true,
        title: 'Amigo removido',
        message: `${friendToRemove.display_name ?? 'O amigo'} foi removido da sua lista de amigos.`,
      });
      
      setFriendToRemove(null);
    } catch (err: any) {
      const errorMsg = translateError(err);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
      setFriendToRemove(null);
    }
  };

  const handleSendMessage = async () => {
    setError(null);
    setInfo(null);
    try {
      if (!user || !supabase || !selectedFriend) return;

      const { validateChatMessage } = await import('@/utils/validation');
      const { rateLimiters } = await import('@/utils/security');

      if (!rateLimiters.chatMessage.check()) {
        const timeLeft = Math.ceil(rateLimiters.chatMessage.getTimeUntilReset() / 1000);
        setError(`Muitas mensagens. Aguarde ${timeLeft} segundos.`);
        return;
      }

      const validation = validateChatMessage(msgText);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      const text = validation.sanitized;
      const key = pairKey(user.id, selectedFriend.id);

      // Obter token de acesso
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      // Mensagem otimista
      const tempId = Date.now();
      const optimisticMessage: Message = {
        id: tempId,
        pair_key: key,
        sender_id: user.id,
        recipient_id: selectedFriend.id,
        content: text,
        created_at: new Date().toISOString(),
      };

      setMsgText('');
      setMessages(prev => [...prev, optimisticMessage]);

      // Enviar mensagem via API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          recipient_id: selectedFriend.id,
          content: text,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setError(payload?.error || translateError(new Error('Erro ao enviar mensagem')));
        setMsgText(text);
        return;
      }

      // Atualizar mensagem otimista com dados reais
      if (payload?.data) {
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId
              ? {
                  ...m,
                  id: payload.data.message_id,
                  created_at: payload.data.created_at,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      setError(translateError(err));
    }
  };

  const onMsgKeyDown: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#2b2d2f] flex items-center justify-center px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40">
        <div className="w-full max-w-[90ch] text-white">Você precisa estar logado.</div>
      </div>
    );
  }

  return (
    <div
      className="flex bg-[#2b2d2f]"
      style={{ 
        position: 'fixed',
        top: '56px',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: 'calc(100vh - 56px)',
        maxHeight: 'calc(100vh - 56px)',
        overflow: 'hidden',
        display: 'flex'
      }}
    >
      {/* Sidebar */}
      <FriendsSidebar
        friends={friendsWithOnlineStatus}
        invites={invites}
        selectedFriendId={selectedFriend?.id ?? null}
        onFriendSelect={friend => {
          setSelectedFriend(friend);
          setView('friends');
          setMessages([]);
          // Fechar sidebar em mobile após selecionar
          if (window.innerWidth < 768) {
            setSidebarOpen(false);
          }
        }}
        onInviteClick={() => {
          setView('invites');
          if (window.innerWidth < 768) {
            setSidebarOpen(false);
          }
        }}
        onAddFriendClick={() => {
          setView('add');
          if (window.innerWidth < 768) {
            setSidebarOpen(false);
          }
        }}
        onRemoveFriend={handleRemoveFriend}
        loading={loading}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Área Principal - Sempre visível */}
      <div 
        className="flex-1 flex flex-col bg-[#2b2d2f] relative min-h-0"
        style={{ 
          width: '100%',
          height: '100%',
          minHeight: 0,
          maxHeight: '100%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 0%'
        }}
      >
        {/* Conteúdo Principal */}
        {view === 'friends' && (
          <FriendsMainArea
            selectedFriend={selectedFriend}
            currentUserId={user?.id ?? ''}
            messages={messages}
            messageText={msgText}
            onMessageChange={setMsgText}
            onSendMessage={handleSendMessage}
            onKeyDown={onMsgKeyDown}
            onOpenSidebar={() => {
              playClick();
              setSidebarOpen(true);
            }}
            sidebarOpen={sidebarOpen}
          />
        )}

        {view === 'invites' && (
          <div 
            className="flex-1 overflow-y-auto bg-[#2b2d2f]"
            style={{ width: '100%', height: '100%' }}
          >
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-white text-xl md:text-2xl font-bold">Convites de Amizade</h2>
                <button
                  onClick={() => {
                    playClick();
                    setView('friends');
                  }}
                  className="px-3 md:px-4 py-2 rounded-lg bg-[#3a3c3f] hover:bg-[#4a4c4f] text-white text-sm transition-colors"
                >
                  Voltar
                </button>
              </div>
              <InvitesList
                invites={invites}
                onAccept={handleAcceptInvite}
                onReject={handleRejectInvite}
              />
            </div>
          </div>
        )}

        {view === 'add' && (
          <div 
            className="flex-1 overflow-y-auto bg-[#2b2d2f]"
            style={{ width: '100%', height: '100%' }}
          >
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-white text-xl md:text-2xl font-bold">Adicionar Amigo</h2>
                <button
                  onClick={() => {
                    playClick();
                    setView('friends');
                  }}
                  className="px-3 md:px-4 py-2 rounded-lg bg-[#3a3c3f] hover:bg-[#4a4c4f] text-white text-sm transition-colors"
                >
                  Voltar
                </button>
              </div>
              <AddFriendForm
                query={query}
                onQueryChange={setQuery}
                results={results}
                searching={searching}
                onSendInvite={handleSendInvite}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Mensagens de erro/info */}
        {(error || info) && (
          <div className="absolute top-16 md:top-20 right-2 md:right-4 left-2 md:left-auto z-50 max-w-md md:max-w-md">
            {error && (
              <div className="text-[#ca4754] bg-[#3a1f1f] border border-[#ca4754] rounded-lg p-3 text-sm mb-2">
                {error}
              </div>
            )}
            {!error && info && (
              <div className="text-[#e2b714] bg-[#3a3a1f] border border-[#e2b714] rounded-lg p-3 text-sm">
                {info}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modais */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal(prev => ({ ...prev, isOpen: false }))}
        userName={notificationModal.userName}
        userAvatar={notificationModal.userAvatar}
        message={notificationModal.message}
        type={notificationModal.type}
        onAction={() => {
          setView('invites');
        }}
        actionLabel="Ver convites"
      />

      <ConfirmInviteModal
        isOpen={confirmInviteModal.isOpen}
        onClose={() => setConfirmInviteModal(prev => ({ ...prev, isOpen: false }))}
        userName={confirmInviteModal.invite?.sender?.display_name ?? 'Usuário'}
        userAvatar={confirmInviteModal.invite?.sender?.avatar_url}
        action={confirmInviteModal.action}
        onConfirm={
          confirmInviteModal.action === 'accept' ? confirmAcceptInvite : confirmRejectInvite
        }
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
        title={successModal.title}
        message={successModal.message}
        autoClose={true}
        autoCloseDelay={3000}
      />

      <ConfirmRemoveModal
        isOpen={friendToRemove !== null}
        onClose={() => setFriendToRemove(null)}
        friendName={friendToRemove?.display_name ?? 'Usuário'}
        onConfirm={confirmRemoveFriend}
      />
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#2b2d2f] flex items-center justify-center px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32" style={{ paddingTop: '56px', minHeight: 'calc(100vh - 56px)' }}>
        <div className="w-full max-w-[120ch]">
          <div className="text-white">Carregando...</div>
        </div>
      </div>
    }>
      <FriendsPageContent />
    </Suspense>
  );
}
