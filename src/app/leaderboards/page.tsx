'use client';
import React, { useEffect, useState } from 'react';
import ModeBar from '@/components/game/ModeBar';
import Link from 'next/link';
import {
  fetchLeaderboardGlobal,
  fetchUserResultsFiltered,
  fetchProfiles,
  LeaderboardRow,
} from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useSound } from '@/hooks/useSound';

type Row = {
  wpm: number;
  accuracy: number;
  total_time: number;
  created_at: string;
  user_id: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
  correct_letters?: number;
  incorrect_letters?: number;
  display_name?: string | null;
  avatar_url?: string | null;
  email_prefix?: string | null;
};

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const { playClick } = useSound();
  const [selected, setSelected] = useState(15);
  const [rows, setRows] = useState<Row[]>([]);
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setPage(0); // Resetar para primeira página ao mudar duração
      // Função RPC com security definer garante acesso seguro aos resultados verificados
      // Buscar mais resultados para ter uma boa base para paginação após deduplicação
      const rpc = await fetchLeaderboardGlobal(selected, 500);
      console.log('leaderboard_rpc response', {
        selected,
        dataCount: Array.isArray(rpc.data) ? rpc.data.length : null,
        error: rpc.error,
      });
      let arr: LeaderboardRow[] = (rpc.data ?? []) as LeaderboardRow[];
      let fromRpc = Array.isArray(rpc.data) && rpc.data.length > 0;

      if (!arr || arr.length === 0) {
        console.log('leaderboard empty, fallback to user results', {
          arrLen: arr?.length ?? 0,
          userId: user?.id,
        });
        if (user?.id) {
          const { data: mine } = await fetchUserResultsFiltered({
            userId: user.id,
            durations: [selected],
            sortBy: 'wpm',
            order: 'desc',
            limit: 500,
          });
          console.log('fallback fetchUserResultsFiltered', {
            count: Array.isArray(mine) ? mine.length : null,
          });
          arr = (mine ?? []) as LeaderboardRow[];
        }
      }
      const bestByUser = new Map<string, LeaderboardRow>();
      for (const r of arr) {
        const prev = bestByUser.get(r.user_id);
        if (!prev || r.wpm > prev.wpm) bestByUser.set(r.user_id, r);
      }
      const sorted: LeaderboardRow[] = Array.from(bestByUser.values())
        .sort((a, b) => b.wpm - a.wpm);
      console.log('deduped and sorted', { inputLen: arr.length, uniqueUsers: sorted.length });
      if (!fromRpc && sorted.some(r => r.display_name == null || r.avatar_url == null)) {
        const ids = Array.from(
          new Set(
            sorted.filter(r => r.display_name == null || r.avatar_url == null).map(r => r.user_id)
          )
        );
        const { data: profs } = await fetchProfiles(ids);
        console.log('fetchProfiles for missing', {
          idsCount: ids.length,
          profsCount: Array.isArray(profs) ? profs.length : null,
        });
        const byId: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
        for (const p of profs ?? [])
          byId[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
        const enriched = sorted.map(r => ({
          ...r,
          profiles: {
            display_name: r.display_name ?? byId[r.user_id]?.display_name ?? null,
            avatar_url: r.avatar_url ?? byId[r.user_id]?.avatar_url ?? null,
          },
        }));
        setAllRows(enriched as Row[]);
      } else {
        const enriched = sorted.map(r => ({
          ...r,
          profiles: { display_name: r.display_name ?? null, avatar_url: r.avatar_url ?? null },
        }));
        setAllRows(enriched as Row[]);
      }
      setLoading(false);
    };
    run();
  }, [selected, user?.id]);

  // Aplicar paginação aos resultados deduplicados
  useEffect(() => {
    const start = page * limit;
    const end = start + limit;
    setRows(allRows.slice(start, end));
  }, [allRows, page, limit]);

  return (
    <div className="min-h-screen bg-[#323437] flex flex-col items-center justify-start px-4 sm:px-6 pb-8">
      <div className="w-full max-w-[120ch] text-white mt-14">
        <div className="space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">Leaderboards</h2>
            <Link href="/home" className="text-[#e2b714] text-sm sm:text-base">
              Voltar
            </Link>
          </div>
          <div>
            <div className="mb-6 w-full flex justify-center">
              <div className="w-full rounded-xl bg-[#2b2d2f] border border-[#3a3c3f] overflow-hidden">
                <div className="flex items-center justify-center gap-3 p-3">
                  <ModeBar
                    totalTime={selected}
                    onSelectTime={(time) => {
                      playClick();
                      setSelected(time);
                      setPage(0); // Resetar para primeira página ao mudar duração
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#2b2d2f] rounded-lg border border-[#3a3c3f] overflow-hidden">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-center mb-4 sm:mb-6">Top WPM • {selected}s</h2>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12">
                  <LoadingSpinner />
                  <span className="text-[#d1d1d1] text-sm sm:text-base">Carregando...</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-12 text-[#d1d1d1]">
                  <div className="text-3xl sm:text-4xl mb-3">🏆</div>
                  <div className="text-base sm:text-lg font-medium mb-1">Nenhum resultado ainda</div>
                  <div className="text-xs sm:text-sm text-[#6b6e70]">
                    Complete alguns testes para aparecer no leaderboard
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop: Tabela */}
                  <div className="hidden md:block">
                    <div
                      className="grid gap-4 sm:gap-6 px-4 sm:px-6 py-3 text-[#d1d1d1] text-xs sm:text-sm font-medium border-b border-[#3a3c3f]"
                      style={{ gridTemplateColumns: '1fr 3fr 2fr 2fr 2fr 1.5fr 1.5fr' }}
                    >
                      <div className="text-center">Pos.</div>
                      <div>Usuário</div>
                      <div className="text-center">WPM</div>
                      <div className="text-center">Precisão</div>
                      <div className="text-center">Data/Hora</div>
                      <div className="text-center">Acertos</div>
                      <div className="text-center">Erros</div>
                    </div>
                    <div className="divide-y divide-[#3a3c3f]">
                      {rows.map((r, idx) => {
                        const displayBase =
                          r.profiles?.display_name ?? r.display_name ?? r.email_prefix ?? 'Usuário';
                        const displayName = displayBase?.includes('@')
                          ? displayBase.split('@')[0]
                          : displayBase;
                        const avatarUrl = r.profiles?.avatar_url ?? r.avatar_url ?? null;
                        const initials = (displayName ?? 'US').slice(0, 2).toUpperCase();
                        const globalPosition = page * limit + idx + 1;
                        return (
                          <div
                            key={`${r.user_id}-${r.created_at}`}
                            className="grid gap-4 sm:gap-6 px-4 sm:px-6 py-3 items-center hover:bg-[#323437] transition-colors"
                            style={{ gridTemplateColumns: '1fr 3fr 2fr 2fr 2fr 1.5fr 1.5fr' }}
                          >
                            <div className="text-[#d1d1d1] text-xs sm:text-sm text-center font-semibold">
                              {globalPosition}
                            </div>
                            <Link
                              href={`/stats/${encodeURIComponent(r.user_id)}`}
                              onClick={() => {
                                try {
                                  if (typeof window !== 'undefined') {
                                    localStorage.setItem(
                                      `profile.cache.${r.user_id}`,
                                      JSON.stringify({
                                        display_name: displayName,
                                        avatar_url: avatarUrl,
                                      })
                                    );
                                  }
                                } catch {}
                              }}
                              className="flex items-center gap-3 hover:text-[#e2b714] transition-colors"
                            >
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt="avatar"
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover max-w-full h-auto"
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-xs sm:text-sm font-semibold">
                                  {initials}
                                </div>
                              )}
                              <div>
                                <div className="text-white font-medium text-xs sm:text-sm">{displayName}</div>
                              </div>
                            </Link>
                            <div className="text-yellow-400 font-semibold text-xs sm:text-sm text-center">
                              {r.wpm} WPM
                            </div>
                            <div className="text-[#d1d1d1] text-xs sm:text-sm text-center">{r.accuracy}%</div>
                            <div className="text-[#d1d1d1] text-xs sm:text-sm text-center">
                              {new Date(r.created_at).toLocaleString('pt-BR')}
                            </div>
                            <div className="text-[#d1d1d1] text-xs sm:text-sm text-center">
                              {r.correct_letters ?? '-'}
                            </div>
                            <div className="text-[#d1d1d1] text-xs sm:text-sm text-center">
                              {r.incorrect_letters ?? '-'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile: Cards */}
                  <div className="md:hidden space-y-3">
                    {rows.map((r, idx) => {
                      const displayBase =
                        r.profiles?.display_name ?? r.display_name ?? r.email_prefix ?? 'Usuário';
                      const displayName = displayBase?.includes('@')
                        ? displayBase.split('@')[0]
                        : displayBase;
                      const avatarUrl = r.profiles?.avatar_url ?? r.avatar_url ?? null;
                      const initials = (displayName ?? 'US').slice(0, 2).toUpperCase();
                      const globalPosition = page * limit + idx + 1;
                      return (
                        <Link
                          key={`${r.user_id}-${r.created_at}`}
                          href={`/stats/${encodeURIComponent(r.user_id)}`}
                          onClick={() => {
                            try {
                              if (typeof window !== 'undefined') {
                                localStorage.setItem(
                                  `profile.cache.${r.user_id}`,
                                  JSON.stringify({
                                    display_name: displayName,
                                    avatar_url: avatarUrl,
                                  })
                                );
                              }
                            } catch {}
                          }}
                          className="block bg-[#323437] rounded-lg border border-[#3a3c3f] p-4 hover:bg-[#2b2d2f] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="text-[#e2b714] font-bold text-lg">#{globalPosition}</div>
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt="avatar"
                                  className="w-10 h-10 rounded-full object-cover max-w-full h-auto"
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">
                                  {initials}
                                </div>
                              )}
                              <div className="text-white font-medium">{displayName}</div>
                            </div>
                            <div className="text-yellow-400 font-semibold text-lg">{r.wpm} WPM</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-[#d1d1d1]">
                            <div>
                              <span className="text-[#6b6e70]">Precisão:</span> {r.accuracy}%
                            </div>
                            <div>
                              <span className="text-[#6b6e70]">Acertos:</span> {r.correct_letters ?? '-'}
                            </div>
                            <div>
                              <span className="text-[#6b6e70]">Erros:</span> {r.incorrect_letters ?? '-'}
                            </div>
                          </div>
                          <div className="text-xs text-[#6b6e70] mt-2">
                            {new Date(r.created_at).toLocaleString('pt-BR')}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          {allRows.length > limit && (
            <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  playClick();
                  setPage(0);
                }}
                disabled={page === 0}
                className={`px-3 py-2 sm:py-1 rounded text-xs sm:text-sm transition-colors min-h-[44px] ${
                  page === 0
                    ? 'bg-[#292b2e] text-[#6b6e70] cursor-not-allowed'
                    : 'bg-[#3a3c3f] text-[#d1d1d1] hover:bg-[#2b2d2f]'
                }`}
              >
                Primeira
              </button>
              <button
                onClick={() => {
                  playClick();
                  setPage(p => Math.max(0, p - 1));
                }}
                disabled={page === 0}
                className={`px-3 py-2 sm:py-1 rounded text-xs sm:text-sm transition-colors min-h-[44px] ${
                  page === 0
                    ? 'bg-[#292b2e] text-[#6b6e70] cursor-not-allowed'
                    : 'bg-[#3a3c3f] text-[#d1d1d1] hover:bg-[#2b2d2f]'
                }`}
              >
                Anterior
              </button>
              {Array.from({ length: Math.ceil(allRows.length / limit) }, (_, i) => i)
                .filter(p => {
                  const currentPage = page;
                  return (
                    p === 0 ||
                    p === Math.ceil(allRows.length / limit) - 1 ||
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
                        onClick={() => {
                          playClick();
                          setPage(p);
                        }}
                        className={`px-3 py-2 sm:py-1 rounded text-xs sm:text-sm transition-colors min-h-[44px] min-w-[44px] ${
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
                onClick={() => {
                  playClick();
                  setPage(p => Math.min(Math.ceil(allRows.length / limit) - 1, p + 1));
                }}
                disabled={page >= Math.ceil(allRows.length / limit) - 1}
                className={`px-3 py-2 sm:py-1 rounded text-xs sm:text-sm transition-colors min-h-[44px] ${
                  page >= Math.ceil(allRows.length / limit) - 1
                    ? 'bg-[#292b2e] text-[#6b6e70] cursor-not-allowed'
                    : 'bg-[#3a3c3f] text-[#d1d1d1] hover:bg-[#2b2d2f]'
                }`}
              >
                Próxima
              </button>
              <button
                onClick={() => {
                  playClick();
                  setPage(Math.ceil(allRows.length / limit) - 1);
                }}
                disabled={page >= Math.ceil(allRows.length / limit) - 1}
                className={`px-3 py-2 sm:py-1 rounded text-xs sm:text-sm transition-colors min-h-[44px] ${
                  page >= Math.ceil(allRows.length / limit) - 1
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
  );
}
