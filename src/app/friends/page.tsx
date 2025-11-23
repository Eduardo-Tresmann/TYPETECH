'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { translateError } from '@/lib/errorMessages';
import { pairKey, fetchUserResults } from '@/lib/db';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ChatWindow from '@/components/ChatWindow';

type Friend = { id: string; display_name: string | null; avatar_url: string | null; bestWpm: number | null };
type Invite = { id: string; sender_id: string; recipient_id: string; status: string; created_at: string; sender?: Friend; };
type Message = { id: number; pair_key: string; sender_id: string; recipient_id: string; content: string; created_at: string };

export default function FriendsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'friends'|'invites'|'add'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Friend[]>([]);
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

  const supabase = useMemo(() => hasSupabaseConfig() ? getSupabase() : null, []);

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

  const loadFriends = useCallback(async () => {
    if (!user || !supabase) return;
    try {
      const me = user.id;
      
      // Buscar amigos - usar duas queries separadas para evitar problemas com OR
      const { data: frs1, error: e1a } = await supabase
        .from('friends')
        .select('user_a, user_b, created_at')
        .eq('user_a', me);
      
      const { data: frs2, error: e1b } = await supabase
        .from('friends')
        .select('user_a, user_b, created_at')
        .eq('user_b', me);
      
      if (e1a) {
        console.error('Erro ao buscar amigos (user_a):', e1a);
        throw e1a;
      }
      if (e1b) {
        console.error('Erro ao buscar amigos (user_b):', e1b);
        throw e1b;
      }
      
      const allFriends = [...(frs1 ?? []), ...(frs2 ?? [])];
      const ids = allFriends.map((r: any) => r.user_a === me ? r.user_b : r.user_a);
      
      if (ids.length > 0) {
        // Buscar perfis primeiro
        const { data: profs, error: e2 } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', ids);
        
        if (e2) {
          console.error('Erro ao buscar perfis:', e2);
          throw e2;
        }
        
        const foundIds = new Set((profs ?? []).map((p: any) => p.id));
        const missingIds = ids.filter(id => !foundIds.has(id));
        
        let friendsList = (profs ?? []).map((p: any) => ({ 
          id: p.id, 
          display_name: p.display_name, 
          avatar_url: p.avatar_url,
          bestWpm: null as number | null
        }));
        
        // Para IDs sem perfil, tentar buscar do auth.users usando user_basic
        if (missingIds.length > 0) {
          for (const missingId of missingIds) {
            try {
              const { data: userBasic, error: userErr } = await supabase.rpc('user_basic', { p_user: missingId });
              
              if (userErr) {
                const errorMsg = userErr.message || String(userErr);
                if (!errorMsg.includes('Could not find the function') && !errorMsg.includes('schema cache')) {
                  console.error('Erro ao buscar user_basic:', userErr);
                }
                continue;
              }
              
              if (userBasic) {
                const userArray = Array.isArray(userBasic) ? userBasic : [userBasic];
                const user = userArray.length > 0 ? userArray[0] : null;
                
                if (user && user.id) {
                  friendsList.push({
                    id: user.id,
                    display_name: user.display_name || 'Usuário',
                    avatar_url: user.avatar_url || null,
                    bestWpm: null as number | null
                  });
                }
              }
            } catch (rpcErr: any) {
              // Ignorar erros silenciosamente
            }
          }
        }
        
        // Buscar melhor WPM de cada amigo
        setLoadingWpm(true);
        try {
          for (const friend of friendsList) {
            try {
              const { data: results } = await fetchUserResults(friend.id);
              if (results && Array.isArray(results) && results.length > 0) {
                const maxWpm = Math.max(...results.map((r: any) => r.wpm || 0));
                friend.bestWpm = maxWpm > 0 ? maxWpm : null;
              }
            } catch (err) {
              // Ignorar erros ao buscar WPM
              friend.bestWpm = null;
            }
          }
        } finally {
          setLoadingWpm(false);
        }
        
        setFriends(friendsList);
        
        if (ids.length > 0 && friendsList.length === 0) {
          setError(`Encontrados ${ids.length} amigo(s) mas não foi possível carregar as informações.`);
        }
      } else {
        setFriends([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar amigos:', err);
      setError(`Erro ao carregar amigos: ${err?.message || 'Erro desconhecido'}`);
      throw err;
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
        await loadFriends();
        const me = user.id;
        const { data: inv, error: e3 } = await supabase
          .from('friend_requests')
          .select('id, sender_id, recipient_id, status, created_at')
          .eq('recipient_id', me)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (e3) throw e3;
        
        const senderIds = (inv ?? []).map((i: any) => i.sender_id);
        let senders: any[] = [];
        if (senderIds.length > 0) {
          const { data: sp } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', senderIds);
          senders = sp ?? [];
          
          const foundSenderIds = new Set(senders.map((s: any) => s.id));
          const missingSenderIds = senderIds.filter(id => !foundSenderIds.has(id));
          
          if (missingSenderIds.length > 0) {
            for (const missingId of missingSenderIds) {
              try {
                const { data: userBasic, error: userErr } = await supabase.rpc('user_basic', { p_user: missingId });
                if (!userErr && userBasic) {
                  const userArray = Array.isArray(userBasic) ? userBasic : [userBasic];
                  const user = userArray.length > 0 ? userArray[0] : null;
                  if (user && user.id) {
                    senders.push({
                      id: user.id,
                      display_name: user.display_name || 'Usuário',
                      avatar_url: user.avatar_url || null
                    });
                  }
                }
              } catch (rpcErr: any) {
                // Ignorar erros silenciosamente
              }
            }
          }
        }
        setInvites((inv ?? []).map((i: any) => ({ ...i, sender: senders.find((s: any) => s.id === i.sender_id) })));
      } catch (err: any) {
        const errorMsg = translateError(err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, supabase, loadFriends]);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      if (!supabase) { setResults([]); setSearching(false); return; }
      const q = query.trim();
      if (q.length === 0) { setResults([]); setSearching(false); return; }
      
      setSearching(true);
      setError(null);
      try {
        const me = user.id;
        const friendIds = new Set(friends.map((f) => f.id));
        
        const { data: pendingReqs } = await supabase
          .from('friend_requests')
          .select('sender_id, recipient_id')
          .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
          .eq('status', 'pending')
          .limit(100);
        
        const exclude = new Set([me, ...friendIds]);
        if (pendingReqs) {
          pendingReqs.forEach((req: any) => {
            if (req.sender_id === me) exclude.add(req.recipient_id);
            if (req.recipient_id === me) exclude.add(req.sender_id);
          });
        }
        
        let list: any[] = [];
        
        // Tentar buscar usando RPC search_profiles
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc('search_profiles', { p_query: q, p_limit: 30 });
          if (!rpcErr && rpcData && rpcData.length > 0) {
            list = rpcData;
          }
        } catch (rpcErr) {
          // Ignorar erros silenciosamente
        }
        
        // Se RPC não retornou resultados, tentar busca direta
        if (list.length === 0) {
          const tokens = q.split(/\s+/).filter(Boolean);
          let likeData: any[] | null = null;
          
          if (tokens.length > 1) {
            let queryBuilder = supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .not('display_name', 'is', null);
            
            tokens.forEach((token) => {
              queryBuilder = queryBuilder.ilike('display_name', `%${token}%`);
            });
            
            const { data, error } = await queryBuilder.limit(30);
            if (!error && data) likeData = data;
          } else {
            const { data, error } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .not('display_name', 'is', null)
              .ilike('display_name', `%${q}%`)
              .limit(30);
            
            if (!error && data) likeData = data;
          }
          
          if (likeData) list = likeData;
        }
        
        // Se ainda não encontrou, tentar search_users
        if (list.length === 0) {
          try {
            const { data: usersData, error: usersErr } = await supabase.rpc('search_users', { p_query: q, p_limit: 30 });
            if (!usersErr && usersData) list = usersData as any[];
          } catch (usersErr) {
            // Ignorar erros silenciosamente
          }
        }
        
        // Remover duplicatas e excluir amigos/convites pendentes
        const unique = new Map<string, any>();
        for (const r of (list ?? [])) {
          if (r && r.id && !exclude.has(r.id)) {
            unique.set(r.id, {
              id: r.id,
              display_name: r.display_name || 'Usuário',
              avatar_url: r.avatar_url
            });
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
        setMessages((prev) => {
          // Se já temos mensagens, verificar se há novas comparando IDs
          if (prev.length > 0) {
            const prevIds = new Set(prev.map(m => m.id));
            const newMessages = rows.filter(r => !prevIds.has(r.id));
            if (newMessages.length > 0) {
              console.log('Novas mensagens encontradas via polling:', newMessages.length, newMessages.map(m => m.id));
              // Combinar e ordenar por timestamp
              const combined = [...prev, ...newMessages];
              return combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            }
            // Mesmo sem novas mensagens, garantir que a ordem está correta
            return prev.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
      
      // Carregar mensagens existentes
      await loadMessages();
      
      // Polling como fallback (verificar a cada 1 segundo para mensagens mais rápidas)
      pollInterval = setInterval(() => {
        if (chatOpen && selected && user) {
          console.log('🔄 Polling: verificando novas mensagens...');
          loadMessages().catch((err) => {
            console.error('Erro no polling:', err);
          });
        }
      }, 1000);
      
      // Configurar subscription em tempo real
      const channelName = `dm-${key}`;
      
      // Remover canal anterior se existir
      const existingChannel = supabase.getChannels().find((ch: any) => ch.topic === `realtime:${channelName}`);
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }
      
      channel = supabase.channel(channelName);
      
      // Configurar subscription para receber mensagens onde o usuário é sender ou recipient
      // Usar filtro que funciona com RLS
      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `pair_key=eq.${key}`
        }, (payload: any) => {
          console.log('📨 Nova mensagem recebida via subscription:', payload);
          const newMsg = payload.new;
          
          if (!newMsg || !newMsg.id) {
            console.error('❌ Mensagem inválida recebida:', payload);
            return;
          }
          
          setMessages((prev) => {
            // Verificar se a mensagem já existe (evitar duplicatas)
            const exists = prev.some((m) => m.id === newMsg.id);
            if (exists) {
              console.log('⚠️ Mensagem já existe, ignorando:', newMsg.id);
              return prev;
            }
            
            console.log('✅ Adicionando nova mensagem via subscription:', newMsg.id, 'de', newMsg.sender_id === user.id ? 'você' : 'outro usuário');
            
            // Se for uma mensagem do próprio usuário, pode ser que já exista uma otimista
            // Verificar por conteúdo e timestamp aproximado
            if (newMsg.sender_id === user.id) {
              const similarMsg = prev.find((m) => 
                m.sender_id === user.id && 
                m.content === newMsg.content &&
                Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000 &&
                m.id < 1000000000000 // IDs temporários são menores
              );
              if (similarMsg) {
                console.log('🔄 Substituindo mensagem otimista:', similarMsg.id, 'por:', newMsg.id);
                // Substituir a mensagem otimista pela real
                const updated = prev.map((m) => 
                  m.id === similarMsg.id ? {
                    id: newMsg.id,
                    pair_key: newMsg.pair_key,
                    sender_id: newMsg.sender_id,
                    recipient_id: newMsg.recipient_id,
                    content: newMsg.content,
                    created_at: newMsg.created_at
                  } : m
                );
                return updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              }
            }
            
            // Adicionar nova mensagem (do outro usuário ou do próprio se não houver otimista)
            console.log('➕ Adicionando mensagem ao estado');
            const updated = [...prev, {
              id: newMsg.id,
              pair_key: newMsg.pair_key,
              sender_id: newMsg.sender_id,
              recipient_id: newMsg.recipient_id,
              content: newMsg.content,
              created_at: newMsg.created_at
            }];
            return updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        })
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
      // Limpar mensagens quando fechar o chat
      if (!chatOpen) {
        setMessages([]);
      }
    };
  }, [selected?.id, user?.id, supabase, chatOpen]);

  useEffect(() => {
    if (chatOpen && messages.length > 0) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        try {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch {}
      }, 100);
    }
  }, [messages, chatOpen]);

  const sendInvite = async (recipientId: string) => {
    setError(null); 
    setInfo(null);
    try {
      if (!user || !supabase) {
        setError('Serviço indisponível.');
        return;
      }
      
      if (user.id === recipientId) {
        setError('Você não pode adicionar a si mesmo.');
        return;
      }
      
      const isFriend = friends.some(f => f.id === recipientId);
      if (isFriend) {
        setError('Este usuário já é seu amigo.');
        return;
      }
      
      const { data: existing1 } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('recipient_id', recipientId)
        .eq('status', 'pending')
        .limit(1);
      
      const { data: existing2 } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', recipientId)
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .limit(1);
      
      const existing = [...(existing1 ?? []), ...(existing2 ?? [])];
      
      if (existing && existing.length > 0) {
        setError('Já existe um convite pendente com este usuário.');
        return;
      }
      
      const { error: e } = await supabase
        .from('friend_requests')
        .insert({ sender_id: user.id, recipient_id: recipientId });
      
      if (e) throw e;
      
      setResults(prev => prev.filter(r => r.id !== recipientId));
      setInfo('Convite enviado com sucesso!');
      setTimeout(() => setInfo(null), 3000);
    } catch (err: any) {
      const errorMsg = translateError(err);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const acceptInvite = async (reqId: string) => {
    setError(null); setInfo(null);
    try {
      if (!user) return;
      if (!supabase) { 
        setError('Serviço indisponível.'); 
        return; 
      }
      
      const invite = invites.find((i) => i.id === reqId);
      const friendId = invite?.sender_id;
      
      const { error: e } = await supabase.rpc('accept_friend_request', { p_request: reqId });
      if (e) throw e;
      
      setInvites((list) => list.filter((i) => i.id !== reqId));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await loadFriends();
      
      if (friendId) {
        const friendExists = friends.some(f => f.id === friendId);
        if (!friendExists) {
          try {
            const { data: prof, error: profErr } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .eq('id', friendId)
              .maybeSingle();
            
            if (!profErr && prof) {
              let bestWpm: number | null = null;
              try {
                const { data: results } = await fetchUserResults(prof.id);
                if (results && Array.isArray(results) && results.length > 0) {
                  const maxWpm = Math.max(...results.map((r: any) => r.wpm || 0));
                  bestWpm = maxWpm > 0 ? maxWpm : null;
                }
              } catch {}
              setFriends(prev => {
                if (!prev.some(f => f.id === prof.id)) {
                  return [...prev, {
                    id: prof.id,
                    display_name: prof.display_name || 'Usuário',
                    avatar_url: prof.avatar_url || null,
                    bestWpm
                  }];
                }
                return prev;
              });
            } else if (!prof) {
              try {
                const { data: userBasic, error: userErr } = await supabase.rpc('user_basic', { p_user: friendId });
                if (!userErr && userBasic) {
                  const userArray = Array.isArray(userBasic) ? userBasic : [userBasic];
                  const user = userArray.length > 0 ? userArray[0] : null;
                  if (user && user.id) {
                    let bestWpm: number | null = null;
                    try {
                      const { data: results } = await fetchUserResults(user.id);
                      if (results && Array.isArray(results) && results.length > 0) {
                        const maxWpm = Math.max(...results.map((r: any) => r.wpm || 0));
                        bestWpm = maxWpm > 0 ? maxWpm : null;
                      }
                    } catch {}
                    setFriends(prev => {
                      if (!prev.some(f => f.id === user.id)) {
                        return [...prev, {
                          id: user.id,
                          display_name: user.display_name || 'Usuário',
                          avatar_url: user.avatar_url || null,
                          bestWpm
                        }];
                      }
                      return prev;
                    });
                  }
                }
              } catch (rpcErr) {
                // Ignorar erros silenciosamente
              }
            }
          } catch (err) {
            // Ignorar erros silenciosamente
          }
        }
      }
      
      setTimeout(async () => {
        try {
          await loadFriends();
        } catch (err) {
          // Ignorar erros silenciosamente
        }
      }, 500);
      
      setInfo('Convite aceito! O amigo foi adicionado à sua lista.');
      setTimeout(() => setInfo(null), 3000);
    } catch (err: any) {
      const errorMsg = translateError(err);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const rejectInvite = async (reqId: string) => {
    setError(null); setInfo(null);
    try {
      if (!supabase) return;
      const { error: e } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', reqId);
      if (e) throw e;
      setInvites((list) => list.filter((i) => i.id !== reqId));
    } catch (err: any) { setError(translateError(err)); }
  };

  const sendMessage = async () => {
    setError(null); setInfo(null);
    try {
      if (!user || !supabase || !selected) return;
      const text = msgText.trim();
      if (!text) return;
      const key = pairKey(user.id, selected.id);
      
      // Atualização otimista - adiciona a mensagem imediatamente
      const tempId = Date.now();
      const optimisticMessage: Message = {
        id: tempId,
        pair_key: key,
        sender_id: user.id,
        recipient_id: selected.id,
        content: text,
        created_at: new Date().toISOString()
      };
      
      // Limpar input imediatamente para melhor UX
      setMsgText('');
      
      // Adicionar mensagem otimista
      setMessages((prev) => [...prev, optimisticMessage]);
      
      // Envia para o servidor (sem await para não bloquear)
      (async () => {
        try {
          const { error: e } = await supabase
            .from('direct_messages')
            .insert({ pair_key: key, sender_id: user.id, recipient_id: selected.id, content: text });
          
          if (e) {
            // Se houver erro, remove a mensagem otimista e mostra erro
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setError(translateError(e));
            // Restaurar o texto no input
            setMsgText(text);
          }
          // Se sucesso, a subscription vai substituir a mensagem otimista pela real
        } catch (err: any) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setError(translateError(err));
          setMsgText(text);
        }
      })();
    } catch (err: any) { 
      setError(translateError(err)); 
    }
  };

  const onMsgKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
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
    <div className="min-h-screen bg-[#323437] flex items-center justify-center px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32">
      <div className="w-full max-w-[120ch]">
        <h1 className="text-white text-3xl font-bold mb-6">Amigos</h1>
        <div className="rounded-xl bg-[#2c2e31] ring-1 ring-[#3a3c3f] p-4 text-white relative">
          <div role="tablist" aria-label="Navegação de Amigos" className="flex items-center gap-2 mb-4">
            {(['friends','invites','add'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab===t}
                onClick={() => setTab(t)}
                className={`h-9 px-4 rounded-full text-sm transition-colors ${tab===t? 'bg-[#e2b714] text-black':'text-[#d1d1d1] hover:bg-[#1f2022]'}`}
              >
                {t==='friends'?'Amigos':t==='invites'?'Convites':'Adicionar'}
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
            <div>
              <div className="text-[#d1d1d1] mb-4">
                Seus amigos {loading && '(carregando...)'} {loadingWpm && !loading && '(carregando estatísticas...)'}
              </div>
              {loading && (
                <div className="text-[#d1d1d1] text-center py-8">Carregando amigos...</div>
              )}
              {!loading && friends.length === 0 && (
                <div className="text-[#d1d1d1] text-center py-8">Nenhum amigo ainda.</div>
              )}
              {!loading && friends.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.map((f) => (
                    <div
                      key={f.id}
                      className="bg-[#1f2022] rounded-lg p-4 hover:bg-[#252729] transition-colors border border-[#3a3c3f]"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {f.avatar_url ? (
                          <Image 
                            src={f.avatar_url} 
                            alt="Avatar" 
                            width={48} 
                            height={48} 
                            className="rounded-full object-cover flex-shrink-0" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {(f.display_name ?? 'US').slice(0,2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">{f.display_name ?? 'Usuário'}</div>
                          <div className="text-sm text-[#d1d1d1] mt-1">
                            {loadingWpm ? (
                              <span className="text-[#6b6e70] animate-pulse">Carregando...</span>
                            ) : f.bestWpm !== null ? (
                              <span className="text-yellow-400 font-semibold">{f.bestWpm} WPM</span>
                            ) : (
                              <span className="text-[#6b6e70]">Sem recorde</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link
                          href={`/stats/${encodeURIComponent(f.id)}`}
                          onClick={() => {
                            try {
                              if (typeof window !== 'undefined') {
                                localStorage.setItem(`profile.cache.${f.id}`, JSON.stringify({ 
                                  display_name: f.display_name, 
                                  avatar_url: f.avatar_url 
                                }));
                              }
                            } catch {}
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-[#2c2e31] text-white hover:bg-[#3a3c3f] transition-colors text-sm text-center"
                        >
                          Ver Stats
                        </Link>
                        <button
                          onClick={() => {
                            setSelected(f);
                            setChatOpen(true);
                            // Limpar mensagens anteriores para forçar recarregamento
                            setMessages([]);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-[#e2b714] text-black hover:bg-[#d4c013] transition-colors text-sm font-medium"
                          aria-label={`Abrir chat com ${f.display_name ?? 'Usuário'}`}
                        >
                          Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'invites' && (
            <div>
              <div className="text-[#d1d1d1] mb-2">Convites recebidos</div>
              <div className="space-y-2">
                {invites.length === 0 && <div className="text-[#d1d1d1]">Nenhum convite pendente.</div>}
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between bg-[#1f2022] rounded-lg p-2">
                    <div className="flex items-center gap-3">
                      {i.sender?.avatar_url ? (
                        <Image src={i.sender.avatar_url} alt="Avatar" width={32} height={32} className="rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">{(i.sender?.display_name ?? 'US').slice(0,2).toUpperCase()}</div>
                      )}
                      <div>
                        <div className="font-semibold">{i.sender?.display_name ?? 'Usuário'}</div>
                        <div className="text-xs text-[#d1d1d1]">convite enviado {new Date(i.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>acceptInvite(i.id)} className="h-8 px-3 rounded-lg bg-[#e2b714] text-black hover:bg-[#d4c013] transition-colors">Aceitar</button>
                      <button onClick={()=>rejectInvite(i.id)} className="h-8 px-3 rounded-lg bg-[#ca4754] text-white hover:bg-[#b83d49] transition-colors">Recusar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'add' && (
            <div>
              <div className="mb-2 text-[#d1d1d1]">Pesquisar por nome</div>
              <input
                value={query}
                onChange={(e)=>setQuery(e.target.value)}
                placeholder="Digite o nome do seu amigo"
                className="w-full h-10 px-3 rounded-lg bg-[#1f2022] text-white outline-none ring-1 ring-transparent focus:ring-[#3a3c3f]"
                aria-label="Pesquisar amigos"
              />
              <div className="mt-3 space-y-2">
                {searching && query.trim().length > 0 && (
                  <div className="text-[#d1d1d1]">Buscando...</div>
                )}
                {!searching && results.length === 0 && query.trim().length > 0 && (
                  <div className="text-[#d1d1d1]">Nenhum resultado encontrado.</div>
                )}
                {!searching && query.trim().length === 0 && (
                  <div className="text-[#d1d1d1]">Digite um nome para buscar.</div>
                )}
                {results.map((r)=> (
                  <div key={r.id} className="flex items-center justify-between bg-[#1f2022] rounded-lg p-2">
                    <div className="flex items-center gap-3">
                      {r.avatar_url ? (
                        <Image src={r.avatar_url} alt="Avatar" width={32} height={32} className="rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">{(r.display_name ?? 'US').slice(0,2).toUpperCase()}</div>
                      )}
                      <div className="font-semibold">{r.display_name ?? 'Usuário'}</div>
                    </div>
                    <button 
                      onClick={()=>sendInvite(r.id)} 
                      className="h-8 px-3 rounded-lg bg-[#e2b714] text-black hover:bg-[#d4c013] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={searching || loading}
                    >
                      Enviar convite
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
          onSendMessage={sendMessage}
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
