'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { translateError } from '@/lib/errorMessages';
import { pairKey } from '@/lib/db';
import { useSearchParams } from 'next/navigation';
import ChatWindow from '@/components/chat/ChatWindow';
import FriendsList from '@/components/friends/FriendsList';
import InvitesList from '@/components/friends/InvitesList';
import AddFriendForm from '@/components/friends/AddFriendForm';
import {
  loadFriends,
  loadPendingInvites,
  sendInvite,
  acceptInvite,
  rejectInvite,
  getPendingRequestUserIds,
  type Friend,
  type FriendRequest,
} from '@/services/FriendService';
import { searchUsersMultiStrategy, type UserProfile } from '@/services/UserService';

type Message = {
  id: number;
  pair_key: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
};

export default function FriendsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'friends' | 'invites' | 'add'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<FriendRequest[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingWpm, setLoadingWpm] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const supabase = useMemo(() => (hasSupabaseConfig() ? getSupabase() : null), []);

  // Ler parâmetros de query para abrir aba ou chat
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    const chatParam = searchParams?.get('chat');

    if (tabParam === 'invites' || tabParam === 'add') {
      setTab(tabParam as 'invites' | 'add');
    }

    if (chatParam && friends.length > 0) {
      const friend = friends.find(f => f.id === chatParam);
      if (friend) {
        setSelected(friend);
        setChatOpen(true);
        setTab('friends');
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
      const q = query.trim();
      if (q.length === 0) {
        setResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      setError(null);
      try {
        const me = user.id;
        const friendIds = new Set(friends.map(f => f.id));
        const pendingIds = await getPendingRequestUserIds(supabase, me);

        const exclude = new Set([me, ...friendIds, ...pendingIds]);

        const list = await searchUsersMultiStrategy(supabase, q, 30);

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
      if (!user || !supabase || !selected) return;
      const key = pairKey(user.id, selected.id);

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
      if (!user || !supabase || !selected || !chatOpen) {
        setMessages([]);
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        return;
      }

      const key = pairKey(user.id, selected.id);

      await loadMessages();

      pollInterval = setInterval(() => {
        if (chatOpen && selected && user) {
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
      if (!chatOpen) {
        setMessages([]);
      }
    };
  }, [selected?.id, user?.id, supabase, chatOpen]);

  useEffect(() => {
    if (chatOpen && messages.length > 0) {
      setTimeout(() => {
        try {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch {}
      }, 100);
    }
  }, [messages, chatOpen]);

  const handleSendInvite = async (recipientId: string) => {
    setError(null);
    setInfo(null);
    try {
      if (!user || !supabase) {
        setError('Serviço indisponível.');
        return;
      }

      const friendIds = friends.map(f => f.id);
      const result = await sendInvite(supabase, user.id, recipientId, friendIds);

      if (!result.success) {
        setError(result.error || 'Erro ao enviar convite');
        setTimeout(() => setError(null), 5000);
        return;
      }

      setResults(prev => prev.filter(r => r.id !== recipientId));
      setInfo('Convite enviado com sucesso!');
      setTimeout(() => setInfo(null), 3000);
    } catch (err: any) {
      const errorMsg = translateError(err);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleAcceptInvite = async (reqId: string) => {
    setError(null);
    setInfo(null);
    try {
      if (!user) return;
      if (!supabase) {
        setError('Serviço indisponível.');
        return;
      }

      const result = await acceptInvite(supabase, reqId);
      if (!result.success) {
        setError(result.error || 'Erro ao aceitar convite');
        setTimeout(() => setError(null), 5000);
        return;
      }

      setInvites(list => list.filter(i => i.id !== reqId));
      await new Promise(resolve => setTimeout(resolve, 300));

      await handleLoadFriends();

      setInfo('Convite aceito! O amigo foi adicionado à sua lista.');
      setTimeout(() => setInfo(null), 3000);
    } catch (err: any) {
      const errorMsg = translateError(err);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleRejectInvite = async (reqId: string) => {
    setError(null);
    setInfo(null);
    try {
      if (!supabase) return;
      const result = await rejectInvite(supabase, reqId);
      if (!result.success) {
        setError(result.error || 'Erro ao rejeitar convite');
        return;
      }
      setInvites(list => list.filter(i => i.id !== reqId));
    } catch (err: any) {
      setError(translateError(err));
    }
  };

  const handleSendMessage = async () => {
    setError(null);
    setInfo(null);
    try {
      if (!user || !supabase || !selected) return;

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
      const key = pairKey(user.id, selected.id);

      const tempId = Date.now();
      const optimisticMessage: Message = {
        id: tempId,
        pair_key: key,
        sender_id: user.id,
        recipient_id: selected.id,
        content: text,
        created_at: new Date().toISOString(),
      };

      setMsgText('');

      setMessages(prev => [...prev, optimisticMessage]);

      (async () => {
        try {
          const { error: e } = await supabase.from('direct_messages').insert({
            pair_key: key,
            sender_id: user.id,
            recipient_id: selected.id,
            content: text,
          });

          if (e) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setError(translateError(e));
            setMsgText(text);
          }
        } catch (err: any) {
          setMessages(prev => prev.filter(m => m.id !== tempId));
          setError(translateError(err));
          setMsgText(text);
        }
      })();
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
      <div className="min-h-screen bg-[#323437] flex items-center justify-center px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40">
        <div className="w-full max-w-[90ch] text-white">Você precisa estar logado.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#323437] flex items-center justify-center px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32" style={{ paddingTop: '56px', minHeight: 'calc(100vh - 56px)' }}>
      <div className="w-full max-w-[120ch]">
        <h1 className="text-white text-3xl font-bold mb-6">Amigos</h1>
        <div className="rounded-xl bg-[#2b2d2f] border border-[#3a3c3f] p-4 text-white relative">
          <div
            role="tablist"
            aria-label="Navegação de Amigos"
            className="flex items-center gap-2 mb-4"
          >
            {(['friends', 'invites', 'add'] as const).map(t => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`h-9 px-4 rounded-full text-sm transition-colors ${
                  tab === t ? 'bg-[#e2b714] text-black' : 'text-[#d1d1d1] hover:bg-[#1f2022]'
                }`}
              >
                {t === 'friends' ? 'Amigos' : t === 'invites' ? 'Convites' : 'Adicionar'}
              </button>
            ))}
          </div>

          <div className="min-h-[1.5rem] mb-2" aria-live="polite">
            {error && (
              <div className="text-[#ca4754] bg-[#3a1f1f] border border-[#ca4754] rounded-lg p-2 text-sm">
                {error}
              </div>
            )}
            {!error && info && (
              <div className="text-[#e2b714] bg-[#3a3a1f] border border-[#e2b714] rounded-lg p-2 text-sm">
                {info}
              </div>
            )}
          </div>

          {tab === 'friends' && (
            <FriendsList
              friends={friends}
              loading={loading}
              loadingWpm={loadingWpm}
              onChatClick={friend => {
                setSelected(friend);
                setChatOpen(true);
                setMessages([]);
              }}
            />
          )}

          {tab === 'invites' && (
            <InvitesList
              invites={invites}
              onAccept={handleAcceptInvite}
              onReject={handleRejectInvite}
            />
          )}

          {tab === 'add' && (
            <AddFriendForm
              query={query}
              onQueryChange={setQuery}
              results={results}
              searching={searching}
              onSendInvite={handleSendInvite}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Chat Window */}
      {user && selected && (
        <ChatWindow
          friend={selected}
          currentUserId={user.id}
          messages={messages}
          messageText={msgText}
          onMessageChange={setMsgText}
          onSendMessage={handleSendMessage}
          onClose={() => {
            setChatOpen(false);
            setSelected(null);
          }}
          isOpen={chatOpen}
        />
      )}
    </div>
  );
}
