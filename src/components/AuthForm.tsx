"use client";
import React, { useRef, useState } from 'react';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import Link from 'next/link';
import { translateError } from '@/lib/errorMessages';
import LoadingSpinner from './LoadingSpinner';

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
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#2b2d2f] rounded-xl border border-[#3a3c3f] p-8 text-white shadow-xl">
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold mb-2">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
          <p className="text-[#d1d1d1] text-sm">
            {mode === 'login' ? 'Acesse sua conta para continuar' : 'Crie sua conta para começar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#d1d1d1] text-sm font-medium mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => { emailRef.current?.setCustomValidity(''); setEmail(normalizeEmail(e.target.value)); }}
              className="w-full p-3.5 rounded-lg bg-[#1f2022] text-white outline-none border border-[#3a3c3f] focus:border-[#e2b714] focus:ring-2 focus:ring-[#e2b714]/20 transition-all text-sm"
              required
              ref={emailRef}
            />
          </div>

          <div>
            <label className="block text-[#d1d1d1] text-sm font-medium mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { passwordRef.current?.setCustomValidity(''); setPassword(e.target.value); }}
                className="w-full p-3.5 rounded-lg bg-[#1f2022] text-white outline-none border border-[#3a3c3f] focus:border-[#e2b714] focus:ring-2 focus:ring-[#e2b714]/20 transition-all pr-12 text-sm"
                required
                ref={passwordRef}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d1d1d1] hover:text-white transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[#d1d1d1] text-sm font-medium mb-1.5">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => { confirmRef.current?.setCustomValidity(''); setConfirmPassword(e.target.value); }}
                  className="w-full p-3.5 rounded-lg bg-[#1f2022] text-white outline-none border border-[#3a3c3f] focus:border-[#e2b714] focus:ring-2 focus:ring-[#e2b714]/20 transition-all pr-12 text-sm"
                  required
                  ref={confirmRef}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d1d1d1] hover:text-white transition-colors"
                >
                  {showConfirm ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Mensagens de erro/sucesso */}
          {(error || info) && (
            <div>
              {error && (
                <div className="p-3.5 bg-[#ca4754]/10 border border-[#ca4754]/30 rounded-lg text-[#ca4754] text-sm flex items-center gap-2.5">
                  <svg className="w-4.5 h-4.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="break-words">{error}</span>
                </div>
              )}
              {!error && info && (
                <div className="p-3.5 bg-[#e2b714]/10 border border-[#e2b714]/30 rounded-lg text-[#e2b714] text-sm flex items-center gap-2.5">
                  <svg className="w-4.5 h-4.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="break-words">{info}</span>
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-3.5 px-6 bg-[#e2b714] text-black rounded-lg hover:bg-[#d4c013] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl disabled:shadow-none text-sm"
          >
            {loading && <LoadingSpinner size="sm" className="border-black border-t-transparent" />}
            {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        
        <div className="mt-6 pt-5 border-t border-[#3a3c3f] text-center">
          <p className="text-[#d1d1d1] text-sm">
            {mode === 'login' ? (
              <>
                Não tem conta?{' '}
                <Link href="/auth/register" className="text-[#e2b714] hover:text-[#d4c013] transition-colors font-medium">
                  Registre-se
                </Link>
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <Link href="/auth/login" className="text-[#e2b714] hover:text-[#d4c013] transition-colors font-medium">
                  Entrar
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;