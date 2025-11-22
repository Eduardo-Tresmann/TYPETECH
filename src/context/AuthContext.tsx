"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';

type AuthContextType = {
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!hasSupabaseConfig()) {
        setUser(null);
        setLoading(false);
        return;
      }
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    init();

    if (hasSupabaseConfig()) {
      const supabase = getSupabase();
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      return () => {
        sub.subscription.unsubscribe();
      };
    }
    return () => {};
  }, []);

  const signOut = async () => {
    if (!hasSupabaseConfig()) return;
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};