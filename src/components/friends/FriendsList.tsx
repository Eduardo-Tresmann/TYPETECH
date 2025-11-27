'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type Friend } from '@/services/FriendService';
import { getInitials } from '@/utils/avatar';
import { setCachedProfileForUser } from '@/utils/storage';
import { useSound } from '@/hooks/useSound';

type FriendsListProps = {
  friends: Friend[];
  loading: boolean;
  loadingWpm: boolean;
  onChatClick: (friend: Friend) => void;
  onRemoveFriend?: (friendId: string) => void;
};

type ConfirmRemoveModalProps = {
  friendName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmRemoveModal({ friendName, onConfirm, onCancel }: ConfirmRemoveModalProps) {
  const { playClick } = useSound();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#2b2d2f] border border-[#3a3c3f] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-white text-lg font-semibold mb-2">Remover amigo</h3>
        <p className="text-[#d1d1d1] mb-6">
          Tem certeza que deseja remover <span className="font-semibold text-white">{friendName}</span> da sua lista de amigos?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              playClick();
              onCancel();
            }}
            className="px-4 py-2 rounded-lg bg-[#3a3c3f] text-white hover:bg-[#4a4c4f] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              playClick();
              onConfirm();
            }}
            className="px-4 py-2 rounded-lg bg-[#ca4754] text-white hover:bg-[#d95562] transition-colors font-medium"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FriendsList({
  friends,
  loading,
  loadingWpm,
  onChatClick,
  onRemoveFriend,
}: FriendsListProps) {
  const { playClick } = useSound();
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  if (loading) {
    return (
      <div>
        <div className="text-[#d1d1d1] mb-4 flex items-center gap-2">
          <span>Seus amigos</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#e2b714] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-[#6b6e70]">carregando...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="bg-[#1f2022] rounded-lg p-4 border border-[#3a3c3f] animate-pulse"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-[#2c2e31] flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-[#2c2e31] rounded w-24 mb-2"></div>
                  <div className="h-3 bg-[#2c2e31] rounded w-16"></div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <div className="flex-1 h-9 bg-[#2c2e31] rounded-lg"></div>
                <div className="flex-1 h-9 bg-[#2c2e31] rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div>
        <div className="text-[#d1d1d1] mb-4">Seus amigos</div>
        <div className="text-[#d1d1d1] text-center py-12">
          <div className="text-4xl mb-3">👥</div>
          <div className="text-lg font-medium mb-1">Nenhum amigo ainda</div>
          <div className="text-sm text-[#6b6e70]">Adicione amigos para começar a competir!</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[#d1d1d1] mb-4 flex items-center gap-2">
        <span>Seus amigos</span>
        {loadingWpm && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-[#6b6e70] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-[#6b6e70]">carregando estatísticas...</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {friends.map(f => (
          <div
            key={f.id}
            className="bg-[#1f2022] rounded-lg p-4 hover:bg-[#252729] transition-colors border border-[#3a3c3f] relative"
          >
            {onRemoveFriend && (
              <button
                onClick={() => {
                  playClick();
                  setFriendToRemove(f);
                }}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-[#2b2d2f] hover:bg-[#ca4754] text-[#d1d1d1] hover:text-white transition-all duration-200 border border-[#3a3c3f] hover:border-[#ca4754] group"
                aria-label={`Remover ${f.display_name ?? 'amigo'}`}
                title="Remover amigo"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-colors duration-200 group-hover:stroke-white"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
            <div className="flex items-start gap-3 mb-3">
              {f.avatar_url ? (
                <Image
                  src={f.avatar_url}
                  alt="Avatar"
                  width={48}
                  height={48}
                  className="rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {getInitials(f.display_name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">
                  {f.display_name ?? 'Usuário'}
                </div>
                <div className="text-sm text-[#d1d1d1] mt-1">
                  {loadingWpm ? (
                    <span className="text-[#6b6e70] flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-[#6b6e70] border-t-transparent rounded-full animate-spin"></div>
                      Carregando...
                    </span>
                  ) : f.bestWpm !== null ? (
                    <span className="text-yellow-400 font-semibold">{f.bestWpm} WPM</span>
                  ) : (
                    <span className="text-[#6b6e70]">Sem recorde</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Link
                href={`/stats/${encodeURIComponent(f.id)}`}
                onClick={() => {
                  playClick();
                  setCachedProfileForUser(f.id, f.display_name, f.avatar_url);
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-[#2b2d2f] text-white hover:bg-[#3a3c3f] transition-colors text-sm text-center border border-[#3a3c3f]"
              >
                Ver Stats
              </Link>
              <button
                onClick={() => {
                  playClick();
                  onChatClick(f);
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-[#e2b714] text-black hover:bg-[#d4c013] transition-colors text-sm font-medium"
                aria-label={`Abrir chat com ${f.display_name ?? 'Usuário'}`}
              >
                Chat
              </button>
            </div>
          </div>
        ))}
      </div>
      {friendToRemove && onRemoveFriend && (
        <ConfirmRemoveModal
          friendName={friendToRemove.display_name ?? 'Usuário'}
          onConfirm={() => {
            onRemoveFriend(friendToRemove.id);
            setFriendToRemove(null);
          }}
          onCancel={() => setFriendToRemove(null)}
        />
      )}
    </div>
  );
}
