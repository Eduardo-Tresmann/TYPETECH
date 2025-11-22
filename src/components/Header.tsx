"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';

const Header: React.FC = () => {
  const { user } = useAuth();
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

  return (
    <div className="flex justify-center py-4">
      <div className="w-full max-w-[110ch] md:max-w-[140ch] lg:max-w-[175ch] xl:max-w-[200ch] 2xl:max-w-[220ch] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between">
          <button onClick={() => { window.location.reload(); }} className="text-white text-4xl font-bold">
            TypeTech
          </button>
          <div>
            {!user ? (
              <Link href="/auth/login" className="py-2 px-4 text-lg bg-[#e2b714] text-black rounded hover:bg-[#d4c013] transition-colors">
                Entrar
              </Link>
            ) : (
              <Link href="/profile" className="flex items-center gap-3">
                <span className="text-white hover:underline">
                  {displayName ?? (user.email as string).split('@')[0]}
                </span>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#e2b714] text-black flex items-center justify-center font-semibold">
                    {initials}
                  </div>
                )}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;