"use client";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import NotificationBell from './NotificationBell';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('profile.display_name');
      return cached || null;
    }
    return null;
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('profile.avatar_url');
      return cached || null;
    }
    return null;
  });
  const initials = (displayName ?? (user?.email as string | undefined)?.split('@')[0] ?? 'US').slice(0, 2).toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user || !hasSupabaseConfig()) return;
      const supabase = getSupabase();
      const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle();
      const dn = data?.display_name ?? null;
      const au = data?.avatar_url ?? null;
      setDisplayName(dn);
      setAvatarUrl(au);
      if (typeof window !== 'undefined') {
        if (dn) localStorage.setItem('profile.display_name', dn);
        if (au) localStorage.setItem('profile.avatar_url', au);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    if (menuOpen) {
      // Usar setTimeout para garantir que o evento de abertura seja processado primeiro
      setTimeout(() => {
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
      }, 0);
      return () => {
        document.removeEventListener('mousedown', onDocClick);
        document.removeEventListener('keydown', onKey);
      };
    }
  }, [menuOpen]);

  return (
    <div className="fixed top-0 left-0 w-full flex justify-center items-center h-14 bg-[#323437] z-50">
      <div className="w-full max-w-[110ch] md:max-w-[140ch] lg:max-w-[175ch] xl:max-w-[200ch] 2xl:max-w-[220ch] mx-auto px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40">
        <div className="grid grid-cols-3 items-center min-w-0">
          <div className="justify-self-start">
            <Link href="/home?reset=1" className="flex items-center gap-2 text-white text-3xl font-bold hover:text-[#e2b714] transition-colors" onClick={(e) => {
              try {
                const isHome = typeof window !== 'undefined' && window.location.pathname.startsWith('/home');
                const fn = (window as any).typetechReset as undefined | (() => void);
                if (isHome && typeof fn === 'function') {
                  e.preventDefault();
                  fn();
                }
              } catch {}
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" stroke="#e2b714" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              TypeTech
            </Link>
          </div>
          <div className="justify-self-center">
            <Link href="/leaderboards" className="flex items-center gap-2 text-white text-lg font-semibold tracking-wide hover:text-[#e2b714] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 18h18" stroke="#e2b714" strokeWidth="2" strokeLinecap="round"/>
                <path d="M5 18l2-9 5 4 5-7 2 12" stroke="#e2b714" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Leaderboards
            </Link>
          </div>
          <div className="justify-self-end min-w-0">
            {!user ? (
              <Link href="/auth/login" className="flex items-center gap-3 flex-shrink-0">
                <span className="text-white hover:underline">Login</span>
                <div className="w-9 h-9 rounded-full bg-[#6b6e70] flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="9" r="3.5" stroke="#ffffff" strokeWidth="2"/>
                    <path d="M5 19c0-4 3-6 7-6s7 2 7 6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 min-w-0">
                <NotificationBell />
                <div className="relative min-w-0" ref={menuRef}>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen((v) => !v);
                    }} 
                    className="flex items-center gap-3 min-w-0 max-w-full cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <span className="text-white hover:underline truncate max-w-[150px] sm:max-w-[200px] md:max-w-[250px] block pointer-events-none">
                      {displayName ?? (user.email as string).split('@')[0]}
                    </span>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover flex-shrink-0 pointer-events-none" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#e2b714] text-black flex items-center justify-center font-semibold flex-shrink-0 pointer-events-none">
                      {initials}
                    </div>
                  )}
                </button>
                {menuOpen && (
                <div className="absolute right-0 top-full mt-2 z-[100]">
                  <div className="w-56 bg-[#2c2e31] text-white rounded-lg shadow-lg p-3 space-y-2 border border-[#3a3c3f]">
                    <Link href="/stats" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-[#d1d1d1] hover:text-[#e2b714]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 20V10M10 20V6M16 20V13M3 20h18" stroke="#d1d1d1" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Estatísticas
                    </Link>
                    <Link href="/friends" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-[#d1d1d1] hover:text-[#e2b714]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 7a4 4 0 110 8a4 4 0 010-8zm10 0a4 4 0 110 8a4 4 0 010-8z" stroke="#d1d1d1" strokeWidth="2"/>
                      </svg>
                      Amigos
                    </Link>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-[#d1d1d1] hover:text-[#e2b714]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3l9 9-9 9-9-9 9-9zm0 5v8" stroke="#d1d1d1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Perfil
                    </Link>
                    <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-[#d1d1d1] hover:text-[#e2b714]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 4a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#d1d1d1" strokeWidth="2"/>
                      </svg>
                      Configuração
                    </Link>
                    <button onClick={async () => { setMenuOpen(false); await signOut(); window.location.href = '/home'; }} className="flex w-full items-center gap-2 text-left text-[#d1d1d1] hover:text-[#e2b714]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 17l5-5-5-5M4 12h11" stroke="#d1d1d1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Sair da conta
                    </button>
                  </div>
                </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
