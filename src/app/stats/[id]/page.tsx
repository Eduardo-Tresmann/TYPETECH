'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { fetchUserResults, fetchUserResultsFiltered } from '@/lib/db';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
  const supabase = useMemo(() => (hasSupabaseConfig() ? getSupabase() : null), []);
  const params = useParams();
  const targetId = String((params as any)?.id ?? '');
  const [profile, setProfile] = useState<{
    display_name: string | null;
    avatar_url: string | null;
  } | null>(() => {
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
  const [sortBy, setSortBy] = useState<
    'created_at' | 'wpm' | 'accuracy' | 'total_time' | 'correct_letters' | 'incorrect_letters'
  >('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [wpmMin, setWpmMin] = useState<number | undefined>(undefined);
  const [accMin, setAccMin] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const limit = 50;
  const [relation, setRelation] = useState<'self' | 'friend' | 'pending' | 'none'>('none');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      setError(null);
      setInfo(null);
      try {
        let prof: any = profile ?? null;
        if (supabase) {
          const { data: rpc } = await supabase.rpc('user_basic', { p_user: targetId });
          if (rpc && Array.isArray(rpc) && rpc.length > 0) {
            prof = { display_name: rpc[0].display_name, avatar_url: rpc[0].avatar_url };
          } else {
            const { data: p } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', targetId)
              .maybeSingle();
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
      const { data: filtered, count } = await fetchUserResultsFiltered({
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
      setTotalCount(count ?? 0);
      setLoading(false);
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [targetId, durations, start, end, sortBy, order, wpmMin, accMin, page]);

  useEffect(() => {
    const checkRelation = async () => {
      if (!user || !supabase) {
        setRelation('none');
        return;
      }
      if (user.id === targetId) {
        setRelation('self');
        return;
      }
      const me = user.id;
      const { data: frs } = await supabase
        .from('friends')
        .select('user_a, user_b')
        .or(`and(user_a.eq.${me},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${me})`)
        .limit(1);
      if (frs && frs.length > 0) {
        setRelation('friend');
        return;
      }
      const { data: reqs } = await supabase
        .from('friend_requests')
        .select('id')
        .or(
          `and(sender_id.eq.${me},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${me})`
        )
        .eq('status', 'pending')
        .limit(1);
      if (reqs && reqs.length > 0) {
        setRelation('pending');
        return;
      }
      setRelation('none');
    };
    checkRelation();
  }, [user, supabase, targetId]);

  const sendInvite = async () => {
    setError(null);
    setInfo(null);
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
    for (const r of resultsAll) {
      (byTime[r.total_time] ??= []).push(r);
    }
    const bestOverall = resultsAll.reduce((max, r) => (r.wpm > max.wpm ? r : max), resultsAll[0]);
    const avg = (arr: number[]) =>
      Math.round(arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length));
    const avgWpm = avg(resultsAll.map(r => r.wpm));
    const avgAcc = avg(resultsAll.map(r => r.accuracy));
    const totals = {
      tests: resultsAll.length,
      correct: resultsAll.reduce((s, r) => s + r.correct_letters, 0),
      incorrect: resultsAll.reduce((s, r) => s + r.incorrect_letters, 0),
    };
    const bestByTime = [15, 30, 60, 120].map(t => {
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
          <Link href="/leaderboards" className="text-[#e2b714]">
            Voltar
          </Link>
        </div>
        <div className="rounded-lg p-4 bg-[#2b2d2f] border border-[#3a3c3f]">
          <div className="flex items-center gap-3 mb-4">
            {mounted && profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => {
                  try {
                    setProfile(p => (p ? { ...p, avatar_url: null } : p));
                  } catch {}
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">
                {mounted ? (profile?.display_name ?? 'US').slice(0, 2).toUpperCase() : 'US'}
              </div>
            )}
            <div>
              <div className="text-lg font-semibold">
                {mounted ? (profile?.display_name ?? 'Usuário') : 'Usuário'}
              </div>
              {kpis && (
                <div className="text-sm text-[#d1d1d1]">Melhor WPM: {kpis.bestOverall.wpm}</div>
              )}
            </div>
            <div className="ml-auto">
              {relation === 'self' ? (
                <button disabled className="px-3 py-1 rounded bg-[#292b2e] text-[#d1d1d1]">
                  Este é você
                </button>
              ) : relation === 'friend' ? (
                <button disabled className="px-3 py-1 rounded bg-[#292b2e] text-[#d1d1d1]">
                  Já são amigos
                </button>
              ) : relation === 'pending' ? (
                <button disabled className="px-3 py-1 rounded bg-[#292b2e] text-[#d1d1d1]">
                  Convite pendente
                </button>
              ) : (
                <button onClick={sendInvite} className="px-3 py-1 rounded bg-[#e2b714] text-black">
                  Adicionar amigos
                </button>
              )}
            </div>
          </div>
          {error && <div className="text-[#ca4754] mb-2">{error}</div>}
          {!error && info && <div className="text-[#e2b714] mb-2">{info}</div>}
          <h2 className="text-xl font-semibold text-center mb-6">Estatísticas</h2>
          {kpis ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-lg border border-[#3a3c3f] bg-[#2b2d2f] min-h-[100px] flex flex-col justify-between">
                <div className="text-[#d1d1d1] text-sm mb-2">Melhor WPM (geral)</div>
                <div className="text-yellow-400 text-3xl font-bold leading-none">
                  {kpis.bestOverall.wpm}
                </div>
              </div>
              <div className="p-5 rounded-lg border border-[#3a3c3f] bg-[#2b2d2f] min-h-[100px] flex flex-col justify-between">
                <div className="text-[#d1d1d1] text-sm mb-2">Média WPM</div>
                <div className="text-yellow-400 text-3xl font-bold leading-none">{kpis.avgWpm}</div>
              </div>
              <div className="p-5 rounded-lg border border-[#3a3c3f] bg-[#2b2d2f] min-h-[100px] flex flex-col justify-between">
                <div className="text-[#d1d1d1] text-sm mb-2">Média Precisão</div>
                <div className="text-yellow-400 text-3xl font-bold leading-none">{`${kpis.avgAcc}%`}</div>
              </div>
              <div className="p-5 rounded-lg border border-[#3a3c3f] bg-[#2b2d2f] min-h-[100px] flex flex-col justify-between">
                <div className="text-[#d1d1d1] text-sm mb-2">Testes</div>
                <div className="text-yellow-400 text-3xl font-bold leading-none">
                  {kpis.totals.tests}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[#d1d1d1] text-center py-8">Sem estatísticas.</div>
          )}
          {kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {kpis.bestByTime.map(b => (
                <div
                  key={b.total_time}
                  className="p-5 rounded-lg border border-[#3a3c3f] bg-[#2b2d2f] min-h-[100px] flex flex-col justify-between"
                >
                  <div className="text-[#d1d1d1] text-sm mb-2">Melhor WPM - {b.total_time}s</div>
                  <div className="text-yellow-400 text-3xl font-bold leading-none">{b.wpm}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-center mb-6">Histórico</h2>
            <div className="mb-4 rounded-xl bg-[#2b2d2f] border border-[#3a3c3f] overflow-hidden">
              <div className="flex items-center justify-center gap-3 p-3">
                {[15, 30, 60, 120].map(t => {
                  const active = durations.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setPage(0);
                        setDurations(prev => (active ? prev.filter(x => x !== t) : [...prev, t]));
                      }}
                      className={`h-9 px-4 rounded-full text-sm font-medium transition-all ${active ? 'bg-[#e2b714] text-black shadow-lg' : 'text-[#d1d1d1] hover:bg-[#3a3c3f]'}`}
                    >
                      {t}s
                    </button>
                  );
                })}
              </div>
            </div>
            {loading && (
              <div className="px-4 pb-3 flex items-center gap-2 text-xs text-[#9a9a9a]">
                <LoadingSpinner size="sm" />
                <span>Atualizando...</span>
              </div>
            )}
            <div className="bg-[#2b2d2f] rounded-lg border border-[#3a3c3f] overflow-hidden">
              <div
                className="grid gap-6 px-6 py-3 text-[#d1d1d1] text-sm font-medium border-b border-[#3a3c3f]"
                style={{ gridTemplateColumns: '3fr 2fr 2fr 2fr 1.5fr 1.5fr' }}
              >
                <button
                  onClick={() => {
                    setPage(0);
                    setSortBy(prev => (prev === 'created_at' ? prev : 'created_at'));
                    setOrder(prev =>
                      sortBy === 'created_at' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'
                    );
                  }}
                  className="text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2 transition-colors"
                >
                  Data/Hora{' '}
                  {sortBy === 'created_at' && (
                    <span className="text-[#e2b714] text-base">{order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setPage(0);
                    setSortBy(prev => (prev === 'total_time' ? prev : 'total_time'));
                    setOrder(prev =>
                      sortBy === 'total_time' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'
                    );
                  }}
                  className="text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2 transition-colors"
                >
                  Duração{' '}
                  {sortBy === 'total_time' && (
                    <span className="text-[#e2b714] text-base">{order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setPage(0);
                    setSortBy(prev => (prev === 'wpm' ? prev : 'wpm'));
                    setOrder(prev =>
                      sortBy === 'wpm' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'
                    );
                  }}
                  className="text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2 transition-colors"
                >
                  WPM{' '}
                  {sortBy === 'wpm' && (
                    <span className="text-[#e2b714] text-base">{order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setPage(0);
                    setSortBy(prev => (prev === 'accuracy' ? prev : 'accuracy'));
                    setOrder(prev =>
                      sortBy === 'accuracy' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'
                    );
                  }}
                  className="text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2 transition-colors"
                >
                  Precisão{' '}
                  {sortBy === 'accuracy' && (
                    <span className="text-[#e2b714] text-base">{order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setPage(0);
                    setSortBy(prev => (prev === 'correct_letters' ? prev : 'correct_letters'));
                    setOrder(prev =>
                      sortBy === 'correct_letters' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'
                    );
                  }}
                  className="text-center cursor-pointer hover:text-[#e2b714] flex items-center justify-center gap-2 transition-colors"
                >
                  Acertos{' '}
                  {sortBy === 'correct_letters' && (
                    <span className="text-[#e2b714] text-base">{order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setPage(0);
                    setSortBy(prev => (prev === 'incorrect_letters' ? prev : 'incorrect_letters'));
                    setOrder(prev =>
                      sortBy === 'incorrect_letters' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'
                    );
                  }}
                  className="text-center cursor-pointer hover:text-[#e2b714] flex items-center justify-center gap-2 transition-colors"
                >
                  Erros{' '}
                  {sortBy === 'incorrect_letters' && (
                    <span className="text-[#e2b714] text-base">{order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
              <div className="divide-y divide-[#3a3c3f]">
                {resultsFiltered.map(r => (
                  <div
                    key={r.id}
                    className="grid gap-6 px-6 py-3 items-center hover:bg-[#323437] transition-colors"
                    style={{ gridTemplateColumns: '3fr 2fr 2fr 2fr 1.5fr 1.5fr' }}
                  >
                    <div className="text-[#d1d1d1] text-sm">
                      {new Date(r.created_at).toLocaleString('pt-BR')}
                    </div>
                    <div className="text-[#d1d1d1] text-sm">{r.total_time}s</div>
                    <div className="text-yellow-400 font-semibold text-sm">{r.wpm} WPM</div>
                    <div className="text-[#d1d1d1] text-sm">{r.accuracy}%</div>
                    <div className="text-[#d1d1d1] text-sm text-center">{r.correct_letters}</div>
                    <div className="text-[#d1d1d1] text-sm text-center">{r.incorrect_letters}</div>
                  </div>
                ))}
                {!loading && resultsFiltered.length === 0 && (
                  <div className="py-12 px-4 text-center text-[#d1d1d1]">
                    <div className="text-4xl mb-3">📊</div>
                    <div className="text-lg font-medium mb-1">Nenhum teste encontrado</div>
                    <div className="text-sm text-[#6b6e70]">
                      Este usuário ainda não completou testes
                    </div>
                  </div>
                )}
              </div>
            </div>
            {totalCount > limit && (
              <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    page === 0
                      ? 'bg-[#292b2e] text-[#6b6e70] cursor-not-allowed'
                      : 'bg-[#3a3c3f] text-[#d1d1d1] hover:bg-[#2b2d2f]'
                  }`}
                >
                  Primeira
                </button>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    page === 0
                      ? 'bg-[#292b2e] text-[#6b6e70] cursor-not-allowed'
                      : 'bg-[#3a3c3f] text-[#d1d1d1] hover:bg-[#2b2d2f]'
                  }`}
                >
                  Anterior
                </button>
                {Array.from({ length: Math.ceil(totalCount / limit) }, (_, i) => i)
                  .filter(p => {
                    const currentPage = page;
                    return (
                      p === 0 ||
                      p === Math.ceil(totalCount / limit) - 1 ||
                      (p >= currentPage - 2 && p <= currentPage + 2)
                    );
                  })
                  .map((p, idx, arr) => {
                    const showEllipsisBefore = idx > 0 && arr[idx - 1] !== p - 1;
                    const showEllipsisAfter = idx < arr.length - 1 && arr[idx + 1] !== p + 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsisBefore && <span className="px-2 text-[#6b6e70]">...</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            page === p
                              ? 'bg-[#e2b714] text-black font-semibold'
                              : 'bg-[#3a3c3f] text-[#d1d1d1] hover:bg-[#2b2d2f]'
                          }`}
                        >
                          {p + 1}
                        </button>
                        {showEllipsisAfter && <span className="px-2 text-[#6b6e70]">...</span>}
                      </React.Fragment>
                    );
                  })}
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(totalCount / limit) - 1, p + 1))}
                  disabled={page >= Math.ceil(totalCount / limit) - 1}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    page >= Math.ceil(totalCount / limit) - 1
                      ? 'bg-[#292b2e] text-[#6b6e70] cursor-not-allowed'
                      : 'bg-[#3a3c3f] text-[#d1d1d1] hover:bg-[#2b2d2f]'
                  }`}
                >
                  Próxima
                </button>
                <button
                  onClick={() => setPage(Math.ceil(totalCount / limit) - 1)}
                  disabled={page >= Math.ceil(totalCount / limit) - 1}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    page >= Math.ceil(totalCount / limit) - 1
                      ? 'bg-[#292b2e] text-[#6b6e70] cursor-not-allowed'
                      : 'bg-[#3a3c3f] text-[#d1d1d1] hover:bg-[#2b2d2f]'
                  }`}
                >
                  Última
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
