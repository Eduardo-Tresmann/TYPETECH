'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { fetchUserResults, fetchUserResultsFiltered } from '@/lib/db';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Result = {
  id: string;
  user_id: string;
  total_time: number;
  wpm: number;
  accuracy: number;
  correct_letters: number;
  incorrect_letters: number;
  created_at: string;
};

export default function StatsUserByIdPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => hasSupabaseConfig() ? getSupabase() : null, []);
  const params = useParams();
  const targetId = String((params as any)?.id ?? '');
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`profile.cache.${targetId}`);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  });
  const [resultsAll, setResultsAll] = useState<Result[]>([]);
  const [resultsFiltered, setResultsFiltered] = useState<Result[]>([]);
  const [durations, setDurations] = useState<number[]>([15, 30, 60, 120]);
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at'|'wpm'|'accuracy'|'total_time'>('created_at');
  const [order, setOrder] = useState<'asc'|'desc'>('desc');
  const [wpmMin, setWpmMin] = useState<number | undefined>(undefined);
  const [accMin, setAccMin] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(0);
  const limit = 20;
  const [relation, setRelation] = useState<'self'|'friend'|'pending'|'none'>('none');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!profile) {
        const raw = localStorage.getItem(`profile.cache.${targetId}`);
        if (raw) setProfile(JSON.parse(raw));
      }
    } catch {}
  }, [targetId]);

  useEffect(() => {
    const run = async () => {
      setError(null); setInfo(null);
      try {
        let prof: any = profile ?? null;
        if (supabase) {
          const { data: rpc } = await supabase.rpc('user_basic', { p_user: targetId });
          if (rpc && Array.isArray(rpc) && rpc.length > 0) {
            prof = { display_name: rpc[0].display_name, avatar_url: rpc[0].avatar_url };
          } else {
            const { data: p } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', targetId).maybeSingle();
            if (p) prof = p;
          }
        }
        setProfile(prof ?? profile ?? null);
        const { data: all } = await fetchUserResults(targetId);
        setResultsAll((all as Result[]) ?? []);
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao carregar perfil');
      }
    };
    run();
  }, [targetId, supabase, profile]);

  useEffect(() => {
    const run = async () => {
      if (!targetId) return;
      setLoading(true);
      const { data: filtered } = await fetchUserResultsFiltered({
        userId: targetId,
        durations,
        start: start || undefined,
        end: end || undefined,
        sortBy,
        order,
        wpmMin,
        accMin,
        limit,
        offset: page * limit,
      });
      setResultsFiltered((filtered as Result[]) ?? []);
      setLoading(false);
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [targetId, durations, start, end, sortBy, order, wpmMin, accMin, page]);

  useEffect(() => {
    const checkRelation = async () => {
      if (!user || !supabase) { setRelation('none'); return; }
      if (user.id === targetId) { setRelation('self'); return; }
      const me = user.id;
      const { data: frs } = await supabase
        .from('friends')
        .select('user_a, user_b')
        .or(`and(user_a.eq.${me},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${me})`)
        .limit(1);
      if (frs && frs.length > 0) { setRelation('friend'); return; }
      const { data: reqs } = await supabase
        .from('friend_requests')
        .select('id')
        .or(`and(sender_id.eq.${me},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${me})`)
        .eq('status','pending')
        .limit(1);
      if (reqs && reqs.length > 0) { setRelation('pending'); return; }
      setRelation('none');
    };
    checkRelation();
  }, [user, supabase, targetId]);

  const sendInvite = async () => {
    setError(null); setInfo(null);
    try {
      if (!user || !supabase) return;
      if (user.id === targetId) return;
      const { error: e } = await supabase
        .from('friend_requests')
        .insert({ sender_id: user.id, recipient_id: targetId });
      if (e) throw e;
      setRelation('pending');
      setInfo('Convite enviado.');
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao enviar convite');
    }
  };

  const kpis = useMemo(() => {
    if (resultsAll.length === 0) return null;
    const byTime: Record<number, Result[]> = { 15: [], 30: [], 60: [], 120: [] } as any;
    for (const r of resultsAll) { (byTime[r.total_time] ??= []).push(r); }
    const bestOverall = resultsAll.reduce((max, r) => (r.wpm > max.wpm ? r : max), resultsAll[0]);
    const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length));
    const avgWpm = avg(resultsAll.map((r) => r.wpm));
    const avgAcc = avg(resultsAll.map((r) => r.accuracy));
    const totals = {
      tests: resultsAll.length,
      correct: resultsAll.reduce((s, r) => s + r.correct_letters, 0),
      incorrect: resultsAll.reduce((s, r) => s + r.incorrect_letters, 0),
    };
    const bestByTime = [15, 30, 60, 120].map((t) => {
      const arr = byTime[t];
      if (!arr || arr.length === 0) return { total_time: t, wpm: 0, accuracy: 0 };
      const best = arr.reduce((max, r) => (r.wpm > max.wpm ? r : max), arr[0]);
      return { total_time: t, wpm: best.wpm, accuracy: best.accuracy };
    });
    return { bestOverall, avgWpm, avgAcc, totals, bestByTime };
  }, [resultsAll]);

  return (
    <div className="min-h-screen bg-[#323437] flex flex-col items-center justify-start px-6">
      <div className="w-full max-w-[120ch] text-white mt-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Perfil</h2>
          <Link href="/leaderboards" className="text-[#e2b714]">Voltar</Link>
        </div>
        <div className="rounded p-4 ring-1 ring-[#3a3c3f]">
          <div className="flex items-center gap-3 mb-4">
            {mounted && profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => { try { setProfile((p) => (p ? { ...p, avatar_url: null } : p)); } catch {} }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">
                {mounted ? ((profile?.display_name ?? 'US').slice(0,2).toUpperCase()) : 'US'}
              </div>
            )}
            <div>
              <div className="text-lg font-semibold">{mounted ? (profile?.display_name ?? 'Usuário') : 'Usuário'}</div>
              {kpis && <div className="text-sm text-[#d1d1d1]">Melhor WPM: {kpis.bestOverall.wpm}</div>}
            </div>
            <div className="ml-auto">
              {relation === 'self' ? (
                <button disabled className="px-3 py-1 rounded bg-[#292b2e] text-[#d1d1d1]">Este é você</button>
              ) : relation === 'friend' ? (
                <button disabled className="px-3 py-1 rounded bg-[#292b2e] text-[#d1d1d1]">Já são amigos</button>
              ) : relation === 'pending' ? (
                <button disabled className="px-3 py-1 rounded bg-[#292b2e] text-[#d1d1d1]">Convite pendente</button>
              ) : (
                <button onClick={sendInvite} className="px-3 py-1 rounded bg-[#e2b714] text-black">Adicionar amigos</button>
              )}
            </div>
          </div>
          {error && <div className="text-[#ca4754] mb-2">{error}</div>}
          {!error && info && <div className="text-[#e2b714] mb-2">{info}</div>}
          <h2 className="text-xl font-semibold text-center mb-4">Estatísticas</h2>
          {kpis ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-4 rounded border border-[#3a3c3f]"><div className="text-[#d1d1d1] text-sm">Melhor WPM (geral)</div><div className="text-yellow-400 text-2xl font-bold">{kpis.bestOverall.wpm}</div></div>
              <div className="p-4 rounded border border-[#3a3c3f]"><div className="text-[#d1d1d1] text-sm">Média WPM</div><div className="text-yellow-400 text-2xl font-bold">{kpis.avgWpm}</div></div>
              <div className="p-4 rounded border border-[#3a3c3f]"><div className="text-[#d1d1d1] text-sm">Média Precisão</div><div className="text-yellow-400 text-2xl font-bold">{`${kpis.avgAcc}%`}</div></div>
              <div className="p-4 rounded border border-[#3a3c3f]"><div className="text-[#d1d1d1] text-sm">Testes</div><div className="text-yellow-400 text-2xl font-bold">{kpis.totals.tests}</div></div>
            </div>
          ) : (
            <div className="text-[#d1d1d1]">Sem estatísticas.</div>
          )}
          {kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
              {kpis.bestByTime.map((b) => (
                <div key={b.total_time} className="p-4 rounded border border-[#3a3c3f]"><div className="text-[#d1d1d1] text-sm">Melhor WPM • {b.total_time}s</div><div className="text-yellow-400 text-2xl font-bold">{b.wpm}</div></div>
              ))}
            </div>
          )}
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-center mb-4">Histórico</h2>
            <div className="mb-4 rounded-xl bg-[#323437] ring-1 ring-[#3a3c3f] overflow-hidden">
              <div className="flex items-center justify-center gap-3 p-3 rounded-full">
                {[15,30,60,120].map((t)=>{
                  const active = durations.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={()=>{ setPage(0); setDurations((prev)=>active? prev.filter(x=>x!==t): [...prev, t]); }}
                      className={`h-8 px-3 rounded-full text-sm transition-colors ${active? 'bg-[#e2b714] text-black':'text-[#d1d1d1] hover:bg-[#2b2d2f]'}`}
                    >
                      {t}s
                    </button>
                  );
                })}
              </div>
            </div>
            {loading && (
              <div className="px-4 pb-2 text-xs text-[#9a9a9a]">Atualizando...</div>
            )}
            <div className="grid grid-cols-12 px-2 text-[#d1d1d1]">
              <button onClick={()=>{ setPage(0); setSortBy((prev)=> prev==='created_at' ? prev : 'created_at'); setOrder((prev)=> sortBy==='created_at' ? (prev==='desc'?'asc':'desc') : 'desc'); }} className="col-span-4 text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2">Data/Hora {sortBy==='created_at' && (<span className="text-[#e2b714]">{order==='asc'?'↑':'↓'}</span>)}</button>
              <button onClick={()=>{ setPage(0); setSortBy((prev)=> prev==='total_time' ? prev : 'total_time'); setOrder((prev)=> sortBy==='total_time' ? (prev==='desc'?'asc':'desc') : 'desc'); }} className="col-span-2 text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2">Duração {sortBy==='total_time' && (<span className="text-[#e2b714]">{order==='asc'?'↑':'↓'}</span>)}</button>
              <button onClick={()=>{ setPage(0); setSortBy((prev)=> prev==='wpm' ? prev : 'wpm'); setOrder((prev)=> sortBy==='wpm' ? (prev==='desc'?'asc':'desc') : 'desc'); }} className="col-span-2 text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2">WPM {sortBy==='wpm' && (<span className="text-[#e2b714]">{order==='asc'?'↑':'↓'}</span>)}</button>
              <button onClick={()=>{ setPage(0); setSortBy((prev)=> prev==='accuracy' ? prev : 'accuracy'); setOrder((prev)=> sortBy==='accuracy' ? (prev==='desc'?'asc':'desc') : 'desc'); }} className="col-span-2 text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2">Precisão {sortBy==='accuracy' && (<span className="text-[#e2b714]">{order==='asc'?'↑':'↓'}</span>)}</button>
              <div className="col-span-2">Detalhes</div>
            </div>
            <div className="divide-y divide-[#3a3c3f]">
              {resultsFiltered.map((r) => (
                <div key={r.id} className="py-2 px-2 grid grid-cols-12 items-center hover:bg-[#2b2d2f] rounded">
                  <div className="col-span-4 text-[#d1d1d1]">{new Date(r.created_at).toLocaleString()}</div>
                  <div className="col-span-2 text-[#d1d1d1]">{r.total_time}s</div>
                  <div className="col-span-2 text-yellow-400 font-semibold">{r.wpm} WPM</div>
                  <div className="col-span-2 text-[#d1d1d1]">{r.accuracy}%</div>
                  <div className="col-span-2">
                    <span className="inline-block px-2 py-1 rounded-full border border-[#3a3c3f] text-[#d1d1d1] mr-2">{r.correct_letters} acertos</span>
                    <span className="inline-block px-2 py-1 rounded-full border border-[#3a3c3f] text-[#d1d1d1]">{r.incorrect_letters} erros</span>
                  </div>
                </div>
              ))}
              {!loading && resultsFiltered.length === 0 && (
                <div className="py-4 px-2 text-[#d1d1d1]">Nenhum teste encontrado.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
