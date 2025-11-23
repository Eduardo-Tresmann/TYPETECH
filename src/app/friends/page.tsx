'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { translateError } from '@/lib/errorMessages';
import { pairKey } from '@/lib/db';

type Friend = { id: string; display_name: string | null; avatar_url: string | null };
type Invite = { id: string; sender_id: string; recipient_id: string; status: string; created_at: string; sender?: Friend; };
type Message = { id: number; pair_key: string; sender_id: string; recipient_id: string; content: string; created_at: string };

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'friends'|'invites'|'add'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const supabase = useMemo(() => hasSupabaseConfig() ? getSupabase() : null, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      setInfo(null);
      try {
        if (!user || !supabase) return;
        const me = user.id;
        const { data: frs, error: e1 } = await supabase
          .from('friends')
          .select('user_a, user_b, created_at')
          .or(`user_a.eq.${me},user_b.eq.${me}`);
        if (e1) throw e1;
        const ids = (frs ?? []).map((r: any) => r.user_a === me ? r.user_b : r.user_a);
        if (ids.length > 0) {
          const { data: profs, error: e2 } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', ids);
          if (e2) throw e2;
          setFriends((profs ?? []).map((p: any) => ({ id: p.id, display_name: p.display_name, avatar_url: p.avatar_url })));
        } else {
          setFriends([]);
        }
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
        }
        setInvites((inv ?? []).map((i: any) => ({ ...i, sender: senders.find((s: any) => s.id === i.sender_id) })));
      } catch (err: any) {
        setError(translateError(err));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, supabase]);

  useEffect(() => {
    const run = async () => {
      if (!user || !supabase) return;
      const q = query.trim();
      if (q.length === 0) { setResults([]); return; }
      const exclude = new Set([user.id, ...friends.map((f) => f.id)]);
      let list: any[] = [];
      const { data: rpcData, error: rpcErr } = await supabase.rpc('search_profiles', { p_query: q, p_limit: 20 });
      if (!rpcErr && rpcData) list = rpcData;
      if (rpcErr || (list.length === 0)) {
        const tokens = q.split(/\s+/).filter(Boolean);
        let likeData: any[] | null = null;
        if (tokens.length > 1) {
          const orExpr = tokens.map((t) => `display_name.ilike.%${t}%`).join(',');
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .or(orExpr)
            .limit(20);
          if (!error && data) likeData = data;
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .ilike('display_name', `%${q}%`)
            .limit(20);
          if (!error && data) likeData = data;
        }
        if (likeData) list = likeData;
        if (!list || list.length === 0) {
          const { data: usersData } = await supabase.rpc('search_users', { p_query: q, p_limit: 20 });
          if (usersData) list = usersData as any[];
        }
      }
      const unique = new Map<string, any>();
      for (const r of (list ?? [])) unique.set(r.id, r);
      setResults(Array.from(unique.values()).filter((p: any) => !exclude.has(p.id)));
    };
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [query, user, supabase, friends]);

  useEffect(() => {
    let sub: any;
    const subscribe = async () => {
      if (!user || !supabase || !selected) return;
      const key = pairKey(user.id, selected.id);
      const { data: rows } = await supabase
        .from('direct_messages')
        .select('id, pair_key, sender_id, recipient_id, content, created_at')
        .eq('pair_key', key)
        .order('created_at', { ascending: true })
        .limit(200);
      setMessages(rows ?? []);
      sub = supabase.channel(`dm-${key}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `pair_key=eq.${key}` }, (payload) => {
        const r = payload.new as any;
        setMessages((m) => [...m, { id: r.id, pair_key: r.pair_key, sender_id: r.sender_id, recipient_id: r.recipient_id, content: r.content, created_at: r.created_at }]);
      }).subscribe();
    };
    subscribe();
    return () => { if (sub && supabase) supabase.removeChannel(sub); };
  }, [selected, user, supabase]);

  const sendInvite = async (recipientId: string) => {
    setError(null); setInfo(null);
    try {
      if (!user || !supabase) return;
      const { error: e } = await supabase
        .from('friend_requests')
        .insert({ sender_id: user.id, recipient_id: recipientId });
      if (e) throw e;
      setInfo('Convite enviado.');
    } catch (err: any) { setError(translateError(err)); }
  };

  const acceptInvite = async (reqId: string) => {
    setError(null); setInfo(null);
    try {
      if (!user || !supabase) return;
      const { error: e } = await supabase.rpc('accept_friend_request', { p_request: reqId });
      if (e) throw e;
      setInvites((list) => list.filter((i) => i.id !== reqId));
      const me = user.id;
      const { data: frs } = await supabase
        .from('friends')
        .select('user_a, user_b');
      const ids = (frs ?? []).map((r: any) => r.user_a === me ? r.user_b : r.user_a);
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', ids);
      setFriends((profs ?? []).map((p: any) => ({ id: p.id, display_name: p.display_name, avatar_url: p.avatar_url })));
      setInfo('Convite aceito.');
    } catch (err: any) { setError(translateError(err)); }
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
      const { error: e } = await supabase
        .from('direct_messages')
        .insert({ pair_key: key, sender_id: user.id, recipient_id: selected.id, content: text });
      if (e) throw e;
      setMsgText('');
    } catch (err: any) { setError(translateError(err)); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#323437] flex items-center justify-center px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40">
        <div className="w-full max-w-[90ch] text-white">Você precisa estar logado.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#323437] flex items-center justify-center px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40">
      <div className="w-full max-w-[110ch]">
        <h1 className="text-white text-3xl font-bold mb-6">Amigos</h1>
        <div className="bg-[#2c2e31] rounded p-4 text-white">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab('friends')} className={`px-3 py-2 rounded ${tab==='friends'?'bg-[#e2b714] text-black':'bg-[#1f2022] text-white'}`}>Amigos</button>
            <button onClick={() => setTab('invites')} className={`px-3 py-2 rounded ${tab==='invites'?'bg-[#e2b714] text-black':'bg-[#1f2022] text-white'}`}>Convites</button>
            <button onClick={() => setTab('add')} className={`px-3 py-2 rounded ${tab==='add'?'bg-[#e2b714] text-black':'bg-[#1f2022] text-white'}`}>Adicionar</button>
          </div>

          {error && <div className="text-[#ca4754] mb-2">{error}</div>}
          {!error && info && <div className="text-[#e2b714] mb-2">{info}</div>}

          {tab === 'friends' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <div className="text-[#d1d1d1] mb-2">Seus amigos</div>
                <div className="space-y-2">
                  {friends.length === 0 && <div className="text-[#d1d1d1]">Nenhum amigo ainda.</div>}
                  {friends.map((f) => (
                    <button key={f.id} onClick={() => setSelected(f)} className={`w-full flex items-center gap-3 p-2 rounded ${selected?.id===f.id?'bg-[#1f2022]':'bg-[#292b2e]'} hover:bg-[#1f2022]`}>
                      {f.avatar_url ? <img src={f.avatar_url} className="w-8 h-8 rounded-full object-cover"/> : <div className="w-8 h-8 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">{(f.display_name ?? 'US').slice(0,2).toUpperCase()}</div>}
                      <div className="truncate">{f.display_name ?? 'Usuário'}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                {selected ? (
                  <div className="flex flex-col h-[50vh]">
                    <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-[#1f2022] rounded">
                      {messages.map((m) => (
                        <div key={m.id} className={`max-w-[70%] p-2 rounded ${m.sender_id===user.id?'bg-[#e2b714] text-black self-end':'bg-[#2c2e31] text-white self-start'}`}>{m.content}</div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input value={msgText} onChange={(e)=>setMsgText(e.target.value)} placeholder="Mensagem" className="flex-1 p-2 rounded bg-[#1f2022] text-white outline-none"/>
                      <button onClick={sendMessage} className="px-4 rounded bg-[#e2b714] text-black">Enviar</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[#d1d1d1]">Selecione um amigo para conversar.</div>
                )}
              </div>
            </div>
          )}

          {tab === 'invites' && (
            <div>
              <div className="text-[#d1d1d1] mb-2">Convites recebidos</div>
              <div className="space-y-2">
                {invites.length === 0 && <div className="text-[#d1d1d1]">Nenhum convite pendente.</div>}
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between bg-[#1f2022] rounded p-2">
                    <div className="flex items-center gap-3">
                      {i.sender?.avatar_url ? <img src={i.sender.avatar_url} className="w-8 h-8 rounded-full object-cover"/> : <div className="w-8 h-8 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">{(i.sender?.display_name ?? 'US').slice(0,2).toUpperCase()}</div>}
                      <div>
                        <div className="font-semibold">{i.sender?.display_name ?? 'Usuário'}</div>
                        <div className="text-xs text-[#d1d1d1]">convite enviado {new Date(i.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>acceptInvite(i.id)} className="px-3 py-1 rounded bg-[#e2b714] text-black">Aceitar</button>
                      <button onClick={()=>rejectInvite(i.id)} className="px-3 py-1 rounded bg-[#ca4754] text-white">Recusar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'add' && (
            <div>
              <div className="mb-2 text-[#d1d1d1]">Pesquisar por nome</div>
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Digite o nome do seu amigo" className="w-full p-2 rounded bg-[#1f2022] text-white outline-none"/>
              <div className="mt-3 space-y-2">
                {results.length === 0 && <div className="text-[#d1d1d1]">Nenhum resultado.</div>}
                {results.map((r)=> (
                  <div key={r.id} className="flex items-center justify-between bg-[#1f2022] rounded p-2">
                    <div className="flex items-center gap-3">
                      {r.avatar_url ? <img src={r.avatar_url} className="w-8 h-8 rounded-full object-cover"/> : <div className="w-8 h-8 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">{(r.display_name ?? 'US').slice(0,2).toUpperCase()}</div>}
                      <div className="font-semibold">{r.display_name ?? 'Usuário'}</div>
                    </div>
                    <button onClick={()=>sendInvite(r.id)} className="px-3 py-1 rounded bg-[#e2b714] text-black">Enviar convite</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
