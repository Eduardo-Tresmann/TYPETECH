'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import NotificationBell from '@/components/notifications/NotificationBell';
import { getCachedDisplayName, getCachedAvatarUrl, setCachedProfile } from '@/utils/storage';
import { getInitials } from '@/utils/avatar';
import { fetchProfile } from '@/services/ProfileService';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(getCachedDisplayName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(getCachedAvatarUrl);
  const initials = getInitials(
    displayName ?? (user?.email as string | undefined)?.split('@')[0],
    'US'
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

  // Garantir que o header sempre fique visível, mesmo quando o teclado abrir
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const keepHeaderVisible = () => {
      if (header) {
        header.style.position = 'fixed';
        header.style.top = '0';
        header.style.left = '0';
        header.style.right = '0';
        header.style.zIndex = '99999';
      }
    };

    // Verificar periodicamente e quando o viewport mudar
    const interval = setInterval(keepHeaderVisible, 100);

    // Usar visualViewport API se disponível
    if (window.visualViewport) {
      window.visualViewport.addEventListener('scroll', keepHeaderVisible);
      window.visualViewport.addEventListener('resize', keepHeaderVisible);
    }

    window.addEventListener('scroll', keepHeaderVisible, true);
    window.addEventListener('resize', keepHeaderVisible);

    keepHeaderVisible();

    return () => {
      clearInterval(interval);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('scroll', keepHeaderVisible);
        window.visualViewport.removeEventListener('resize', keepHeaderVisible);
      }
      window.removeEventListener('scroll', keepHeaderVisible, true);
      window.removeEventListener('resize', keepHeaderVisible);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user || !hasSupabaseConfig()) return;
      const supabase = getSupabase();
      try {
        const data = await fetchProfile(supabase, user.id);
        if (data) {
          const dn = data.display_name ?? null;
          const au = data.avatar_url ?? null;
          setDisplayName(dn);
          setAvatarUrl(au);
          setCachedProfile(dn, au);
        }
      } catch (err) {
        console.error('Erro ao carregar perfil no header:', err);
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
    <div 
      ref={headerRef}
      className="fixed top-0 left-0 right-0 w-full flex justify-center items-center h-14 bg-[#323437] z-[99999]"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0,
        bottom: 'auto',
        zIndex: 99999,
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden'
      }}
    >
      <div className="w-full max-w-[110ch] md:max-w-[140ch] lg:max-w-[175ch] xl:max-w-[200ch] 2xl:max-w-[220ch] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12">
        <div className="flex sm:grid sm:grid-cols-3 items-center justify-between sm:justify-items-center w-full gap-2">
          <div className="flex-shrink-0 justify-self-start">
            <Link
              href="/home?reset=1"
              className="flex items-center gap-1 sm:gap-2 text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold hover:text-[#e2b714] transition-colors"
              onClick={e => {
                try {
                  const isHome =
                    typeof window !== 'undefined' && window.location.pathname.startsWith('/home');
                  const fn = (window as any).typetechReset as undefined | (() => void);
                  if (isHome && typeof fn === 'function') {
                    e.preventDefault();
                    fn();
                  }
                } catch {}
              }}
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"
                  stroke="#e2b714"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="inline whitespace-nowrap">TypeTech</span>
            </Link>
          </div>
          <div className="hidden sm:flex justify-self-center">
            <Link
              href="/leaderboards"
              className="flex items-center justify-center text-white hover:text-[#e2b714] transition-colors min-h-[44px] min-w-[44px]"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3 18h18" stroke="#e2b714" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M5 18l2-9 5 4 5-7 2 12"
                  stroke="#e2b714"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="ml-1 sm:ml-2 text-base sm:text-lg font-semibold">Leaderboards</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 justify-self-end">
            {/* Leaderboards no mobile - aparece à direita */}
            <Link
              href="/leaderboards"
              className="flex sm:hidden items-center justify-center text-white hover:text-[#e2b714] transition-colors min-h-[44px] min-w-[44px]"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3 18h18" stroke="#e2b714" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M5 18l2-9 5 4 5-7 2 12"
                  stroke="#e2b714"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            {!user ? (
              <Link href="/auth/login" className="flex items-center gap-1 sm:gap-2 flex-shrink-0 min-h-[44px]">
                <span className="text-white hover:underline text-sm sm:text-base">Login</span>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#6b6e70] flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="12" cy="9" r="3.5" stroke="#ffffff" strokeWidth="2" />
                    <path
                      d="M5 19c0-4 3-6 7-6s7 2 7 6"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </Link>
            ) : (
              <>
                <div className="flex-shrink-0">
                  <NotificationBell />
                </div>
                <div className="relative min-w-0" ref={menuRef}>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setMenuOpen(v => !v);
                    }}
                    className="group flex items-center gap-2 sm:gap-3 min-w-0 max-w-full cursor-pointer hover:opacity-90 transition-all px-2 py-1.5 rounded-lg hover:bg-[#2b2d2f]/50 min-h-[44px]"
                  >
                    <span className="text-white font-medium truncate max-w-[80px] sm:max-w-[100px] md:max-w-[150px] lg:max-w-[200px] xl:max-w-[250px] block pointer-events-none text-xs sm:text-sm group-hover:text-[#e2b714] transition-colors">
                      {displayName ?? (user.email as string).split('@')[0]}
                    </span>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 pointer-events-none border-2 border-[#e2b714]/30 max-w-full h-auto"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center font-semibold text-xs sm:text-sm flex-shrink-0 pointer-events-none border-2 border-[#e2b714]">
                        {initials}
                      </div>
                    )}
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 z-[100] w-56 sm:w-64">
                      <div className="bg-[#2b2d2f] text-white rounded-xl shadow-xl p-2 space-y-1 border border-[#3a3c3f] max-w-[calc(100vw-2rem)]">
                        <Link
                          href="/stats"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 text-[#d1d1d1] hover:text-white hover:bg-[#1f2022] px-3 py-2.5 sm:py-2 rounded-lg transition-colors text-sm min-h-[44px]"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M4 20V10M10 20V6M16 20V13M3 20h18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                          Estatísticas
                        </Link>
                        <Link
                          href="/friends"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 text-[#d1d1d1] hover:text-white hover:bg-[#1f2022] px-3 py-2.5 sm:py-2 rounded-lg transition-colors text-sm min-h-[44px]"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M7 7a4 4 0 110 8a4 4 0 010-8zm10 0a4 4 0 110 8a4 4 0 010-8z"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                          Amigos
                        </Link>
                        <Link
                          href="/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 text-[#d1d1d1] hover:text-white hover:bg-[#1f2022] px-3 py-2.5 sm:py-2 rounded-lg transition-colors text-sm min-h-[44px]"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 3l9 9-9 9-9-9 9-9zm0 5v8"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Perfil
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 text-[#d1d1d1] hover:text-white hover:bg-[#1f2022] px-3 py-2.5 sm:py-2 rounded-lg transition-colors text-sm min-h-[44px]"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 4a9 9 0 11-18 0 9 9 0 0118 0z"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                          Configuração
                        </Link>
                        <div className="border-t border-[#3a3c3f] my-1"></div>
                        <button
                          onClick={async () => {
                            setMenuOpen(false);
                            await signOut();
                            window.location.href = '/home';
                          }}
                          className="flex w-full items-center gap-2.5 text-left text-[#d1d1d1] hover:text-white hover:bg-[#1f2022] px-3 py-2.5 sm:py-2 rounded-lg transition-colors text-sm min-h-[44px]"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M10 17l5-5-5-5M4 12h11"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Sair da conta
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
