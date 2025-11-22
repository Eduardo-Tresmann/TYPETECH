"use client";
import React, { useState } from 'react';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import Link from 'next/link';

type Props = {
  mode: 'login' | 'register';
};

const AuthForm: React.FC<Props> = ({ mode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    setCanResend(false);
    try {
      if (!hasSupabaseConfig()) throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      const supabase = getSupabase();
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (typeof error.message === 'string' && error.message.toLowerCase().includes('email not confirmed')) {
            setCanResend(true);
            throw new Error('Email não confirmado. Reenvie o e-mail de verificação.');
          }
          throw error;
        }
        window.location.href = '/home';
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setInfo('Cadastro realizado. Verifique seu e-mail para confirmar sua conta.');
        } else {
          window.location.href = '/home';
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!hasSupabaseConfig()) throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      const supabase = getSupabase();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        ...(redirectBase ? { options: { emailRedirectTo: `${redirectBase}/home` } } : {}),
      });
      if (error) throw error;
      setInfo('E-mail de confirmação reenviado. Confira sua caixa de entrada.');
      setCanResend(false);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao reenviar e-mail');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[60ch] mx-auto text-left">
      <h1 className="text-white text-3xl font-bold mb-6">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded bg-[#2c2e31] text-white outline-none"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded bg-[#2c2e31] text-white outline-none"
          required
        />
        {error && <div className="text-[#ca4754]">{error}</div>}
        {info && <div className="text-[#e2b714]">{info}</div>}
        {canResend && (
          <div>
            <button type="button" onClick={handleResend} disabled={loading || !email} className="py-2 px-4 text-lg bg-[#e2b714] text-black rounded hover:bg-[#d4c013] transition-colors w-full">
              Reenviar e-mail de confirmação
            </button>
          </div>
        )}
        <button type="submit" disabled={loading} className="py-2 px-4 text-lg bg-[#e2b714] text-black rounded hover:bg-[#d4c013] transition-colors w-full">
          {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Registrar'}
        </button>
      </form>
      
      <div className="mt-4 text-[#d1d1d1]">
        {mode === 'login' ? (
          <span>
            Não tem conta? <Link href="/auth/register" className="text-[#e2b714]">Registre-se</Link>
          </span>
        ) : (
          <span>
            Já tem conta? <Link href="/auth/login" className="text-[#e2b714]">Entrar</Link>
          </span>
        )}
      </div>
    </div>
  );
};

export default AuthForm;