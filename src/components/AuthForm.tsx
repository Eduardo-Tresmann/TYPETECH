"use client";
import React, { useRef, useState } from 'react';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import Link from 'next/link';
import { translateError } from '@/lib/errorMessages';

type Props = {
  mode: 'login' | 'register';
};

const AuthForm: React.FC<Props> = ({ mode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const normalizeEmail = (v: string) => v.trim().toLowerCase();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    
    try {
      if (!hasSupabaseConfig()) throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      const supabase = getSupabase();
      if (emailRef.current) emailRef.current.setCustomValidity('');
      if (confirmRef.current) confirmRef.current.setCustomValidity('');
      const emailNorm = normalizeEmail(email);
      if (!isValidEmail(emailNorm)) {
        emailRef.current?.setCustomValidity('Email inválido. Use formato nome@dominio.tld');
        emailRef.current?.reportValidity();
        throw new Error('');
      }
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: emailNorm, password });
        if (error) {
          throw error;
        }
        window.location.href = '/home';
      } else {
        if (password !== confirmPassword) {
          confirmRef.current?.setCustomValidity('As senhas não coincidem. Use a mesma senha nos dois campos.');
          confirmRef.current?.reportValidity();
          throw new Error('');
        }
        const { data, error } = await supabase.auth.signUp({ email: emailNorm, password });
        if (error) throw error;
        if (data.session) {
          window.location.href = '/home';
        } else {
          setInfo('Conta criada. Verifique seu email para confirmar e então entrar.');
        }
      }
    } catch (err: any) {
      const msg = translateError(err);
      if (msg) setError(msg);
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
          onChange={(e) => { emailRef.current?.setCustomValidity(''); setEmail(normalizeEmail(e.target.value)); }}
          className="w-full p-3 rounded bg-[#2c2e31] text-white outline-none"
          required
          ref={emailRef}
        />
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Senha"
            value={password}
            onChange={(e) => { passwordRef.current?.setCustomValidity(''); setPassword(e.target.value); }}
            className="w-full p-3 rounded bg-[#2c2e31] text-white outline-none pr-12"
            required
            ref={passwordRef}
          />
          <button
            type="button"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#d1d1d1] hover:text-white transition-transform duration-200 transform hover:scale-110 active:scale-95"
          >
            {showPassword ? (
              <svg className="transition-transform duration-200 transform rotate-180" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>
        {mode === 'register' && (
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChange={(e) => { confirmRef.current?.setCustomValidity(''); setConfirmPassword(e.target.value); }}
              className="w-full p-3 rounded bg-[#2c2e31] text-white outline-none pr-12"
              required
              ref={confirmRef}
            />
          <button
            type="button"
            aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
            onClick={() => setShowConfirm((v) => !v)}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#d1d1d1] hover:text-white transition-transform duration-200 transform hover:scale-110 active:scale-95"
          >
              {showConfirm ? (
                <svg className="transition-transform duration-200 transform rotate-180" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
              )}
            </button>
          </div>
        )}
        {error && <div className="text-[#ca4754]">{error}</div>}
        {info && !error && <div className="text-[#e2b714]">{info}</div>}
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