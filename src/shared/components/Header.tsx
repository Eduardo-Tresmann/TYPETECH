"use client";
import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();

  const initials = (user?.email as string | undefined)?.slice(0, 2)?.toUpperCase() ?? 'US';

  return (
    <div className="flex justify-center py-4">
      <div className="w-full max-w-[110ch] md:max-w-[140ch] lg:max-w-[175ch] xl:max-w-[200ch] 2xl:max-w-[220ch] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between">
          <div className="text-white text-4xl font-bold">TypeTech</div>
          <div>
            {!user ? (
              <Link href="/auth/login" className="py-2 px-4 text-lg bg-[#e2b714] text-black rounded hover:bg-[#d4c013] transition-colors">
                Entrar
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#e2b714] text-black flex items-center justify-center font-semibold">
                  {initials}
                </div>
                <button onClick={signOut} className="py-2 px-4 text-lg bg-[#ca4754] text-white rounded hover:bg-[#b33f4a] transition-colors">
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;