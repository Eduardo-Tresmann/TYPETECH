'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { translateError } from '@/lib/errorMessages';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleChangePassword = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (!user) throw new Error('Usuário não autenticado.');
      if (!hasSupabaseConfig()) throw new Error('Supabase não configurado.');
      if (!currentPassword || !newPassword || !confirmPassword) throw new Error('Preencha todos os campos.');
      if (newPassword.length < 6) throw new Error('A nova senha deve ter ao menos 6 caracteres.');
      if (newPassword !== confirmPassword) throw new Error('A confirmação da senha não coincide.');

      const supabase = getSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email as string, password: currentPassword });
      if (signInError) throw new Error('Senha atual incorreta.');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setInfo('Senha alterada com sucesso. Faça login novamente com a nova senha.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(translateError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#323437] flex items-center justify-center px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40">
      <div className="w-full max-w-[70ch]">
        <h1 className="text-white text-3xl font-bold mb-6">Configuração</h1>
        <div className="bg-[#2c2e31] rounded p-6 text-white space-y-4">
          <div>
            <label className="block text-[#d1d1d1] mb-1">Senha atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 rounded bg-[#1f2022] text-white outline-none"
              placeholder="Digite sua senha atual"
            />
          </div>
          <div>
            <label className="block text-[#d1d1d1] mb-1">Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 rounded bg-[#1f2022] text-white outline-none"
              placeholder="Digite a nova senha"
            />
          </div>
          <div>
            <label className="block text-[#d1d1d1] mb-1">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 rounded bg-[#1f2022] text-white outline-none"
              placeholder="Repita a nova senha"
            />
          </div>

          <div className="min-h-[1.5rem]">
            {error && <div className="text-[#ca4754]">{error}</div>}
            {!error && info && <div className="text-[#e2b714]">{info}</div>}
          </div>

          <div className="flex items-center justify-center w-full">
            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="py-2 px-6 text-lg bg-[#e2b714] text-black rounded hover:bg-[#d4c013] transition-colors"
            >
              {loading ? 'Processando...' : 'Trocar senha'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
