'use client';

import React from 'react';
import Image from 'next/image';
import { type UserProfile } from '@/services/UserService';
import { getInitials } from '@/utils/avatar';

type AddFriendFormProps = {
  query: string;
  onQueryChange: (query: string) => void;
  results: UserProfile[];
  searching: boolean;
  onSendInvite: (userId: string) => void;
  loading: boolean;
};

export default function AddFriendForm({
  query,
  onQueryChange,
  results,
  searching,
  onSendInvite,
  loading,
}: AddFriendFormProps) {
  return (
    <div>
      <div className="mb-2 text-[#d1d1d1]">Pesquisar por nome</div>
      <input
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder="Digite o nome do seu amigo"
        className="w-full h-10 px-3 rounded-lg bg-[#1f2022] text-white outline-none border border-[#3a3c3f] focus:border-[#e2b714] transition-colors"
        aria-label="Pesquisar amigos"
      />
      <div className="mt-3 space-y-2">
        {searching && query.trim().length > 0 && <div className="text-[#d1d1d1]">Buscando...</div>}
        {!searching && results.length === 0 && query.trim().length > 0 && (
          <div className="text-[#d1d1d1]">Nenhum resultado encontrado.</div>
        )}
        {!searching && query.trim().length === 0 && (
          <div className="text-[#d1d1d1]">Digite um nome para buscar.</div>
        )}
        {results.map(r => (
          <div key={r.id} className="flex items-center justify-between bg-[#1f2022] rounded-lg p-2">
            <div className="flex items-center gap-3">
              {r.avatar_url ? (
                <Image
                  src={r.avatar_url}
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">
                  {getInitials(r.display_name)}
                </div>
              )}
              <div className="font-semibold">{r.display_name ?? 'Usuário'}</div>
            </div>
            <button
              onClick={() => onSendInvite(r.id)}
              className="h-8 px-3 rounded-lg bg-[#e2b714] text-black hover:bg-[#d4c013] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={searching || loading}
            >
              Enviar convite
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
