'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchUserResults, fetchUserResultsFiltered } from '@/lib/db';

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

export default function StatsPage() {
  const { user } = useAuth();
  const [resultsAll, setResultsAll] = useState<Result[]>([]);
  const [resultsFiltered, setResultsFiltered] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [durations, setDurations] = useState<number[]>([15, 30, 60, 120]);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at'|'wpm'|'accuracy'|'total_time'>('created_at');
  const [order, setOrder] = useState<'asc'|'desc'>('desc');
  const [wpmMin, setWpmMin] = useState<number | undefined>(undefined);
  const [accMin, setAccMin] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      // Buscar todos os resultados para estatísticas (não afetado por filtros de duração)
      const { data: all } = await fetchUserResults(user.id);
      setResultsAll((all as Result[]) ?? []);

      // Buscar resultados filtrados apenas para o histórico
      setLoading(true);
      const { data: filtered } = await fetchUserResultsFiltered({
        userId: user.id,
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
  }, [user, durations, start, end, sortBy, order, wpmMin, accMin, page]);

  const kpis = useMemo(() => {
    if (resultsAll.length === 0) return null;
    const byTime: Record<number, Result[]> = { 15: [], 30: [], 60: [], 120: [] };
    for (const r of resultsAll) {
      (byTime[r.total_time] ??= []).push(r);
    }
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
        <div className="space-y-6">
          

          <>
              <h2 className="text-xl font-semibold text-center mb-4">Estatísticas</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-4 rounded border border-[#3a3c3f]">
                  <div className="text-[#d1d1d1] text-sm">Melhor WPM (geral)</div>
                  <div className="text-yellow-400 text-2xl font-bold">{kpis ? kpis.bestOverall.wpm : 0}</div>
                </div>
                <div className="p-4 rounded border border-[#3a3c3f]">
                  <div className="text-[#d1d1d1] text-sm">Média WPM</div>
                  <div className="text-yellow-400 text-2xl font-bold">{kpis ? kpis.avgWpm : 0}</div>
                </div>
                <div className="p-4 rounded border border-[#3a3c3f]">
                  <div className="text-[#d1d1d1] text-sm">Média Precisão</div>
                  <div className="text-yellow-400 text-2xl font-bold">{kpis ? `${kpis.avgAcc}%` : '0%'}</div>
                </div>
                <div className="p-4 rounded border border-[#3a3c3f]">
                  <div className="text-[#d1d1d1] text-sm">Testes</div>
                  <div className="text-yellow-400 text-2xl font-bold">{kpis ? kpis.totals.tests : 0}</div>
                </div>
              </div>
              {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {kpis.bestByTime.map((b) => (
                    <div key={b.total_time} className="p-4 rounded border border-[#3a3c3f]">
                      <div className="text-[#d1d1d1] text-sm">Melhor WPM • {b.total_time}s</div>
                      <div className="text-yellow-400 text-2xl font-bold">{b.wpm}</div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h2 className="text-xl font-semibold text-center mb-4">Histórico</h2>
                <div className="mb-4 rounded-xl bg-[#323437] ring-1 ring-[#3a3c3f] overflow-hidden">
                  <div className="flex items-center justify-center gap-3 p-3 rounded-full">
                    {[15,30,60,120].map((t)=>{
                      const active = durations.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={()=>{
                            setPage(0);
                            setDurations((prev)=>active? prev.filter(x=>x!==t): [...prev, t]);
                          }}
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
                  <button
                    onClick={()=>{setPage(0); setSortBy((prev)=> prev==='created_at' ? prev : 'created_at'); setOrder((prev)=> sortBy==='created_at' ? (prev==='desc'?'asc':'desc') : 'desc');}}
                    className="col-span-4 text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2"
                  >
                    Data/Hora
                    {sortBy==='created_at' && (
                      <span className="text-[#e2b714]">{order==='asc'?'↑':'↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={()=>{setPage(0); setSortBy((prev)=> prev==='total_time' ? prev : 'total_time'); setOrder((prev)=> sortBy==='total_time' ? (prev==='desc'?'asc':'desc') : 'desc');}}
                    className="col-span-2 text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2"
                  >
                    Duração
                    {sortBy==='total_time' && (
                      <span className="text-[#e2b714]">{order==='asc'?'↑':'↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={()=>{setPage(0); setSortBy((prev)=> prev==='wpm' ? prev : 'wpm'); setOrder((prev)=> sortBy==='wpm' ? (prev==='desc'?'asc':'desc') : 'desc');}}
                    className="col-span-2 text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2"
                  >
                    WPM
                    {sortBy==='wpm' && (
                      <span className="text-[#e2b714]">{order==='asc'?'↑':'↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={()=>{setPage(0); setSortBy((prev)=> prev==='accuracy' ? prev : 'accuracy'); setOrder((prev)=> sortBy==='accuracy' ? (prev==='desc'?'asc':'desc') : 'desc');}}
                    className="col-span-2 text-left cursor-pointer hover:text-[#e2b714] flex items-center gap-2"
                  >
                    Precisão
                    {sortBy==='accuracy' && (
                      <span className="text-[#e2b714]">{order==='asc'?'↑':'↓'}</span>
                    )}
                  </button>
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
            </>
        </div>
      </div>
    </div>
  );
}
