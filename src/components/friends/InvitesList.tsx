'use client';

import React from 'react';
import Image from 'next/image';
import { type FriendRequest } from '@/services/FriendService';
import { getInitials } from '@/utils/avatar';
import { useSound } from '@/hooks/useSound';

type InvitesListProps = {
  invites: FriendRequest[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
};

export default function InvitesList({ invites, onAccept, onReject }: InvitesListProps) {
  const { playClick } = useSound();
  if (invites.length === 0) {
    return (
      <div>
        <div className="text-[#d1d1d1] mb-2">Convites recebidos</div>
        <div className="text-[#d1d1d1]">Nenhum convite pendente.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[#d1d1d1] mb-2">Convites recebidos</div>
      <div className="space-y-2">
        {invites.map(i => (
          <div key={i.id} className="flex items-center justify-between bg-[#1f2022] rounded-lg p-2">
            <div className="flex items-center gap-3">
              {i.sender?.avatar_url ? (
                <Image
                  src={i.sender.avatar_url}
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">
                  {getInitials(i.sender?.display_name)}
                </div>
              )}
              <div>
                <div className="font-semibold">{i.sender?.display_name ?? 'Usuário'}</div>
                <div className="text-xs text-[#d1d1d1]">
                  convite enviado {new Date(i.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  playClick();
                  onReject(i.id);
                }}
                className="h-8 px-3 rounded-lg bg-[#ca4754] text-white hover:bg-[#b83d49] transition-colors"
              >
                Recusar
              </button>
              <button
                onClick={() => {
                  playClick();
                  onAccept(i.id);
                }}
                className="h-8 px-3 rounded-lg bg-[#e2b714] text-black hover:bg-[#d4c013] transition-colors"
              >
                Aceitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
