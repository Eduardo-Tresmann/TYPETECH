'use client';
import React, { useEffect, useState } from 'react';
import ModeBar from '@/components/ModeBar';
import Link from 'next/link';
import { fetchLeaderboard, fetchLeaderboardGlobal, fetchUserResultsFiltered, fetchProfiles, LeaderboardRow } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

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
  const [selected, setSelected] = useState(15);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      // Try global RPC (security definer) first, then fallback to view
      const rpc = await fetchLeaderboardGlobal(selected, 200);
      console.log('leaderboard_rpc response', { selected, dataCount: Array.isArray(rpc.data) ? rpc.data.length : null, error: rpc.error });
      let arr: LeaderboardRow[] = (rpc.data ?? []) as LeaderboardRow[];
      let fromRpc = Array.isArray(rpc.data) && rpc.data.length > 0;
      if (!arr || arr.length === 0) {
        const view = await fetchLeaderboard(selected, 200);
        console.log('leaderboard_view response', { selected, dataCount: Array.isArray(view.data) ? view.data.length : null, error: view.error });
        arr = (view.data ?? []) as LeaderboardRow[];
        fromRpc = false;
      }
      if (!arr || arr.length === 0) {
        console.log('leaderboard empty, fallback to user results', { arrLen: arr?.length ?? 0, userId: user?.id });
        if (user?.id) {
          const { data: mine } = await fetchUserResultsFiltered({
            userId: user.id,
            durations: [selected],
            sortBy: 'wpm',
            order: 'desc',
            limit: 200,
          });
          console.log('fallback fetchUserResultsFiltered', { count: Array.isArray(mine) ? mine.length : null });
          arr = (mine ?? []) as LeaderboardRow[];
        }
      }
      const bestByUser = new Map<string, LeaderboardRow>();
      for (const r of arr) {
        const prev = bestByUser.get(r.user_id);
        if (!prev || r.wpm > prev.wpm) bestByUser.set(r.user_id, r);
      }
      const sorted: LeaderboardRow[] = Array.from(bestByUser.values()).sort((a, b) => b.wpm - a.wpm).slice(0, 50);
      console.log('deduped and sorted', { inputLen: arr.length, uniqueUsers: sorted.length });
      if (!fromRpc && sorted.some((r) => r.display_name == null || r.avatar_url == null)) {
        const ids = Array.from(new Set(sorted.filter((r)=> r.display_name == null || r.avatar_url == null).map((r) => r.user_id)));
        const { data: profs } = await fetchProfiles(ids);
        console.log('fetchProfiles for missing', { idsCount: ids.length, profsCount: Array.isArray(profs) ? profs.length : null });
        const byId: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
        for (const p of profs ?? []) byId[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
        const enriched = sorted.map((r) => ({ ...r, profiles: { display_name: r.display_name ?? byId[r.user_id]?.display_name ?? null, avatar_url: r.avatar_url ?? byId[r.user_id]?.avatar_url ?? null } }));
        setRows(enriched as Row[]);
      } else {
        const enriched = sorted.map((r) => ({ ...r, profiles: { display_name: r.display_name ?? null, avatar_url: r.avatar_url ?? null } }));
        setRows(enriched as Row[]);
      }
      setLoading(false);
    };
    run();
  }, [selected, user?.id]);

  return (
    <div className="min-h-screen bg-[#323437] flex flex-col items-center justify-start px-6">
      <div className="w-full max-w-[120ch] text-white mt-14">
        <h2 className="text-xl font-semibold text-center mb-4">Leaderboards</h2>
        <div className="mb-6 w-full flex justify-center">
          <div className="w-full rounded-xl bg-[#323437] ring-1 ring-[#3a3c3f] overflow-hidden">
            <div className="flex items-center justify-center gap-3 p-3">
              <ModeBar totalTime={selected} onSelectTime={setSelected} />
            </div>
          </div>
        </div>

        <div className="rounded p-6 text-white ring-1 ring-[#3a3c3f]">
          <h2 className="text-xl font-semibold text-center mb-4">Top WPM • {selected}s</h2>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12">
              <LoadingSpinner />
              <span className="text-[#d1d1d1]">Carregando...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-[#d1d1d1]">
              <div className="text-4xl mb-3">🏆</div>
              <div className="text-lg font-medium mb-1">Nenhum resultado ainda</div>
              <div className="text-sm text-[#6b6e70]">Complete alguns testes para aparecer no leaderboard</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-10 px-2 text-[#d1d1d1] mb-1">
                <div className="col-span-1">Pos.</div>
                <div className="col-span-5">Usuário</div>
                <div className="col-span-2">WPM</div>
                <div className="col-span-2">Precisão</div>
              </div>
              <div className="divide-y divide-[#3a3c3f]">
                {rows.map((r, idx) => {
                  const displayBase = r.profiles?.display_name ?? r.display_name ?? r.email_prefix ?? 'Usuário';
                  const displayName = displayBase?.includes('@') ? displayBase.split('@')[0] : displayBase;
                  const avatarUrl = r.profiles?.avatar_url ?? r.avatar_url ?? null;
                  const initials = (displayName ?? 'US').slice(0,2).toUpperCase();
                  return (
                  <div key={`${r.user_id}-${r.created_at}`} className="py-1.5 px-2 grid grid-cols-10 items-center hover:bg-[#2b2d2f] rounded">
                    <div className="col-span-1 text-[#d1d1d1]">{idx + 1}</div>
                    <Link href={`/stats/${encodeURIComponent(r.user_id)}`} onClick={()=>{ try{ if (typeof window !== 'undefined') { localStorage.setItem(`profile.cache.${r.user_id}`, JSON.stringify({ display_name: displayName, avatar_url: avatarUrl })); } }catch{} }} className="col-span-5 flex items-center gap-3">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-xs font-semibold">
                          {initials}
                        </div>
                      )}
                      <div>
                        <div className="text-white">{displayName}</div>
                        <div className="text-[#6b6e70] text-sm">{new Date(r.created_at).toLocaleString()}</div>
                      </div>
                    </Link>
                    <div className="col-span-2 text-yellow-400 font-semibold">{r.wpm} WPM</div>
                    <div className="col-span-2 text-[#d1d1d1]">{r.accuracy}%</div>
                  </div>
                );})}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
