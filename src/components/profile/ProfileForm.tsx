'use client';

import React from 'react';
import { getInitials } from '@/utils/avatar';

type ProfileFormProps = {
  displayName: string | null;
  defaultName: string;
  email: string;
  avatarUrl: string | null;
  avatarFile: File | null;
  onDisplayNameChange: (name: string) => void;
  onAvatarFileSelect: (file: File) => void;
  onSave: () => void;
  onSignOut: () => void;
  saving: boolean;
  loading: boolean;
  error: string | null;
  info: string | null;
};

export default function ProfileForm({
  displayName,
  defaultName,
  email,
  avatarUrl,
  avatarFile,
  onDisplayNameChange,
  onAvatarFileSelect,
  onSave,
  onSignOut,
  saving,
  loading,
  error,
  info,
}: ProfileFormProps) {
  return (
    <div className="bg-[#2b2d2f] rounded-xl border border-[#3a3c3f] p-6 text-white shadow-xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna esquerda - Avatar */}
        <div className="md:col-span-1 flex flex-col items-center justify-center">
          <div className="relative mb-4">
            {avatarUrl || avatarFile ? (
              <img
                src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl!}
                alt="avatar"
                className="w-28 h-28 rounded-full object-cover border-4 border-[#e2b714] shadow-lg mx-auto"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-3xl font-bold border-4 border-[#e2b714] shadow-lg mx-auto">
                {getInitials(displayName, defaultName || 'US')}
              </div>
            )}
          </div>
          <h2 className="text-lg font-semibold mb-2 text-center w-full">
            {displayName || defaultName || 'Usuário'}
          </h2>
          <p className="text-[#d1d1d1] text-xs text-center break-words w-full px-2">{email}</p>
        </div>

        {/* Coluna direita - Formulário */}
        <div className="md:col-span-2 space-y-4">
          {/* Email (somente leitura) */}
          <div>
            <label className="block text-[#d1d1d1] text-sm font-medium mb-1.5">E-mail</label>
            <div className="w-full p-3.5 rounded-lg bg-[#1f2022] text-white border border-[#3a3c3f] opacity-75 cursor-not-allowed text-sm">
              {email}
            </div>
          </div>

          {/* Nome de exibição */}
          <div>
            <label className="block text-[#d1d1d1] text-sm font-medium mb-1.5">
              Nome de exibição
            </label>
            <input
              type="text"
              value={displayName ?? ''}
              onChange={e => onDisplayNameChange(e.target.value)}
              className="w-full p-3.5 rounded-lg bg-[#1f2022] text-white outline-none border border-[#3a3c3f] focus:border-[#e2b714] focus:ring-2 focus:ring-[#e2b714]/20 transition-all text-sm"
              maxLength={24}
              placeholder={defaultName}
            />
            <p className="text-[#6b6e70] text-xs mt-1">{displayName?.length || 0}/24</p>
          </div>

          {/* Foto de perfil */}
          <div>
            <label className="block text-[#d1d1d1] text-sm font-medium mb-1.5">
              Foto de perfil
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  if (f) {
                    onAvatarFileSelect(f);
                  }
                }}
                className="w-full p-3.5 rounded-lg bg-[#1f2022] text-white outline-none border border-[#3a3c3f] focus:border-[#e2b714] focus:ring-2 focus:ring-[#e2b714]/20 transition-all file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#e2b714] file:text-black file:cursor-pointer hover:file:bg-[#d4c013] file:transition-colors text-sm"
              />
            </div>
            {avatarFile && (
              <div className="mt-2.5 p-2.5 bg-[#1f2022] rounded-lg border border-[#3a3c3f] flex items-center gap-2.5">
                <img
                  src={URL.createObjectURL(avatarFile)}
                  alt="preview"
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#e2b714]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">Nova foto selecionada</p>
                  <p className="text-xs text-[#d1d1d1] truncate">Clique em Salvar para aplicar</p>
                </div>
              </div>
            )}
          </div>

          {/* Mensagens de erro/sucesso */}
          {(error || info) && (
            <div>
              {error && (
                <div className="p-3.5 bg-[#ca4754]/10 border border-[#ca4754]/30 rounded-lg text-[#ca4754] text-sm flex items-center gap-2.5">
                  <svg
                    className="w-4.5 h-4.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="break-words">{error}</span>
                </div>
              )}
              {!error && info && (
                <div className="p-3.5 bg-[#e2b714]/10 border border-[#e2b714]/30 rounded-lg text-[#e2b714] text-sm flex items-center gap-2.5">
                  <svg
                    className="w-4.5 h-4.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="break-words">{info}</span>
                </div>
              )}
            </div>
          )}

          {/* Botão de salvar */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3a3c3f] mt-2">
            <button
              onClick={onSignOut}
              className="px-5 py-2 text-sm text-[#d1d1d1] hover:text-white transition-colors"
            >
              Sair
            </button>
            <button
              onClick={onSave}
              disabled={saving || loading}
              className="px-6 py-2.5 bg-[#e2b714] text-black rounded-lg hover:bg-[#d4c013] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl disabled:shadow-none text-sm"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
